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

import { BasePlayerObjHzComponent } from 'BaseHzComponent';
import { IWeaponComp } from 'BaseWeaponComp';
import { ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import * as ConstsHolster from 'ConstsHolster';
import { holsterDataForLoadoutSlot } from 'ConstsHolster';
import { AbilityId } from 'ConstsIdsAbility';
import { validWeaponId, WeaponId } from 'ConstsIdsWeapon';
import { LoadoutSlot } from 'ConstsLoadout';
import { EntityOrPlayer } from 'ConstsObj';
import * as ConstsWeapon from 'ConstsWeapon';
import { WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import * as EventData from 'EventData';
import * as Events from 'Events';
import { onWeaponAmmoChanged } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { setCanUseLoadout, setWeaponLoadoutInfo } from 'EventsNetworked';
import * as EventsPlayerControl from 'EventsPlayerControls';
import { onFirePressed, onFireReleased, reload } from 'EventsPlayerControls';
import { Entity, Handedness, NetworkEvent, Player, PlayerDeviceType, PropTypes, Vec3, World } from 'horizon/core';
import { LocalControlHandler } from 'LocalPlayer';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import { GameFX, playGameFX, setOwnerGameFX, stopGameFX } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { forceGrab, forceRelease, isServer, isServerPlayer, setCollidable, setPos, setWhoCanGrab } from 'UtilsGameplay';
import { getAllChildrenRecursively } from 'UtilsObj';
import { addIfExists } from 'UtilsTypescript';

const GRAB_WEAPON_REVEAL_DELAY_MILLISECONDS = 500;
const HOLSTER_WEAPON_DELAY_MILLISECONDS = 1000;

const WEAPON_SERVER_LOCATION = new Vec3(0, -5000, 0);

export class ProjectileFiringPayload {
    constructor(
        public projectileId: number,
        public spreadCount?: number,
        public autoAimTarget?: EntityOrPlayer,
    ) {
    }
}

export abstract class BaseWeapon extends LocalClientPlayerAsset<typeof BaseWeapon> {
    static propsDefinition = {
        ...BasePlayerObjHzComponent.propsDefinition,

        weaponId: {type: PropTypes.String, default: ''},

        ownerObj: {type: PropTypes.Entity},

        weaponBundle: {type: PropTypes.Entity},
        colliderGroup: {type: PropTypes.Entity},
        meleeComponent: {type: PropTypes.Entity},
        firingComponent: {type: PropTypes.Entity},
        projectileLauncherComponent: {type: PropTypes.Entity},
        ricochetProjectileLauncherComponent: {type: PropTypes.Entity},
        targetingComponent: {type: PropTypes.Entity},

        comp1: {type: PropTypes.Entity},
        comp2: {type: PropTypes.Entity},
        comp3: {type: PropTypes.Entity},
        comp4: {type: PropTypes.Entity},
        comp5: {type: PropTypes.Entity},
        comp6: {type: PropTypes.Entity},
        comp7: {type: PropTypes.Entity},

        holsterSFX_player: {type: PropTypes.Entity},
        holsterSFX_other: {type: PropTypes.Entity},

        grabSFX_player: {type: PropTypes.Entity},
        grabSFX_other: {type: PropTypes.Entity},

        releaseSFX_player: {type: PropTypes.Entity},
        releaseSFX_other: {type: PropTypes.Entity},

        heldIdleLoopSFX: {type: PropTypes.Entity},
    };

    private componentEntities = new Set<Entity>();
    components: IWeaponComp[] = [];
    isEnabled = true;
    isHeld = false;
    isRightHand = true;
    isHolstered = false;
    isTriggerHeld = false;
    canBeHeld = true;
    loadoutSlot: LoadoutSlot = LoadoutSlot.UNDEFINED;
    holster: ConstsHolster.HolsterAnchorData = ConstsHolster.HOLSTER_SLOT_DATA_DEFAULT.primaryHolster;

    weaponData: ConstsWeapon.WeaponData = ConstsWeapon.WEAPON_DATA_DEFAULT;
    lastWeaponData: ConstsWeapon.WeaponData = ConstsWeapon.WEAPON_DATA_DEFAULT;

    hitActive = false;
    weaponModifiers = ConstsWeapon.WEAPON_MODIFIERS_DEFAULT;
    holsterFX!: GameFX;
    grabFX!: GameFX;
    releaseFX!: GameFX;
    heldIdleLoopFX!: GameFX;
    gameFXs: GameFX[] = [];

    inProgressGrabPrimarySecondaryMutex = false;

    private hideAndShowWithDelayAsyncId?: number;

    addComponent(comp: IWeaponComp) {
        this.components.push(comp);
    }

    setOwner(player: Player) {
        setWhoCanGrab(this.entity, []);

        const weaponColliders = getAllChildrenRecursively(this.props.colliderGroup);
        UtilsGameplay.setOwner(player, this.props.weaponBundle, ...weaponColliders);

        this.gameFXs.forEach((value) => setOwnerGameFX(value, player));

        this.componentEntities.forEach((value) => {
            if (!value) return;
            UtilsGameplay.setOwner(player, value);
        });

        if (!isServerPlayer(player, this.world)) {
            this.connectNetworkEvent(this.entity, setWeaponLoadoutInfo, (data) => {
                this.canBeHeld = data.canHoldWeapons;
                this.changeLoadoutSlot(data.loadoutSlot);
            });

            this.connectNetworkEvent(player, setCanUseLoadout, (data) => {
                this.setCanHoldWeapons(data.canUseLoadout, data.targetLoadoutSlot);
            });

            UtilsGameplay.sendNetworkEvent(this, player, EventsNetworked.onWeaponOwnershipReceived, {weapon: this.entity, weaponId: this.getWeaponId()});
        }
    }

    getOwnerData(): EntityOrPlayer {
        if (this.ownerIsPlayer) {
            return this.owner;
        } else if (UtilsGameplay.exists(this.props.ownerObj)) {
            return this.props.ownerObj!;
        }
        throw Error(`weapon ${this.getName()} has no owner`);
    }

    getWeaponSourceData(): EventData.SourceData {
        return {
            ...EventData.SOURCE_DATA_DEFAULT,
            weaponId: this.getWeaponId(),
            obj: this.getOwnerData(),
            pos: this.entity.position.get(),
        };
    }

    getName() {
        return this.weaponData.displayName;
    }

    override onPreStart() {
        const weaponData = ConstsWeapon.WEAPON_DATA_REGISTRY.get(this.getWeaponId());
        if (weaponData) {
            this.weaponData = weaponData;
        }

        this.holsterFX = {
            playerSFX: this.props.holsterSFX_player,
            otherSFX: this.props.holsterSFX_other,
        };
        this.gameFXs.push(this.holsterFX);

        this.grabFX = {
            playerSFX: this.props.grabSFX_player,
            otherSFX: this.props.grabSFX_other,
        };
        this.gameFXs.push(this.grabFX);

        this.releaseFX = {
            playerSFX: this.props.releaseSFX_player,
            otherSFX: this.props.releaseSFX_other,
        };
        this.gameFXs.push(this.releaseFX);

        this.heldIdleLoopFX = {
            playerSFX: this.props.heldIdleLoopSFX,
        };
        this.gameFXs.push(this.heldIdleLoopFX);

        addIfExists(this.componentEntities, this.props.meleeComponent);
        addIfExists(this.componentEntities, this.props.firingComponent);
        addIfExists(this.componentEntities, this.props.projectileLauncherComponent);
        addIfExists(this.componentEntities, this.props.ricochetProjectileLauncherComponent);
        addIfExists(this.componentEntities, this.props.targetingComponent);
        addIfExists(this.componentEntities, this.props.comp1);
        addIfExists(this.componentEntities, this.props.comp2);
        addIfExists(this.componentEntities, this.props.comp3);
        addIfExists(this.componentEntities, this.props.comp4);
        addIfExists(this.componentEntities, this.props.comp5);
        addIfExists(this.componentEntities, this.props.comp6);
        addIfExists(this.componentEntities, this.props.comp7);

        // locally owned object setup
        this.setOwner(this.owner);

        //** State */
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.setIsEnabled, (data) => this.setIsEnabled(data.isEnabled));

        //** Data */
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.setWeaponModifiers, (data) => this.setWeaponModifiers(data));
        this.connectLocalBroadcastEvent(EventsPlayerControl.swapToWeapon, (data) => this.handleSwapToWeapon(data.loadoutSlot));

        //** Inputs */
        this.connectLocalBroadcastEvent(onFirePressed, (data) => {
            if (!this.isHeld) return;
            this.onFirePressed(data.autoAimTarget);
        });
        this.connectLocalBroadcastEvent(onFireReleased, _ => {
            if (!this.isHeld) return;
            this.onFireReleased();
        });
        this.connectLocalBroadcastEvent(reload, _ => {
            if (!this.isHeld) return;
            this.onReload();
        });

        UtilsGameplay.connectNetworkEvent(this, this.owner, EventsNetworked.setDominantHand, (data) => this.onDominantHandChanged(data.isRightHand));

        //** Local Attack */
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.startAttack, (data) => this.startAttack());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.stopAttack, (data) => this.stopAttack());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.startHit, (data) => this.startHit());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.stopHit, (data) => this.stopHit());

        //** Networked Attack */
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.startAttack, (data) => this.startAttack());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.stopAttack, (data) => this.stopAttack());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.startHit, (data) => this.startHit());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.stopHit, (data) => this.stopHit());

        //** Morphing */
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.morphWeapon, (data) => this.morphByAbility(data.abilityId));
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.unmorphWeapon, (data) => this.unmorph());

        //** Update */
        this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));

        this.setVisibility(true);
    }

    override onStart() {
    }

    override onReturnFromClient() {
        this.onDispose();
        this.setOwner(this.world.getServerPlayer());
    }

    override onReturnToServer() {
        this.setVisibility(false);

        UtilsGameplay.setCollidable(this.entity, false);
        UtilsGameplay.detach(this.entity);
        this.entity.position.set(WEAPON_SERVER_LOCATION);
    }

    /**
     * This function is invoked at the entity's spawn controller and all child entities will be destroyed at the end of this frame.
     * So, don't reference anything that will run in the next frame in this call chain. This includes:
     * - Any Horizon API setters (batched, invoked next frame) referencing anything spawned by this parent spawn controller
     * - Any network calls targeting anything spawned by this parent spawn controller.
     */
    // override dispose() {
    //     console.log(`BaseWeapon dispose for ${this.entity.name.get()} [${this.entity.id}] to ${this.owner.name.get()} [${this.owner.id}], isServerPlayer: ${isServerPlayer(this.owner, this.world)}`);
    //     /** Important: No-op if we are owned by the server. If we don't do this, this causes an Exception in the Horizon Logs. */
    //     if (isServerPlayer(this.owner, this.world)) return;

    //     this.onDispose();
    // }

    private setCanHoldWeapons(canBeHeld: boolean, targetLoadoutSlot?: LoadoutSlot) {
        this.canBeHeld = canBeHeld;
        if (!this.canBeHeld && this.isHeld) {
            this.release();
        } else {
            this.handleSwapToWeapon(targetLoadoutSlot ?? LoadoutSlot.WEAPON_PRIMARY);
        }
    }

    private handleSwapToWeapon(loadoutSlot: LoadoutSlot) {
        if (this.inProgressGrabPrimarySecondaryMutex || !this.canBeHeld) return;

        this.inProgressGrabPrimarySecondaryMutex = true;
        const isNextEquippedWeapon = this.loadoutSlot == loadoutSlot;

        if (this.isHeld && !isNextEquippedWeapon) {
            this.release();
        } else if (!this.isHeld && isNextEquippedWeapon) {
            this.grab();
        }
        this.inProgressGrabPrimarySecondaryMutex = false;
    }

    setIsEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;

        this.components.forEach((value) => value.setIsEnabled?.(this.isEnabled));
    }

    private grab() {
        setWhoCanGrab(this.entity, [this.owner])
        const gunHand = LocalControlHandler().getPlayersPreferredHand(Handedness.Right);
        setCollidable(this.entity, true);

        this.hideAndShowWithDelay(GRAB_WEAPON_REVEAL_DELAY_MILLISECONDS);

        forceGrab(this.entity, this.owner, gunHand, false);
        this.onGrab(gunHand == Handedness.Right);
    }


    private clearHideAndShowWithDelayAsync() {
        if (this.hideAndShowWithDelayAsyncId != undefined) {
            this.async.clearTimeout(this.hideAndShowWithDelayAsyncId);
            this.hideAndShowWithDelayAsyncId = undefined;
        }
    }

    private hideAndShowWithDelay(delayMillseconds: number, onComplete?: () => void) {
        // NOTE: hide the weapon while it transitions to work around Horizon's grab lerp and attached object interaction weirdness
        this.setVisibility(false);
        this.clearHideAndShowWithDelayAsync();
        this.hideAndShowWithDelayAsyncId = this.async.setTimeout(() => {
            onComplete?.();
            this.hideAndShowWithDelayAsyncId = undefined;
            this.setVisibility(true);
        }, delayMillseconds);
    }

    private release() {
        this.isHeld = false;

        if (this.isTriggerHeld) {
            this.onFireReleased();
        }

        forceRelease(this.entity);
        setCollidable(this.entity, false);
        setWhoCanGrab(this.entity, []);
        setPos(this.entity, WEAPON_SERVER_LOCATION);

        this.hideAndShowWithDelay(HOLSTER_WEAPON_DELAY_MILLISECONDS, () => {
            this.handleHolstering();
        });

        stopGameFX(this.heldIdleLoopFX, this.owner);
        playGameFX(this.releaseFX, {player: this.owner});
        this.onRelease();
    }

    private onGrab(isRightHand: boolean) {
        if (this.isHeld) return;

        this.isHeld = true;
        this.isHolstered = false;
        this.isRightHand = isRightHand;

        setCollidable(this.entity, true);
        this.components.forEach((value) => value.onGrab?.(this.isRightHand));
        this.sendLocalBroadcastEvent(Events.onWeaponGrab, {baseWeapon: this, isRightHand: this.isRightHand, player: this.owner});
        this.sendNetworkBroadcastEvent(EventsNetworked.onWeaponGrab, {player: this.owner, weapon: this.entity, weaponId: this.getWeaponId(), loadoutSlot: this.loadoutSlot});

        playGameFX(this.heldIdleLoopFX, {player: this.owner});
        playGameFX(this.grabFX, {player: this.owner});
        this.applyHoldingStatusEffects();
    }

    private applyHoldingStatusEffects() {
        this.weaponData.holdingStatusEffectIds.forEach((value) => {
            UtilsGameplay.sendNetworkEvent(this, this.owner, EventsNetworked.applyStatusEffect, {
                    targetData: this.getOwnerData(),
                    statusEffectId: value,
                    duration: -1,
                    sourceData: this.getWeaponSourceData(),
                },
            );
        });

    }

    /**
     * Important: Notably different from on-dispose. WeaponComponents have onRelease logic, which we don't want to do on-dispose due to {@link dispose} details.
     */
    private onRelease() {
        this.components.forEach((value) => value?.onRelease());
        this.sendLocalBroadcastEvent(Events.onWeaponRelease, {weaponId: this.weaponData.id, player: this.owner});

        const payload = {weapon: this.entity, weaponId: this.getWeaponId(), loadoutSlot: this.loadoutSlot};
        UtilsGameplay.sendNetworkEvent(this, this.owner, EventsNetworked.onWeaponRelease, payload);

        this.removeHoldingStatusEffects();
    }

    /**
     * Important: See {@link dispose}
     */
    private onDispose() {
        this.sendLocalBroadcastEvent(Events.onWeaponDisposed, {weaponId: this.weaponData.id, player: this.owner});
        const payload = {weapon: this.entity, weaponId: this.getWeaponId(), loadoutSlot: this.loadoutSlot};
        UtilsGameplay.sendNetworkEvent(this, this.owner, EventsNetworked.onWeaponDisposed, payload);
        this.removeHoldingStatusEffects();
    }

    private removeHoldingStatusEffects() {
        this.weaponData.holdingStatusEffectIds.forEach((value) => {
            UtilsGameplay.sendNetworkEvent(this, this.owner, EventsNetworked.removeStatusEffect, {
                targetData: this.owner,
                statusEffectId: value,
            });
        });
    }

    private changeLoadoutSlot(loadoutSlot: LoadoutSlot) {
        this.loadoutSlot = loadoutSlot;
        this.holster = holsterDataForLoadoutSlot(this.loadoutSlot, this.weaponData.holsterData);

        if (!isServer(this.world) && this.loadoutSlot == LoadoutSlot.WEAPON_PRIMARY && this.canBeHeld) {
            this.handleSwapToWeapon(this.loadoutSlot);
        } else {
            this.handleHolstering();
        }
    }

    private handleHolstering() {
        this.isHolstered = true;
        const pos = this.deviceType == PlayerDeviceType.VR ? this.holster.pos : this.holster.posXS;
        const rot = this.holster.rot;
        UtilsGameplay.attachToPlayer(this.entity, this.owner, this.holster.anchor, pos, rot);
        playGameFX(this.holsterFX, {player: this.owner});
        UtilsGameplay.setCollidable(this.entity, false);
    }

    onFirePressed(autoAimTarget?: EntityOrPlayer) {
        this.isTriggerHeld = true;
        this.components.forEach((value) => value.onFirePressed?.(autoAimTarget));
    }

    onFireReleased() {
        this.isTriggerHeld = false;

        this.components.forEach((value) => value.onFireReleased?.());
    }

    onReload() {
        this.components.forEach(value => value.onReload?.());
    }

    onTargetAcquired(target: EntityOrPlayer) {
        this.components.forEach((value) => value.onTargetAcquired?.(target));
        this.sendNetworkedEventToOwner(EventsNetworked.onWeaponTargetAcquired, {weapon: this.entity, weaponId: this.weaponData.id, target: target});
    }

    onAmmoChanged(currentAmmo: number) {
        this.components.forEach((value) => value.onAmmoChanged?.(currentAmmo));

        if (!this.isHeld) return;
        this.sendNetworkedEventToOwner(EventsNetworked.onWeaponAmmoChanged, {weapon: this.entity, weaponId: this.weaponData.id, currentAmmo: currentAmmo});
        this.sendLocalEvent(this.owner, onWeaponAmmoChanged, {currentAmmo: currentAmmo, weaponData: this.weaponData});
    }

    onFiredSuccess(projectileId: number, spreadCount?: number, autoAimTarget?: EntityOrPlayer) {
        const projectileSettings = new ProjectileFiringPayload(projectileId, spreadCount, autoAimTarget);
        this.components.forEach((value) => value.onFiredSuccess?.(projectileSettings));

        this.sendNetworkedEventToOwner(EventsNetworked.onWeaponFired, {weapon: this.entity, weaponId: this.weaponData.id});
    }

    update(deltaTime: number) {
        this.components.forEach((value) => value.update?.(deltaTime));
    }

    unmorph() {
        const targetId = this.lastWeaponData.firingData.defaultWeaponOverride ? this.lastWeaponData.id : this.getWeaponId();
        const targetName = WEAPON_DATA_REGISTRY.get(targetId)?.displayName;

        this.morphWeapon(targetId, false);
    }

    getIsMorphed() {
        if (this.weaponData.firingData.defaultWeaponOverride) {
            return !this.weaponData.firingData.defaultWeaponOverride;
        }

        return this.getWeaponId() != this.weaponData.id;
    }

    morphByAbility(abilityId: AbilityId) {
        const morphData = ABILITY_DATA_REGISTRY.get(abilityId)!.morphWeaponData;
        if (!morphData) {
            throw Error(`Morph data missing for abilityId: ${abilityId}`);
        }
        const morphedWeaponId = morphData.weaponIdsMap.get(this.weaponData.id);
        if (!morphedWeaponId) {
            console.error(`WeaponId ${this.weaponData.id} needs to be added to the morph data of ${abilityId}`);
            return;
        }
        this.morphWeapon(morphedWeaponId, true);
    }

    onWeaponDataChanged() {
        this.components.forEach((value) => value.onWeaponDataChanged?.());
    }

    startAttack() {
        this.components.forEach((value) => value.onStartAttack?.());
    }

    stopAttack() {
        this.components.forEach((value) => value.onStopAttack?.());
    }

    startHit() {
        this.hitActive = true;

        this.components.forEach((value) => value.onStartHit?.());
    }

    stopHit() {
        this.hitActive = false;

        this.components.forEach((value) => value.onStopHit?.());
    }

    setVisibility(isVisible: boolean) {
        UtilsGameplay.setVisible(this.entity, isVisible);
        this.components.forEach((value) => value.onVisibilityChanged?.(isVisible));
    }

    setWeaponModifiers(modifiers: ConstsWeapon.WeaponModifiers) {
        this.weaponModifiers = modifiers;

        this.components.forEach((value) => value.onWeaponModifiersChanged?.());
    }

    private sendNetworkedEventToOwner<TPayload extends Record<string, any>>(
        event: NetworkEvent<TPayload>,
        data: TPayload,
    ) {
        let eventTarget: Entity | Player | undefined = this.props.ownerObj;
        if (this.ownerIsPlayer) {
            eventTarget = this.owner;
        }

        if (eventTarget) {
            UtilsGameplay.sendNetworkEvent(this, eventTarget, event, data);
        }
    }

    private morphWeapon(weaponId: WeaponId, morph: boolean) {
        const weaponData = ConstsWeapon.WEAPON_DATA_REGISTRY.get(weaponId);
        if (!weaponData || weaponData.category != this.weaponData.category) {
            return;
        }

        this.removeHoldingStatusEffects();
        this.lastWeaponData = this.weaponData;
        this.weaponData = weaponData;
        if (this.isHeld) {
            this.applyHoldingStatusEffects();
        }
        this.onWeaponDataChanged();
    }

    private getWeaponId() {
        return validWeaponId(this.props.weaponId);
    }

    private onDominantHandChanged(isRightHand: boolean) {
        const gunHand = isRightHand ? Handedness.Right : Handedness.Left;
        if (this.isHeld) {
            UtilsGameplay.forceGrab(this.entity, this.owner, gunHand, false);
        }
    }
}
