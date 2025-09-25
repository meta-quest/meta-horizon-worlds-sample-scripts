// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by OURO Interactive
//------------------------------------
//
//                   @
//                   @@@@
//                    @@@@@
//             @@@      @@@@@
//           @@@@@@      @@@@@
//          @@@@@         @@@@@@
//        @@@@@              @@@@@
//         @@@@@@           @@@@@
//           @@@@@         @@@@@
//             @@@@@@   @@@@@
//               @@@@@ @@@@@
//                 @@OURO@@
//                   @@@
//
//------------------------------------

import { AssetData } from 'AssetEx';
import { AssetPools } from 'AssetPools';
import { BaseObj } from 'BaseObj';
import * as CompHealth from 'CompHealth';
import * as CompMovement from 'CompMovement';
import * as CompStatusEffects from 'CompStatusEffects';
import * as ConstsAttributes from 'ConstsAttributes';
import * as ConstsGame from 'ConstsGame';
import { AbilityId } from 'ConstsIdsAbility';
import { GameModeId } from 'ConstsIdsGameMode';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { LoadoutSlot } from 'ConstsLoadout';
import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import { PersistentStorage } from 'ConstsPVar';
import { StatSourceData } from 'ConstsStats';
import { drawDebugVec, updateDebugVec } from 'DebugDraw';
import * as EventData from 'EventData';
import { ChangeDataHitInfo, getEntityOrPlayerOrThrow } from 'EventData';
import * as Events from 'Events';
import * as EventsCore from 'EventsCore';
import { onPlayerDeath, onPlayerRevive } from 'EventsCrossWorld';
import * as EventsNetworked from 'EventsNetworked';
import { onReplicatedObjSyncerInitialized, ReplicatedObjData, requestDominantHand, setCanUseLoadout, setDominantHand, setSocialMode, updateReplicatedObjs } from 'EventsNetworked';
import { GamePlayerAbilities } from 'GamePlayerAbilities';
import { GamePlayerClass } from 'GamePlayerClass';
import { Team } from 'GameTeam';
import { Color, Component, Entity, EventSubscription, Handedness, PhysicsForceMode, Player, PlayerDeviceType, Quaternion, SpawnController, SpawnError, SpawnState, Vec3, World } from 'horizon/core';
import { PersistentStorageService } from 'PersistentStorageService';
import { clearPlayerStats, mutateRoundIntoMatchStats } from 'PlayerStats';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { logEx } from 'UtilsConsoleEx';
import * as UtilsGameplay from 'UtilsGameplay';
import { asyncTimeout, AsyncTimeout, clearAsyncTimeOut, debounceAsync, EntityOrUndefined } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { adjustPlayerTargetPartPosition, IPlayerOwnedObj } from 'UtilsPlayer';
import { FixedSizeArray } from 'UtilsTypescript';

// These offsets are hand tuned to what the true position of the head and torso should be. Horizon's defaults are offset along the forward axis...
const SHOW_DEBUG_LINES_BODY_PARTS = false;

const PLAYER_OBJ_SPAWN_POS = new Vec3(0, -1000, 0);
const CLEAR_IS_INTERACTING_WITH_UI_DELAY_TIME_MS = 200;

const PUSH_REPLICATED_BASE_OBJ_SYNC_SERVICE_DEBOUNCE_TIME_MS = 200;

export class GamePlayer extends BaseObj implements IPlayerOwnedObj, CompHealth.IDamageExtraProvider, CompHealth.ICompHealthListener, CompMovement.ICompMovementListener, CompStatusEffects.ICompStatusEffectsListener {
    static gamePlayerLoading = new Set<Player>();
    static gamePlayersById = new Map<Player, GamePlayer>(); // Map for quicker access
    static getGamePlayer(player?: Player) {
        if (!player) {
            logEx(`Attempted to get a Game Player, but Player is null. gamePlayers={ ${this.gamePlayersToString()} }, stack=${new Error().stack}`);
            return;
        }

        return this.gamePlayersById.get(player);
    }

    static getGamePlayerOrThrow(player: Player) {
        const gamePlayer = GamePlayer.getGamePlayer(player);
        if (!gamePlayer) {
            throw Error(`GamePlayer not found but expected: ${player.name.get()}[${player.id}]`);
        }
        return gamePlayer;
    }

    static getLoadedGamePlayers() {
        const result: GamePlayer[] = [];
        GamePlayer.gamePlayersById.forEach(gp => result.push(gp));
        return result;
    }

    owner!: Player;
    ownerIsPlayer: boolean = false;

    world: World;

    playerName: string = '';
    deviceType: PlayerDeviceType = PlayerDeviceType.VR;

    persistentStorageService!: PersistentStorageService;

    class = new GamePlayerClass(this, this.playerAssetPools);
    abilities = new GamePlayerAbilities(this, this.playerAssetPools);

    spawnControllers = new Set<SpawnController>();

    eventSubscriptions: EventSubscription[] = [];

    party: undefined = undefined;
    team: Team | undefined = undefined;

    isReadyToTravel = false;
    shouldTeleportOnRoundStart = true;
    numConsecutiveMatchesPlayedThisSession = 0;
    private internalIsDisposed = false;

    public get isDisposed() {
        return this.internalIsDisposed;
    }

    private activeUIInteractions = 0;
    private clearIsInteractingWithUITimeout?: number;

    private isInSocialMode = false;

    private lastLoadoutSlotBeforeLoadoutWasDisabled?: LoadoutSlot = LoadoutSlot.WEAPON_PRIMARY;

    private readonly updateReplicatedBaseObjMapTimeout: UtilsGameplay.AsyncTimeout;
    private remotePlayer?: Entity;

    //** SETUP */
    constructor(horizonApiProvider: Component, player: Player, private playerAssetPools: AssetPools) {
        super(horizonApiProvider, player);

        this.owner = player;
        this.world = this.horizonApiProvider.world;
        this.updateReplicatedBaseObjMapTimeout = new AsyncTimeout(this.horizonApiProvider);
    }

    toString() {
        return `[GamePlayer] playerName=${this.playerName} owner=${this.owner.toString()} ownerIsPlayer=${this.ownerIsPlayer}`;
    }

    static gamePlayersToString() {
        const result: string[] = [];
        GamePlayer.gamePlayersById.forEach(gp => result.push(gp.toString()));
        return result.join('; ');
    }

    override initializeComponents() {
        this.movement.listeners.push(this);

        this.health.damageExtraProvider = this;
        this.health.listeners.push(this);

        this.statusEffects.listeners.push(this);

        this.attributes.setInitialAttributes(ConstsAttributes.PLAYER_ATTRIBUTES_DEFAULT);

        this.addComponent(this.abilities);

        super.initializeComponents();

        this.horizonApiProvider.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
        this.horizonApiProvider.connectNetworkEvent(this.gameplayObject, onReplicatedObjSyncerInitialized, (data) => {
            this.remotePlayer = data.eventListener;
            debounceAsync(this.updateReplicatedBaseObjMapTimeout, PUSH_REPLICATED_BASE_OBJ_SYNC_SERVICE_DEBOUNCE_TIME_MS, () => {
                const clientEventListener = this.remotePlayer;
                this.horizonApiProvider.sendNetworkEvent(clientEventListener!, updateReplicatedObjs, this.getReplicatedObjDatas());
            });
        });
    }

    override getTargetPartPos(targetPartId: ObjTargetPart, local: boolean = false) {
        switch (targetPartId) {
            case ObjTargetPart.HEAD:
                return local ? this.owner.head.localPosition.get() : adjustPlayerTargetPartPosition(targetPartId, this.owner.head, this.owner);
            case ObjTargetPart.TORSO:
                return local ? this.owner.torso.localPosition.get() : adjustPlayerTargetPartPosition(targetPartId, this.owner.torso, this.owner);
            case ObjTargetPart.FOOT:
                return local ? this.owner.foot.localPosition.get() : adjustPlayerTargetPartPosition(targetPartId, this.owner.foot, this.owner);
            case ObjTargetPart.POS:
                return local ? Vec3.zero : this.owner.position.get();
        }
        return undefined;
    }

    override getTargetPartRadius(targetPart: ObjTargetPart) {
        switch (targetPart) {
            case ObjTargetPart.HEAD:
                return ConstsGame.PLAYER_HEAD_SHOT_RADIUS;
        }
        return ConstsGame.PLAYER_AOE_HIT_RADIUS;
    }

    override isInAOERange(origin: Vec3, radius: number, targetPart: ObjTargetPart) {
        const pos = this.getTargetPartPos(targetPart);
        if (pos && UtilsMath.isSphereInSphere(pos, ConstsGame.PLAYER_AOE_HIT_RADIUS, origin, radius)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointInSphereTo(pos, origin, radius),
                bodyPart: targetPart,
                pos: pos,
                radius: ConstsGame.PLAYER_AOE_HIT_RADIUS,
            };
        }
    }

    override isInConeArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ObjTargetPart) {
        const pos = this.getTargetPartPos(targetPart);
        if (pos && UtilsMath.isSphereInCone(pos, ConstsGame.PLAYER_AOE_HIT_RADIUS, origin, dir, radius, dist)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointOnLine(pos, origin, dir),
                bodyPart: targetPart,
                pos: pos,
                radius: ConstsGame.PLAYER_AOE_HIT_RADIUS,
            };
        }
    }

    override isInBeamArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ObjTargetPart) {
        const pos = this.getTargetPartPos(targetPart);
        if (pos && UtilsMath.isSphereInBeam(pos, ConstsGame.PLAYER_AOE_HIT_RADIUS, origin, dir, radius, dist)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointOnLine(pos, origin, dir),
                bodyPart: targetPart,
                pos: pos,
                radius: ConstsGame.PLAYER_AOE_HIT_RADIUS,
            };
        }
    }

    override getEventTargetData(): EntityOrPlayer {
        return this.ownerIsPlayer ? this.owner : super.getEventTargetData();
    }

    override getDisplayName() {
        return this.playerName;
    }

    override canBeTargeted() {
        return super.canBeTargeted() && this.ownerIsPlayer;
    }

    override getPos() {
        if (!this.ownerIsPlayer) {
            return Vec3.zero;
        }
        return this.owner.position.get();
    }

    override getRotation() {
        if (!this.ownerIsPlayer) {
            return Quaternion.one;
        }
        return this.owner.rotation.get();
    }

    override getForward() {
        if (!this.ownerIsPlayer) {
            return Vec3.forward;
        }
        return this.owner.forward.get();
    }

    override updateCapabilities() {
        super.updateCapabilities();
        this.abilities.updateCapabilities();
    }

    setOwner(thisPlayer: Player) { // FYI: This is called at beginning of life from Game.ts
        this.owner = thisPlayer;
        this.ownerIsPlayer = thisPlayer.id != this.horizonApiProvider.world.getServerPlayer().id;

        if (this.ownerIsPlayer) {
            this.playerName = this.owner.name.get();
            this.deviceType = this.owner.deviceType.get();
            this.owner.jumpSpeed.set(0);

            UtilsGameplay.setPlayerSprintMultiplier(this.owner, 1.0);

            this.abilities.registerEventListeners();

            // weapon
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponOwnershipReceived, data => {
                // broadcast initialization for world to allow entry
                this.attack.addWeapon(data.weapon);
                this.movement.handleSpeedChange();
                this.movement.handleJumpDataChange();
            }));

            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.onWeaponGrab, data => {
                if (this.owner != data.player) return;
                this.lastLoadoutSlotBeforeLoadoutWasDisabled = data.loadoutSlot;
                this.attack.onWeaponGrab(data.weapon, data.weaponId);
            }));

            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponRelease, data => this.abilities.onWeaponRelease(data.weapon, data.weaponId)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponDisposed, data => this.abilities.onWeaponDisposed(data.weapon, data.weaponId)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponFired, data => this.statusEffects.onWeaponFired(data.weapon, data.weaponId)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponAmmoChanged, data => this.statusEffects.onWeaponAmmoChanged(data.weapon, data.weaponId, data.currentAmmo)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, EventsNetworked.onWeaponTargetAcquired, data => this.statusEffects.onWeaponTargetAcquired(data.weapon, data.weaponId, data.target)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, setSocialMode, (data) => this.setSocialMode(data.enabled)));
            this.eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(this.owner, requestDominantHand, (_) => this.horizonApiProvider.sendNetworkEvent(this.owner, setDominantHand, {isRightHand: this.persistentStorageService.playerData.data.handedness == Handedness.Right})));

            this.persistentStorageService = new PersistentStorageService(this.owner, new PersistentStorage(this.world), this.horizonApiProvider, this.statusEffects);
            this.persistentStorageService.initialize();

            this.horizonApiProvider.sendNetworkEvent(this.owner, setDominantHand, {isRightHand: this.persistentStorageService.playerData.data.handedness == Handedness.Right});
        } else {
            this.deviceType = PlayerDeviceType.VR;
            this.playerName = 'Server';
        }
    }

    public toggleIsInteractingWithUI(isInteracting: boolean) {
        clearAsyncTimeOut(this.horizonApiProvider, this.clearIsInteractingWithUITimeout);

        this.activeUIInteractions = isInteracting ? this.activeUIInteractions + 1 : Math.max(0, this.activeUIInteractions - 1);

        if (this.getIsInteractingWithUI()) {
            this.updateCanUseLoadout();
            return;
        }

        this.clearIsInteractingWithUITimeout = this.horizonApiProvider.async.setTimeout(() => this.updateCanUseLoadout(), CLEAR_IS_INTERACTING_WITH_UI_DELAY_TIME_MS);
    }

    private getIsInteractingWithUI() {
        return this.activeUIInteractions > 0;
    }

    public setSocialMode(enabled: boolean) {
        if (enabled) {
            this.enableSocialMode();
        } else {
            this.disableSocialMode();
        }
        this.updateCanUseLoadout();
    }

    private enableSocialMode() {
        this.isInSocialMode = true;
    }

    private disableSocialMode() {
        this.isInSocialMode = false;
    }

    public getCanUseLoadout() {
        return !(this.getIsInteractingWithUI() || this.isInSocialMode);
    }

    public resetCanUseLoadout() {
        this.activeUIInteractions = 0;
        clearAsyncTimeOut(this.horizonApiProvider, this.clearIsInteractingWithUITimeout);
        this.disableSocialMode();
        this.updateCanUseLoadout();
    }

    private updateCanUseLoadout() {
        const canUseLoadout = this.getCanUseLoadout();
        this.horizonApiProvider.sendNetworkEvent(this.owner, setCanUseLoadout, {
            canUseLoadout: canUseLoadout,
            isInteractingWithUI: this.getIsInteractingWithUI(),
            isInSocialMode: this.isInSocialMode,
            targetLoadoutSlot: this.lastLoadoutSlotBeforeLoadoutWasDisabled,
        });

        if (canUseLoadout) {
            // AFTER we restore your previous loadout state, we need to clear this property so we don't set your held weapon to an incorrect property.
            this.lastLoadoutSlotBeforeLoadoutWasDisabled = undefined;
        }
    }

    onPlayerExit() {
        this.eventSubscriptions.forEach(value => value.disconnect());
        this.eventSubscriptions.length = 0;

        this.destroyAllSpawnedObjects();
        this.internalIsDisposed = true;
    }

    //** ICompHealthListener */
    onDamageTaken(damageData: ChangeDataHitInfo) {
    }

    onHpChange(comp: CompHealth.CompHealth, animationTimeSeconds: number): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        const percent = comp.getHpPercent();
        this.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerHpChange, {player: this.owner, percent: percent, animationTimeSeconds: animationTimeSeconds});
    }

    onUnderShieldHpChange(comp: CompHealth.CompHealth): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        // Disabling because there are no listeners
        // const percent = comp.getUnderShieldPercent();
        // this.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerUnderShieldHpChange, {player: this.owner, percent: percent});
    }

    onUnderShieldEvent(comp: CompHealth.CompHealth, eventId: CompHealth.UnderShieldEventId): void {
        if (!this.ownerIsPlayer) {
            return;
        }
        this.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerUnderShieldEvent, {player: this.owner, eventId: eventId});
    }

    onDeath(comp: CompHealth.CompHealth, damageData: ChangeDataHitInfo): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        this.statusEffects.applyEffect('player_state_dead');

        this.pushReplicatedObjDataForAllClients();
        this.horizonApiProvider.sendNetworkBroadcastEvent(onPlayerDeath, {player: this.owner, killer: getEntityOrPlayerOrThrow(damageData.sourceData)});
    }

    onRevive(comp: CompHealth.CompHealth): void {
        if (!this.ownerIsPlayer) {
            return;
        }


        this.statusEffects.removeEffect('player_state_dead');


        this.pushReplicatedObjDataForAllClients();
        this.horizonApiProvider.sendNetworkBroadcastEvent(onPlayerRevive, {player: this.owner});
    }

    //** IDamageExtraProvider */
    calculateDamageExtra(event: EventData.ChangeDataWithSource): CompHealth.DamageExtraResult {
        let didHeadShot = false;
        let dmg = event.changeData.amount;

        if (this.ownerIsPlayer) {
            const hitPos = event.sourceData.targetRelativePos ? event.sourceData.targetRelativePos.add(this.owner.position.get()) : event.sourceData.pos;
            if (UtilsMath.isInRange(this.owner.head.position.get(), hitPos, ConstsGame.PLAYER_HEAD_SHOT_RADIUS)) {
                didHeadShot = true;

                dmg = event.changeData.headshotAmount ? event.changeData.headshotAmount : event.changeData.amount;
            }
        }

        return {
            ...CompHealth.DAMAGE_EXTRA_RESULTS_DEFAULT,
            didHeadShot: didHeadShot,
            finalDmgAmount: dmg,
        };
    }

    calculateHealExtra(event: EventData.ChangeDataWithSource): number {
        return event.changeData.amount;
    }

    //** ICompMovementListener */
    onSpeedChange(comp: CompMovement.CompMovement): void {
        if (this.ownerIsPlayer) {
            this.horizonApiProvider.sendNetworkBroadcastEvent(
                EventsNetworked.setSpeed,
                {
                    player: this.owner,
                    speed: comp.calculateSpeed(),
                },
                [this.owner]);
        }
    }

    onGravityChange(comp: CompMovement.CompMovement): void {
        if (this.ownerIsPlayer) {
            this.horizonApiProvider.sendNetworkBroadcastEvent(
                EventsNetworked.setGravity,
                {
                    player: this.owner,
                    gravity: comp.calculateGravity(),
                },
                [this.owner]);
        }
    }

    onJumpDataChange(comp: CompMovement.CompMovement): void {
        if (this.ownerIsPlayer) {
            this.horizonApiProvider.sendNetworkBroadcastEvent(
                EventsNetworked.setJumpData,
                {
                    player: this.owner,
                    maxJumpCount: comp.maxJumpCount,
                    jumpForces: [new Vec3(0, comp.calculateJumpForce(), 0)],
                },
                [this.owner]);
        }
    }

    onApplyForce(forceType: EventData.ForceType, force: number, forceDir: Vec3, forceMode: PhysicsForceMode, sourceData: EventData.SourceData | undefined): void {
        if (this.ownerIsPlayer) {
            if (forceDir.y <= 0 && this.owner.isGrounded.get()) {
                forceDir.y = 0;
                forceDir.normalizeInPlace();
                this.owner.applyForce(Vec3.mul(Vec3.up, force * 0.25)); // apply additional upward force to overcome gravity/friction
            }
            this.owner.applyForce(Vec3.mul(forceDir, force));
        }
    }

    //** ICompStatusEffectsListener */
    onStatusEffectApplied(statusEffectId: StatusEffectId): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        this.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectApplied, {
            player: this.owner,
            statusEffectId: statusEffectId,
        });
    }

    onStatusEffectRemoved(statusEffectId: StatusEffectId): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        this.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectRemoved, {
            player: this.owner,
            statusEffectId: statusEffectId,
        });
    }

    onStatusEffectCompleted(statusEffectId: StatusEffectId): void {
        if (!this.ownerIsPlayer) {
            return;
        }

        this.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectCompleted, {
            player: this.owner,
            statusEffectId: statusEffectId,
        });
    }

    saveAndClearStats(gameMode: GameModeId) {
        const loadoutStatSourceData = this.getLoadoutStatSourceData();
        const matchStats = mutateRoundIntoMatchStats(this.owner, loadoutStatSourceData);
        this.persistentStorageService.stats.updateStatsForMatch(gameMode, matchStats, loadoutStatSourceData);
        clearPlayerStats(this.owner);
    }

    //** UPDATE */
    override update(deltaTime: number) {
        if (!this.ownerIsPlayer) {
            return;
        }
        super.update(deltaTime);
        if (SHOW_DEBUG_LINES_BODY_PARTS) this.drawLinesAtBodyParts();
    }

    resetSystems() { // FYI add systems that should reset after data is restored here for players piece-meal
        this.health.reset();
    }

    async resetGamePlayerData() {
        this.horizonApiProvider.sendLocalBroadcastEvent(Events.showHUDLog, {
            player: this.owner,
            text: 'Resetting Player Data.. Please wait while assets respawn.',
            color: Color.red,
            priority: 0,
        });

        this.persistentStorageService.reset();
        await asyncTimeout(this.class.restoreFromSaveData(), 'resetGamePlayerData:restoreFromSaveData');
    }

    //** OBJECT SPAWNING */
    async spawnPlayerObj(
        assetData: AssetData,
        onFulfilled?: (spawnController: SpawnController) => void,
        onRejected?: (spawnController: SpawnController) => void,
        onFinally?: () => void,
    ): Promise<SpawnController> {
        const platformSpecificAsset = this.deviceType != PlayerDeviceType.VR && assetData.xsAsset ? assetData.xsAsset : assetData.asset;
        const spawnController = UtilsGameplay.spawnControllerWithDefaults(platformSpecificAsset, PLAYER_OBJ_SPAWN_POS);
        try {
            await spawnController.spawn();

            spawnController.rootEntities
                .get()
                .flatMap(rootEntity => [rootEntity, ...rootEntity.children.get()])
                .forEach(spawnedEntity => this.horizonApiProvider.sendLocalEvent(spawnedEntity, EventsCore.onPlayerObjSpawned, {player: this.owner}));

            onFulfilled?.(spawnController);
        } catch (e) {
            // Use tryCatchFunc() because, without it, if one of these bridge methods throws, it will unwind out of this catch() and swallow failureReason. Example: https://pxl.cl/7dLLG
            const ownerName = UtilsGameplay.tryCatchFunc(() => this.owner.name.get());
            const spawnError = UtilsGameplay.tryCatchFunc(() => SpawnError[spawnController.spawnError.get()]);
            // 2025-05-14: Previously, there was a check here to make sure spawnError was not SpawnError.Cancelled because:
            // "Cancelled is a user cancellation; cause of this is usually going from play -> edit mode, getting rid of these logs"
            // We've removed this check, for now, to tease out other hidden issues (e.g. capacity).
            logEx(`GamePlayer.spawnPlayerObj() tried to spawn ${assetData.displayName} for ${ownerName} and it failed because of ${e} [${spawnError}]}`, 'error');

            onRejected?.(spawnController);
        } finally {
            onFinally?.();
        }

        this.spawnControllers.add(spawnController);
        return spawnController;
    }

    destroyAllSpawnedObjects() {
        this.spawnControllers.forEach(controller => {
            switch (controller.currentState.get()) {
                case SpawnState.Loading:
                    controller.pause();
                    break;
                default:
                    controller.dispose();
                    break;
            }
        });
        this.spawnControllers.clear();
    }

    getLoadoutStatSourceData(): StatSourceData {
        const weaponIds: WeaponId[] = [];
        this.class.weaponSlotHandlers.forEach(value => weaponIds.push(value.weaponData.id));
        const abilityIds: AbilityId[] = this.abilities.getEquippedAbilityIds();
        return {weaponIds, abilityIds};
    }

    //** GAME LIFE CYCLE */
    override getTeamId(): number | undefined {
        return this.team?.id ?? undefined;
    }

    private drawLinesAtBodyParts() {
        this.drawVecAtPos(0, this.getTargetPartPos(ObjTargetPart.HEAD), Color.green);
        this.drawVecAtPos(1, this.owner.head.position.get(), new Color(1, 1, 0));
        this.drawVecAtPos(2, this.getTargetPartPos(ObjTargetPart.TORSO), Color.blue);
        this.drawVecAtPos(3, this.owner.torso.position.get(), new Color(1, 1, 0));
        this.drawVecAtPos(4, this.getTargetPartPos(ObjTargetPart.FOOT), Color.red);
        this.drawVecAtPos(5, this.owner.position.get(), new Color(1, 1, 0));
    }

    lines = new Map<number, EntityOrUndefined>();

    private drawVecAtPos(index: number, pos?: Vec3, color?: Color) {
        if (!pos) return;
        const line = this.lines.get(index);

        if (!line) {
            this.lines.set(index, drawDebugVec(pos, Vec3.right, color));
            return;
        }
        updateDebugVec(line, pos, Vec3.right);
    }

    public setDominantHand(hand: Handedness) {
        this.persistentStorageService.playerData.setHandedness(hand);
        this.horizonApiProvider.sendNetworkEvent(this.owner, setDominantHand, {isRightHand: hand == Handedness.Right});
    }

    override sendUpdateReplicatedObjs() {
        debounceAsync(this.updateReplicatedBaseObjMapTimeout, PUSH_REPLICATED_BASE_OBJ_SYNC_SERVICE_DEBOUNCE_TIME_MS, () => {
            if (!this.remotePlayer) return; // This should only happen as we exit the game

            this.horizonApiProvider.sendNetworkEvent(this.remotePlayer, updateReplicatedObjs, this.getReplicatedObjDatas());
        });
    }

    private getReplicatedObjDatas(): ReplicatedObjData[] {
        const replicatedData: ReplicatedObjData[] = [];
        ServerBaseObjRegistry.forEachObj(obj =>
            replicatedData.push({
                objData: obj.gameplayObject,
                objParts: obj.getReplicatedObjPartsData(),
                teamId: obj.getTeamId(),
                canTakeDamage: obj.health.canTakeDamage(),
                isAlive: obj.health.isAlive,
            }));
        return replicatedData;
    }
}

export class FixedSizeGamePlayerArray extends FixedSizeArray<GamePlayer> {
    constructor(size: number, allowDuplicates: boolean = false) {
        super(size, allowDuplicates);
    }

    containsPlayer(player: Player) {
        const gp = GamePlayer.getGamePlayer(player);
        if (!gp) return false;

        return this.contains(gp);
    }

    getHorizonPlayers() {
        return this.getGamePlayers().map(gp => gp.owner);
    }

    getGamePlayers() {
        return this.getDefined();
    }
}

export function doOnGamePlayer(player: Player, func: (gp: GamePlayer) => void) {
    const gp = GamePlayer.getGamePlayer(player);
    if (!gp) {
        return;
    }
    func(gp);
}
