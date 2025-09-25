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

import { AssetPools } from 'AssetPools';
import { BaseObj, IObjectComponent } from 'BaseObj';
import * as ConstsAbility from 'ConstsAbility';
import { AbilitySlot, AbilityState, ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import * as ConstsAttributes from 'ConstsAttributes';
import { AbilityId } from 'ConstsIdsAbility';
import { WeaponId } from 'ConstsIdsWeapon';
import * as EventData from 'EventData';
import * as Events from 'Events';
import { onDamageDealt, onDamageTaken } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { GamePlayer } from 'GamePlayer';
import { GlobalSFXBank } from 'GlobalSFXBank';
import { mutateRoundPlayerStat } from 'PlayerStats';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { logEx } from 'UtilsConsoleEx';
import { playSFXForPlayer } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { playHapticsFromSettings } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { playerObjShouldAcceptBroadcast } from 'UtilsPlayer';

export class GamePlayerAbilities implements IObjectComponent {
    parent: BaseObj;

    gamePlayer!: GamePlayer;

    trackers = new Map<AbilitySlot, AbilityTracker>([
        [AbilitySlot.PRIMARY, new AbilityTracker(this, AbilitySlot.PRIMARY, ConstsAttributes.AttributeId.ABILITY_PRIMARY_IS_DISABLED)],
        [AbilitySlot.UTILITY, new AbilityTracker(this, AbilitySlot.UTILITY, ConstsAttributes.AttributeId.ABILITY_UTILITY_IS_DISABLED)]
    ]);
    private assignedAbilities = new Set<AbilityId>();

    constructor(gp: GamePlayer, private playerAssetPools: AssetPools) {
        this.parent = gp;
        this.gamePlayer = gp;
    }

    initialize() {
    }

    registerEventListeners() {
        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.primeAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this.gamePlayer, data.player)) {
                this.onAbilityPrimed(data.abilitySlot);
            }
        }));

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.activateAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this.gamePlayer, data.player)) {
                this.onAbilityActivated(data.abilitySlot, data.success, data.errorText);
            }
        }));

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.deactivateAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this.gamePlayer, data.player)) {
                this.onAbilityDeactivated(data.abilitySlot);
            }
        }));

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.onAbilityHandlerInitialized, (data) => {
            if (playerObjShouldAcceptBroadcast(this.gamePlayer, data.player)) {
                this.sendAbilitiesToClient();
                this.resetAbilities();
            }
        }));

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectNetworkEvent(this.gamePlayer.owner, EventsNetworked.onLocalPlayerHUDControlsReady, (data) => {
            this.sendAbilitiesToClient();
            this.resetAbilities();
        }));

        //** Utility ability energy capture */
        this.gamePlayer.eventSubscriptions.push(
            this.gamePlayer.horizonApiProvider.connectLocalEvent(this.gamePlayer.gameplayObject, onDamageTaken, (data) => {
                const energy = data.changeData.amount * this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_TAKEN);
                this.addUtilityAbilityEnergy(energy);
            }),
            this.gamePlayer.horizonApiProvider.connectLocalEvent(this.gamePlayer.gameplayObject, onDamageDealt, (data) => {
                const energy = data.changeData.amount * this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_DEALT);
                this.addUtilityAbilityEnergy(energy);
            }),
        );

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectLocalBroadcastEvent(Events.onHealthHealed, (data) => {
            if (this.parent.isTarget(data.sourceData.obj)) {
                // I did the healing
                const energy = data.changeData.amount * this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_ENERGY_PER_HEALTH_HEALED);
                this.addUtilityAbilityEnergy(energy);
            }
        }));

        this.gamePlayer.eventSubscriptions.push(this.gamePlayer.horizonApiProvider.connectLocalBroadcastEvent(Events.onDeath, (data) => {
            if (!this.parent.isTarget(data.targetData)) {
                // Something else died
                const obj = ServerBaseObjRegistry.getObj(data.targetData);
                if (obj) {
                    const range = this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_RANGE);
                    if (UtilsMath.isInRange(obj.getPos(), this.parent.getPos(), range)) {
                        let energy = obj.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_DEATH_ENERGY_AMOUNT);
                        energy *= this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_MULTIPLIER);
                        this.addUtilityAbilityEnergy(energy);
                    }
                }
            }
        }));
    }

    update(deltaTime: number) {
        this.trackers.forEach((value) => value.update(deltaTime));
    }

    sendAbilitiesToClient() {
        this.trackers.forEach((value) => value.sendEquipEvents(false));
    }

    resetAbilities() {
        this.trackers.forEach((value) => value.resetAbility());
    }

    async equipAbility(slot: AbilitySlot, abilityId: AbilityId) {
        if (abilityId == 'UNDEFINED') return;

        const tracker = this.trackers.get(slot);
        if (!tracker) {
            throw new Error(`AbilityTracker missing for slot ${slot}`);
        }

        if (!this.assignedAbilities.has(abilityId)) {
            if (tracker.equippedAbilityData.id != 'UNDEFINED') {
                // Don't await here - we don't to wait for the old ability asset to be unassigned before assigning a new one
                this.cleanupAbilityAsset(tracker.equippedAbilityData.id);
            }
            await this.assignAbilityAsset(abilityId);
        }

        tracker.equipAndInitializeAbility(abilityId, true);
    }

    private async assignAbilityAsset(abilityId: AbilityId) {
        const prespawnedAssetId = ABILITY_DATA_REGISTRY.get(abilityId)?.prespawnedAssetId;
        if (prespawnedAssetId == undefined) {
            logEx(`Ability ${abilityId} has no prespawned asset ID defined. Cannot assign asset.`, 'error')
            return;
        }

        if (this.assignedAbilities.has(abilityId)) {
            return;
        }

        this.assignedAbilities.add(abilityId);

        return this.playerAssetPools.claimWithRetry(this.gamePlayer.owner, prespawnedAssetId);
    }

    private async cleanupAbilityAsset(abilityId: AbilityId) {
        const prespawnedAssetId = ABILITY_DATA_REGISTRY.get(abilityId)?.prespawnedAssetId;
        if (prespawnedAssetId == undefined) {
            logEx(`Ability ${abilityId} has no prespawned asset ID defined. Cannot cleanup asset.`, 'error')
            return;
        }

        if (!this.assignedAbilities.has(abilityId)) {
            return;
        }

        this.assignedAbilities.delete(abilityId);

        return this.playerAssetPools.cleanupAssetForPlayerOnRemove(this.gamePlayer.owner, prespawnedAssetId);
    }

    canUseAbility(abilityTracker: AbilityTracker) {
        // if you're alive, and ability isDisabledAttributeVal is 0 (1 is enabled)
        return this.parent.health.isAlive
            && this.parent.attributes.calculateAttributeValue(abilityTracker.isDisabledAttributeId) <= 0
            && abilityTracker.hasChargesRemaining();
    }

    private trackerTryDo(slot: AbilitySlot, func: (tracker: AbilityTracker) => void) {
        if (!this.gamePlayer.ownerIsPlayer) {
            return;
        }

        const tracker = this.trackers.get(slot);
        if (tracker) {
            func(tracker);
        }
    }

    onAbilityPrimed(slot: AbilitySlot) {
        this.trackerTryDo(slot, tracker => tracker.prime());
    }

    onAbilityActivated(slot: AbilitySlot, success: boolean, errorText?: string) {
        this.trackerTryDo(slot, tracker => tracker.onAbilityActivated(success, errorText));
    }

    onAbilityDeactivated(slot: AbilitySlot) {
        this.trackerTryDo(slot, tracker => tracker.onAbilityDeactivated());
    }

    onWeaponRelease(weapon: UtilsGameplay.EntityOrUndefined, weaponId: WeaponId) {
        this.trackers.forEach((value) => value.onWeaponRelease(weapon, weaponId));
    }

    onWeaponDisposed(weapon: UtilsGameplay.EntityOrUndefined, weaponId: WeaponId) {
        this.trackers.forEach((value) => value.onWeaponDisposed(weapon, weaponId));
    }

    addUtilityAbilityEnergy(amount: number) {
        this.trackerTryDo(AbilitySlot.UTILITY, tracker => tracker.addChargeEnergy(amount));
    }

    updateCapabilities() {
        this.trackers.forEach((tracker) => {
            if (this.canUseAbility(tracker)) {
                if (tracker.abilityState == AbilityState.DISABLED) {
                    tracker.restorePreviousState();
                }
            } else {
                tracker.setState(AbilityState.DISABLED, false);
            }
        });
    }

    public getEquippedAbilityIds() {
        const equippedAbilityIds: AbilityId[] = [];
        this.trackers.forEach(tracker => equippedAbilityIds.push(tracker.equippedAbilityData.id));
        return equippedAbilityIds;
    }
}

export class AbilityTracker {
    manager: GamePlayerAbilities;
    slot = AbilitySlot.UNDEFINED;

    timer: number = 0;

    equippedAbilityData = ConstsAbility.ABILITY_DATA_DEFAULT;

    abilityState = AbilityState.UNDEFINED;
    previousState = AbilityState.UNDEFINED;

    morphAsyncId = -1;

    chargeCount = -1;
    chargeEnergy = 0;

    isDisabledAttributeId: ConstsAttributes.AttributeId;

    // When we send a network event to the PlayerHUD, there's no guarantee of order. Adding a super simple counter so that we can process just the last one
    private messageCounterId = 0;

    constructor(manager: GamePlayerAbilities, slot: AbilitySlot = AbilitySlot.UNDEFINED, isDisabledAttributeId: ConstsAttributes.AttributeId) {
        this.manager = manager;
        this.slot = slot;
        this.isDisabledAttributeId = isDisabledAttributeId;
    }

    resetAbility() {
        this.initializeAbility();
    }

    equipAndInitializeAbility(id: AbilityId, playFX: boolean = true) {
        this.disablePreviousAbilityIfNeeded(id);
        this.equippedAbilityData = ConstsAbility.ABILITY_DATA_REGISTRY.get(id) ?? ConstsAbility.ABILITY_DATA_DEFAULT;
        this.sendEquipEvents(playFX);
        this.initializeAbility();
    }

    private disablePreviousAbilityIfNeeded(newAbilityId: string) {
        const activeOrPrimed = this.abilityState == AbilityState.ACTIVE || this.abilityState == AbilityState.PRIMED;
        if (activeOrPrimed && this.equippedAbilityData.id != newAbilityId) {
            this.handleDeactivation(false);
        }
    }

    sendEquipEvents(playFX: boolean) {
        // communicate with ability handler
        const payload = {player: this.manager.gamePlayer.owner, abilitySlot: this.slot, abilityId: this.equippedAbilityData.id, playFX: playFX, messageCounterId: this.messageCounterId++};
        this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(this.manager.parent.gameplayObject, EventsNetworked.equipAbility, payload, [this.manager.gamePlayer.owner]);
        this.manager.gamePlayer.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerAbilityEquipped, payload);
    }

    private initializeAbility() {
        if (this.equippedAbilityData.isPassive) {
            this.setState(AbilityState.ACTIVE);
            return;
        }

        this.setState(AbilityState.COOLDOWN);

        if (this.equippedAbilityData.chargesData) {
            this.chargeCount = this.equippedAbilityData.chargesData.initialChargeCount;
            this.chargeEnergy = 0;
            this.setState(this.chargeCount > 0 ? AbilityState.READY : AbilityState.DISABLED, false);
        } else {
            this.setState(AbilityState.READY, false);
        }
    }

    prime() {
        // TODO: give generic priming feedback
        this.handleWeaponMorph();
    }

    onAbilityActivated(success: boolean, errorText?: string) {
        if (!this.manager.gamePlayer.ownerIsPlayer || !this.equippedAbilityData) {
            return;
        }

        if (this.abilityState == AbilityState.DISABLED) {
            playSFXForPlayer(GlobalSFXBank.instance.props.abilityErrorSFX, this.manager.gamePlayer.owner);
            this.setState(AbilityState.DISABLED); // set to disabled again to re-broadcast disabled state to guarentee off
            return;
        }

        if (success) {
            this.setState(AbilityState.ACTIVE);
            mutateRoundPlayerStat(this.manager.gamePlayer.owner, 'abilities_activated', 1, {weaponIds: [], abilityIds: [this.equippedAbilityData.id]});
        } else {
            playSFXForPlayer(GlobalSFXBank.instance.props.abilityErrorSFX, this.manager.gamePlayer.owner);
        }
    }

    onAbilityDeactivated() {
        if (!this.manager.gamePlayer.ownerIsPlayer || this.abilityState != AbilityState.ACTIVE) {
            return;
        }
        this.setState(AbilityState.COOLDOWN);
    }

    onWeaponRelease(weapon: UtilsGameplay.EntityOrUndefined, weaponId: WeaponId) {
        if (!weapon || this.abilityState != AbilityState.ACTIVE || !this.equippedAbilityData.morphWeaponData || !this.equippedAbilityData.morphWeaponData.unmorphOnRelease) {
            return;
        }

        this.forceDeactivate();
    }

    onWeaponDisposed(weapon: UtilsGameplay.EntityOrUndefined, weaponId: WeaponId) {
        if (!weapon || this.abilityState != AbilityState.ACTIVE || !this.equippedAbilityData.morphWeaponData || !this.equippedAbilityData.morphWeaponData.unmorphOnRelease) {
            return;
        }

        this.forceDeactivate();
    }

    forceDeactivate() {
        this.manager.parent.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.deactivateAbility, {
            player: this.manager.gamePlayer.owner,
            abilitySlot: this.slot,
            abilityId: this.equippedAbilityData.id
        });
    }

    restorePreviousState() {
        if (this.equippedAbilityData.chargesData && this.previousState == AbilityState.READY) {
            this.setState(this.chargeCount > 0 ? AbilityState.READY : AbilityState.DISABLED, false);
        } else {
            this.setState(this.previousState, false, false);
        }
    }

    setState(state: AbilityState, playFX: boolean = true, updateTimer: boolean = true, completeStatusEffectsUponDeactivation: boolean = false) {
        if (this.abilityState != AbilityState.DISABLED) {
            this.previousState = this.abilityState;
        }

        if (!this.equippedAbilityData.canBeDisabled && state == AbilityState.DISABLED) {
            return;
        }

        if (this.abilityState == state) {
            return;
        }

        this.abilityState = state;


        switch (this.abilityState) {
            case AbilityState.DISABLED:
                if (this.previousState == AbilityState.ACTIVE) {
                    this.previousState = AbilityState.COOLDOWN;
                    this.timer = this.equippedAbilityData.cooldown;
                }
                this.handleDeactivation(completeStatusEffectsUponDeactivation);
                if (updateTimer && this.timer == 0 && !this.equippedAbilityData.isPassive) {
                    this.onAbilityTimerExpired();
                }
                break;
            case AbilityState.READY:
                this.timer = 0;
                break;
            case AbilityState.PRIMED:
                break;
            case AbilityState.ACTIVE:
                if (updateTimer) {
                    this.timer = this.equippedAbilityData.duration;
                }
                this.handleActivation();
                if (updateTimer && this.timer == 0 && !this.equippedAbilityData.isPassive) {
                    this.onAbilityTimerExpired();
                }
                break;
            case AbilityState.COOLDOWN:
                if (updateTimer) {
                    this.timer = this.equippedAbilityData.cooldown;
                }
                this.handleDeactivation(completeStatusEffectsUponDeactivation);
                if (updateTimer && this.timer == 0 && !this.equippedAbilityData.isPassive) {
                    this.onAbilityTimerExpired();
                }
                break;
        }

        if (playFX && GlobalSFXBank.instance && this.manager.gamePlayer.ownerIsPlayer) {
            switch (this.abilityState) {
                case AbilityState.DISABLED:
                    playHapticsFromSettings(this.manager.gamePlayer.owner, this.equippedAbilityData.haptics.disabled);
                    break;
                case AbilityState.READY:
                    if (this.equippedAbilityData.sharedAudio.ready) {
                        playSFXForPlayer(GlobalSFXBank.instance.props.abilityReadySFX, this.manager.gamePlayer.owner);
                    }
                    playHapticsFromSettings(this.manager.gamePlayer.owner, this.equippedAbilityData.haptics.ready);
                    break;
                case AbilityState.ACTIVE:
                    if (this.equippedAbilityData.sharedAudio.activated) {
                        playSFXForPlayer(GlobalSFXBank.instance.props.abilityActivateSFX, this.manager.gamePlayer.owner);
                    }
                    playHapticsFromSettings(this.manager.gamePlayer.owner, this.equippedAbilityData.haptics.activated);
                    break;
                case AbilityState.COOLDOWN:
                    if (this.equippedAbilityData.sharedAudio.deactivated) {
                        playSFXForPlayer(GlobalSFXBank.instance.props.abilityDeactivateSFX, this.manager.gamePlayer.owner);
                    }
                    playHapticsFromSettings(this.manager.gamePlayer.owner, this.equippedAbilityData.haptics.deactivated);
                    break;
            }
        }

        this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(this.manager.parent.gameplayObject, EventsNetworked.setAbilityState, {
            player: this.manager.gamePlayer.owner,
            abilitySlot: this.slot,
            abilityId: this.equippedAbilityData.id,
            state: this.abilityState
        });
    }

    handleActivation() {
        this.equippedAbilityData.statusEffects.forEach((value) =>
            this.manager.gamePlayer.statusEffects.applyEffect(
                value,
                this.timer,
                {
                    ...EventData.SOURCE_DATA_DEFAULT,
                    abilityId: this.equippedAbilityData.id,
                    obj: this.manager.parent.gameplayObject,
                    pos: this.manager.parent.getPos()
                }));

        if (this.equippedAbilityData.onButtonDown != ConstsAbility.AbilityHandlerBehavior.PRIME) {
            this.handleWeaponMorph();
        }
        this.handleWeaponMorphAttack();

        this.manager.parent.statusEffects.onAbilityActivated(this.equippedAbilityData.id);

        this.useCharge();
    }

    handleWeaponMorph() {
        const morphData = this.equippedAbilityData.morphWeaponData;
        if (!morphData) {
            return;
        }

        this.manager.gamePlayer.attack.weaponEntities.forEach((value) => this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.morphWeapon, {abilityId: this.equippedAbilityData.id}));
    }

    handleWeaponMorphAttack() {
        const morphData = this.equippedAbilityData.morphWeaponData;
        if (!morphData || !morphData.startAttackOnMorph) {
            return;
        }

        this.manager.gamePlayer.attack.weaponEntities.forEach((value) => this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.startAttack, {}));

        this.morphAsyncId = this.manager.gamePlayer.horizonApiProvider.async.setTimeout(() => this.manager.gamePlayer.attack.weaponEntities.forEach((value) => this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.startHit, {})), morphData.hitStartDelay * 1000);
    }

    handleDeactivation(completeStatusEffects: boolean) {
        this.equippedAbilityData.statusEffects.forEach((value) => {
            if (completeStatusEffects) {
                this.manager.gamePlayer.statusEffects.completeEffect(value);
            } else {
                this.manager.gamePlayer.statusEffects.removeEffect(value);
            }
        });

        const morphData = this.equippedAbilityData.morphWeaponData;
        if (morphData) {
            this.manager.gamePlayer.horizonApiProvider.async.clearTimeout(this.morphAsyncId);

            this.manager.gamePlayer.attack.weaponEntities.forEach((value) => {
                if (morphData.startAttackOnMorph) {
                    this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.stopHit, {});
                    this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.stopAttack, {});
                }

                if (morphData.unmorphOnEnd) {
                    this.manager.gamePlayer.horizonApiProvider.sendNetworkEvent(value, EventsNetworked.unmorphWeapon, {abilityId: this.equippedAbilityData.id});
                }
            });
        }

        this.manager.parent.statusEffects.onAbilityDeactivated(this.equippedAbilityData.id);
    }

    useCharge() {
        if (!this.equippedAbilityData.chargesData) {
            return;
        }

        this.chargeCount = Math.max(this.chargeCount - 1, 0);
    }

    setChargeEnergy(value: number) {
        if (!this.equippedAbilityData.chargesData) {
            return;
        }

        if (this.chargeCount >= this.equippedAbilityData.chargesData.maxChargesCount) {
            return; // already max charges
        }

        this.chargeEnergy = Math.max(0, value); // should never be negative
        if (this.chargeEnergy >= this.equippedAbilityData.chargesData.energyRequirementPerCharge) {
            if (this.chargeCount <= 0) {
                this.setState(AbilityState.READY);
            }

            this.chargeCount++;

            if (this.chargeCount < this.equippedAbilityData.chargesData.maxChargesCount) {
                this.setChargeEnergy(this.chargeEnergy - this.equippedAbilityData.chargesData.energyRequirementPerCharge); // subtract required amount
            } else {
                this.chargeEnergy = 0;
            }
        }
    }

    addChargeEnergy(amount: number) {
        this.setChargeEnergy(this.chargeEnergy + amount);
    }

    getChargeEnergyPercent() {
        if (!this.equippedAbilityData.chargesData) {
            return 0;
        }

        return UtilsMath.clamp01(this.chargeEnergy / this.equippedAbilityData.chargesData.energyRequirementPerCharge);
    }

    update(deltaTime: number) {
        if (this.equippedAbilityData.isPassive) {
            return;
        }

        if (this.equippedAbilityData.chargesData && this.equippedAbilityData.chargesData.energyRegenRate > 0) {
            if (this.chargeCount < this.equippedAbilityData.chargesData.maxChargesCount) {
                this.addChargeEnergy(this.equippedAbilityData.chargesData.energyRegenRate * deltaTime);
            }
        }

        if (this.timer > 0) {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.onAbilityTimerExpired();
            }
        }
    }

    private onAbilityTimerExpired() {
        const hasCharges = this.hasChargesRemaining();
        switch (this.abilityState) {
            case AbilityState.DISABLED:
                if (hasCharges) {
                    if (this.previousState == AbilityState.COOLDOWN) {
                        this.previousState = AbilityState.READY;
                    }
                }
                break;
            case AbilityState.ACTIVE:
                if (hasCharges) {
                    this.setState(AbilityState.COOLDOWN, true, true, true);
                } else {
                    this.setState(AbilityState.DISABLED, true, true, true);
                }
                break;
            case AbilityState.COOLDOWN:
                if (hasCharges) {
                    this.setState(AbilityState.READY);
                } else {
                    this.setState(AbilityState.DISABLED);
                }
                break;
        }
    }

    public hasChargesRemaining() {
        if (!this.equippedAbilityData.chargesData) {
            // If the ability doesn't need charges then it's considered to always have charges remaining.
            return true;
        }
        return this.chargeCount > 0;
    }
}
