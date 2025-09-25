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

import { BaseObj, IObjectComponent } from 'BaseObj';
import * as ConstsAttributes from 'ConstsAttributes';
import { EntityOrPlayer, ObjMaterial } from 'ConstsObj';
import { StatSourceData } from 'ConstsStats';
import * as EventData from 'EventData';
import { ChangeDataHitInfo, CHANGE_DATA_HIT_INFO_DEFAULT, getEntityOrPlayerOrThrow, SOURCE_DATA_DEFAULT, TargetScheme } from 'EventData';
import * as Events from 'Events';
import { onKillForStats, OnKillForStatsData, onLatestKill } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { shieldHpChanged } from 'EventsNetworked';
import { Player } from 'horizon/core';
import { getRoundPlayerStats } from 'PlayerStats';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { GAME_ENTITY } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { getPlayer } from 'UtilsPlayer';

export type DamageExtraResult = {
    didHeadShot: boolean,
    didHitWeakPoint: boolean,
    weakPointId: number,
    finalDmgAmount: number,
}

export const DAMAGE_EXTRA_RESULTS_DEFAULT: DamageExtraResult = {
    didHeadShot: false,
    didHitWeakPoint: false,
    weakPointId: 0,
    finalDmgAmount: 0,
};

export enum UnderShieldEventId {
    UNDEFINED,
    DEPLETED,
    REGEN_STARTED,
    REGEN_CANCELED,
    REGEN_COMPLETED,
}

export const DEATH_DISABLE_DELAY = 1.0;

export interface ICompHealthListener {
    onDamageTaken(damageData: ChangeDataHitInfo): void;

    onHpChange(comp: CompHealth, animationTimeSeconds: number): void;

    onUnderShieldHpChange(comp: CompHealth): void;

    onUnderShieldEvent(comp: CompHealth, eventId: UnderShieldEventId): void;

    onDeath(comp: CompHealth, damageData: EventData.ChangeDataHitInfo): void;

    onRevive(comp: CompHealth): void;
}

export interface IDamageExtraProvider {
    calculateDamageExtra(event: EventData.ChangeDataWithSource): DamageExtraResult;

    calculateHealExtra(event: EventData.ChangeDataWithSource): number;
}

type ModifiedDamageData = {
    modifiedDamageAmount: number,
    isCritHit: boolean,
};

export class CompHealth implements IObjectComponent {
    hp = -1;
    maxHp = -1;

    protected underShieldHp = 0;
    protected underShieldMaxHp = 0;
    underShieldRegenDelayTimer = 0;

    shieldHp = 0;
    shieldMaxHp = 0;

    damageExtraProvider: IDamageExtraProvider | undefined;
    listeners: ICompHealthListener[] = [];
    isAlive = false;
    private deathDisableAsyncId = -1;

    private damagers: [Player, StatSourceData][] = [];

    constructor(parent: BaseObj) {
        this.parent = parent;
    }

    initialize() {
        this.reset();

        // direct targeting
        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyHeal, (data) => this.applyHeal(data));
        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyDamage, (data) => this.applyDamage(data));
        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyRevive, (data) => this.revive(data.sourceData, data.playFX));

        // general broadcasting
        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyHeal, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.applyHeal(data);
            }
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyDamage, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.applyDamage(data);
            }
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyRevive, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.revive(data.sourceData, data.playFX);
            }
        });
    }

    parent: BaseObj;

    reset() {
        this.isAlive = true;
        this.setHp(this.maxHp);
        this.setUnderShieldHp(this.underShieldMaxHp);
    }

    update(deltaTime: number) {
        if (!this.isAlive) {
            return;
        }

        // update under shield
        this.updateUnderShield(deltaTime);
    }

    updateUnderShield(deltaTime: number) {
        if (this.underShieldMaxHp <= 0) {
            return; // no under shields
        }

        if (this.underShieldHp >= this.underShieldMaxHp) {
            return; // fully charged
        }

        if (this.underShieldRegenDelayTimer > 0) {
            this.underShieldRegenDelayTimer -= deltaTime;
            if (this.underShieldRegenDelayTimer <= 0) {
                this.listeners.forEach((value) => value.onUnderShieldEvent(this, UnderShieldEventId.REGEN_STARTED));
            }
            return; // delay is still active
        }

        const regenAmount = this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UNDER_SHIELD_REGEN_SPEED, ConstsAttributes.AttributeId.UNDER_SHIELD_REGEN_SPEED_MULTIPLIER);
        this.setUnderShieldHp(this.underShieldHp + regenAmount * deltaTime);

        if (this.underShieldHp >= this.underShieldMaxHp) {
            this.listeners.forEach((value) => value.onUnderShieldEvent(this, UnderShieldEventId.REGEN_COMPLETED));
        }
    }

    setHp(value: number, clamp: boolean = true, animationTimeSeconds: number = 0) {
        this.hp = clamp ? UtilsMath.clamp(value, 0, this.maxHp) : value;
        this.listeners.forEach((listener) => listener.onHpChange(this, animationTimeSeconds));
    }

    setMaxHp(value: number, reset: boolean = true) {
        this.maxHp = value;
        this.setHp(Math.min(this.hp, this.maxHp));
        if (reset) {
            this.reset();
        }
    }

    setUnderShieldHp(value: number, clamp: boolean = true) {
        this.underShieldHp = clamp ? UtilsMath.clamp(value, 0, this.underShieldMaxHp) : value;

        this.listeners.forEach((value) => value.onUnderShieldHpChange(this));
    }

    setUnderShieldMaxHp(value: number, reset: boolean = true) {
        this.underShieldMaxHp = value;
        this.setUnderShieldHp(Math.min(this.underShieldHp, this.underShieldMaxHp));
        if (reset) {
            this.reset();
        }
    }

    applyHeal(event: EventData.ChangeDataWithSource) {
        if (!this.isAlive || event.changeData.amount <= 0.0 || !this.parent.isValidTarget(event.changeData.targetScheme, event.sourceData)) {
            return;
        }

        event.changeData.amount = EventData.calculateAmountFromChangeData(event.changeData);

        this.parent.statusEffects.applyStatusEffectsFromWeapon(event);

        // apply modifiers from heal source
        event.changeData.amount = this.parent.attributes.multiplyAmount(
            event.changeData.amount,
            this.maxHp,
            event.changeData.changeScheme,
            ServerBaseObjRegistry.getObjFrom(event.sourceData),
            ConstsAttributes.AttributeId.HEAL_MULTIPLIER_PERCENT,
        );

        // add bonus heal
        event.changeData.amount += this.parent.attributes.multiplyAmount(
            event.changeData.amount,
            this.maxHp,
            EventData.ChangeScheme.RAW,
            this.parent,
            ConstsAttributes.AttributeId.HEAL_RECIEVE_MULTIPLIER_PRECENT,
        );

        // set data into raw space to make modifications easier
        event.changeData.changeScheme = EventData.ChangeScheme.RAW;
        if (this.damageExtraProvider) { // recalculate based on external factors
            event.changeData.amount = this.damageExtraProvider.calculateHealExtra(event);
        }

        event.changeData.amount = Math.max(0, Math.ceil(event.changeData.amount));

        this.setHp(this.hp + event.changeData.amount, true, event.changeData.animationTimeSeconds);

        this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onHealthHealed, {
            ...event,
            targetData: this.parent.getEventTargetData(),
        });
    }

    applyDamage(event: EventData.ChangeDataWithSource) {
        if (!this.canTakeDamage() || !this.parent.isValidTarget(event.changeData.targetScheme, event.sourceData)) {
            //console.log("Exiting: " + !this.canTakeDamage() + " "  + (event.changeData.amount <= 0))
            return;
        }
        // filter out invalid damage

        const damageData: EventData.ChangeDataHitInfo = {
            ...EventData.CHANGE_DATA_HIT_INFO_DEFAULT,
            ...event,
            targetData: this.parent.getEventTargetData(),
            material: this.parent.getMaterial() ?? ObjMaterial.UNDEFINED,
        };

        this.addDamager(damageData.sourceData);
        this.parent.statusEffects.applyStatusEffectsFromWeapon(damageData);

        // calculate base damage
        damageData.changeData.amount = EventData.calculateAmountFromChangeData(damageData.changeData);

        // apply modifiers from damage source
        const sourceDamageResults = this.handleDamageModifiersFromSource(damageData);
        damageData.changeData.amount = sourceDamageResults.modifiedDamageAmount;
        damageData.isCrit = sourceDamageResults.isCritHit;

        // set data into raw space to make modifications easier
        damageData.changeData.changeScheme = EventData.ChangeScheme.RAW;

        if (this.damageExtraProvider) {
            // recalculate based on external factors
            let result = this.damageExtraProvider.calculateDamageExtra(damageData);
            damageData.changeData.amount = result.finalDmgAmount;
            damageData.isHeadshotHit = result.didHeadShot;
            damageData.isWeakPointHit = result.didHitWeakPoint;
            damageData.weakPointId = result.weakPointId;
        }

        // subtract reductions
        damageData.changeData.amount -= this.parent.attributes.multiplyAmount(
            damageData.changeData.amount,
            this.maxHp,
            damageData.changeData.changeScheme,
            this.parent,
            ConstsAttributes.AttributeId.DAMAGE_REDUCTION_PERCENT,
        );

        // don't allow negative damage
        damageData.changeData.amount = Math.max(0, Math.ceil(damageData.changeData.amount));

        // handle shield damages
        const beforeShieldAmount = damageData.changeData.amount;
        const shieldDamageResult = this.applyShieldDamage(damageData.changeData.amount);
        damageData.changeData.amount = shieldDamageResult.remainingDamageAmount;
        damageData.isShieldHit ||= shieldDamageResult.isShieldHit;

        const underShieldDamageResult = this.applyUnderShieldDamage(damageData.changeData.amount);
        damageData.changeData.amount = underShieldDamageResult.remainingDamageAmount;
        damageData.isShieldHit ||= underShieldDamageResult.isShieldHit;

        // modify HP
        const actualDamageTaken = Math.min(this.hp, damageData.changeData.amount);
        this.setHp(this.hp - damageData.changeData.amount, true, event.changeData.animationTimeSeconds);

        this.dispatchDamageEvents(damageData, actualDamageTaken, beforeShieldAmount - damageData.changeData.amount);

        if (this.hp > 0) return;
        this.notifyVictimsStatusEffects(damageData);

        // Victim's status effects might have changed the victim's hp
        if (this.hp > 0) return;
        this.kill(damageData);
    }

    kill(changeData: EventData.ChangeDataHitInfo = this.getDefaultKillEvent()) {
        if (!this.isAlive) {
            return;
        }
        this.isAlive = false;
        this.setHp(0);
        this.notifyKillersStatusEffectsIfNeeded(changeData);

        this.parent.statusEffects.reset();

        const killer = changeData.sourceData.obj instanceof Player ? changeData.sourceData.obj as Player : undefined;
        const onKillForStatsData: OnKillForStatsData = {
            ...changeData,
            damagers: this.damagers,
            isValidTarget: this.parent.isValidTarget(TargetScheme.ENEMY_TEAM_ONLY, changeData.sourceData),
        };
        if (killer) {
            this.parent.horizonApiProvider.sendLocalBroadcastEvent(onLatestKill, {player: killer});
            this.parent.horizonApiProvider.sendLocalEvent(killer, onKillForStats, onKillForStatsData);
        }

        if (this.parent.gameplayObject instanceof Player) {
            this.parent.horizonApiProvider.sendLocalEvent(this.parent.gameplayObject, onKillForStats, onKillForStatsData);
        }

        this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onDeath, {
            ...changeData,
            targetData: this.parent.getEventTargetData(),
            killerElimStreak: this.getPlayerElimStreakOrUndefined(changeData.sourceData.obj),
            targetLastElimStreak: this.getPlayerElimStreakOrUndefined(changeData.targetData),
            isHeadShot: changeData.isHeadshotHit,
        });

        this.parent.horizonApiProvider.async.clearTimeout(this.deathDisableAsyncId);
        this.deathDisableAsyncId = this.parent.horizonApiProvider.async.setTimeout(() => this.parent.setIsEnabled(false), DEATH_DISABLE_DELAY * 1000);

        this.listeners.forEach((value) => value.onDeath(this, changeData));

        this.parent.updateCapabilities();
    }

    private notifyVictimsStatusEffects(damageData: ChangeDataHitInfo) {
        this.parent.statusEffects.onDeath(damageData);
    }

    private notifyKillersStatusEffectsIfNeeded(damageData: ChangeDataHitInfo) {
        const killer = ServerBaseObjRegistry.getObjFrom(damageData.sourceData);
        if (killer) {
            killer.statusEffects.onKill(this.parent, damageData);
        }
    }

    private dispatchDamageEvents(damageData: ChangeDataHitInfo, actualDamageTaken: number, damageMitigated: number) {
        // Send damage dealt confirmation to damager. (Only players can damage currently)
        const damager = getEntityOrPlayerOrThrow(damageData.sourceData);
        this.parent.horizonApiProvider.sendLocalEvent(damager, Events.onDamageDealt, damageData);
        const onDamageForStatsData = {
            ...damageData,
            actualDamage: actualDamageTaken,
            damageMitigated: damageMitigated,
            isValidTarget: this.parent.isValidTarget(TargetScheme.ENEMY_TEAM_ONLY, damageData.sourceData),
        };
        this.parent.horizonApiProvider.sendLocalEvent(damager, Events.onDamageForStats, onDamageForStatsData);

        // Route damage taken confirmation for owner. Player handles this in PlayerFX (so we send event), Actors implement listener pattern.
        if (this.parent.gameplayObject instanceof Player) {
            this.parent.horizonApiProvider.sendLocalEvent(this.parent.gameplayObject, Events.onDamageTaken, damageData);
            this.parent.horizonApiProvider.sendLocalEvent(this.parent.gameplayObject, Events.onDamageForStats, onDamageForStatsData);
        } else {
            this.listeners.forEach(listener => listener.onDamageTaken(damageData));
        }

        // Send to whoever else cares, and handle any other damage taken confirmations for owner.
        this.parent.horizonApiProvider.sendLocalEvent(GAME_ENTITY, Events.onDamageTaken, damageData);
        this.parent.statusEffects.onDamageTaken(damageData);
    }

    private handleDamageModifiersFromSource(damageData: ChangeDataHitInfo): ModifiedDamageData {
        let modifiedDamageAmount = damageData.changeData.amount;
        let isCritHit = false;

        const sourceObj = ServerBaseObjRegistry.getObjFrom(damageData.sourceData);
        if (sourceObj) {
            sourceObj.statusEffects.onDamageDealt(this.parent, damageData);
            // apply damage multiplier from source
            modifiedDamageAmount = this.parent.attributes.multiplyAmount(
                damageData.changeData.amount,
                this.maxHp,
                damageData.changeData.changeScheme,
                sourceObj,
                ConstsAttributes.AttributeId.DAMAGE_MULTIPLIER_PERCENT,
            );

            // calculate crit
            const critResult = this.handleCriticalDamage(sourceObj, modifiedDamageAmount);
            modifiedDamageAmount = critResult.modifiedDamageAmount;
            isCritHit = critResult.isCritHit;
        }

        return {modifiedDamageAmount: modifiedDamageAmount, isCritHit: isCritHit};
    }

    private handleCriticalDamage(sourceObj: BaseObj, damageAmount: number): ModifiedDamageData {
        let modifiedDamageAmount = damageAmount;
        let isCritHit = false;

        const critRoll = Math.random();
        let critChance = sourceObj.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.CRITICAL_DAMAGE_CHANCE)
            - this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.CRITICAL_DAMAGE_CHANCE_REDUCTION);
        critChance = UtilsMath.clamp01(critChance);

        if (critRoll <= critChance) {
            isCritHit = true;
            let critMultiplier = sourceObj.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.DAMAGE_MULTIPLIER_CRITICAL_DAMAGE_PERCENT)
                - this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.CRITICAL_DAMAGE_REDUCTION_PERCENT);
            modifiedDamageAmount *= Math.max(critMultiplier, 1.0);
        }

        return {modifiedDamageAmount: modifiedDamageAmount, isCritHit: isCritHit};
    }

    private applyShieldDamage(amount: number): {remainingDamageAmount: number, isShieldHit: boolean} {
        let remainingDamageAmount = amount;
        let isShieldHit = false;

        if (this.shieldHp > 0) {
            isShieldHit = true;
            const shieldDamageReduction = this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.SHIELD_DAMAGE_REDUCTION_PERCENT);
            const shieldDamage = Math.ceil(Math.min(this.shieldHp, amount * shieldDamageReduction));
            this.shieldHp -= shieldDamage;

            remainingDamageAmount -= shieldDamage;

            this.parent.horizonApiProvider.sendNetworkEvent(this.parent.gameplayObject, shieldHpChanged, {shieldHp: this.shieldHp, shieldMaxHp: this.shieldMaxHp});

            if (this.shieldHp <= 0) {
                this.shieldHp = 0;
                this.parent.statusEffects.removeAllEffectsOfCategory('positive_shield_modifier');
            }
        }

        return {remainingDamageAmount: remainingDamageAmount, isShieldHit: isShieldHit};
    }

    private applyUnderShieldDamage(amount: number): {remainingDamageAmount: number, isShieldHit: boolean} {
        let remainingDamageAmount = amount;
        let isShieldHit = false;

        if (this.underShieldMaxHp > 0) {
            if (this.underShieldHp > 0) {
                isShieldHit = true;
                const underShieldDamageReduction = this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UNDER_SHIELD_DAMAGE_REDUCTION_PRECENT);
                const underShieldDamage = Math.ceil(Math.min(this.underShieldHp, amount * underShieldDamageReduction));

                if (this.underShieldHp < this.underShieldMaxHp && this.underShieldRegenDelayTimer <= 0) {
                    this.listeners.forEach((value) => value.onUnderShieldEvent(this, UnderShieldEventId.REGEN_CANCELED));
                }

                this.setUnderShieldHp(this.underShieldHp - underShieldDamage);

                remainingDamageAmount -= underShieldDamage;

                if (this.underShieldHp <= 0) {
                    this.listeners.forEach((value) => value.onUnderShieldEvent(this, UnderShieldEventId.DEPLETED));
                }
            }

            this.underShieldRegenDelayTimer = this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.UNDER_SHIELD_REGEN_DELAY, ConstsAttributes.AttributeId.UNDER_SHIELD_REGEN_DELAY_MULTIPLIER);
        }

        return {remainingDamageAmount: remainingDamageAmount, isShieldHit: isShieldHit};
    }

    private getPlayerElimStreakOrUndefined(target?: EntityOrPlayer) {
        return target instanceof Player ? (getRoundPlayerStats(target).total.elimination_streak ?? 0) : undefined;
    }

    private getDefaultKillEvent() {
        return {
            ...CHANGE_DATA_HIT_INFO_DEFAULT,
            targetData: this.parent.getEventTargetData(),
            sourceData: {
                ...SOURCE_DATA_DEFAULT,
                obj: this.parent.getEventTargetData(),
            }
        };
    }

    revive(reviverData: EventData.SourceData = EventData.SOURCE_DATA_DEFAULT, playFX: boolean = true) {
        // TODO: Vu investigate if this should be moved next to the Events.onRevive sending, and if we're double reviving
        this.listeners.forEach((value) => value.onRevive(this));

        this.resetDamagers();

        this.isAlive = true;
        this.setHp(this.maxHp);
        this.setUnderShieldHp(this.underShieldMaxHp);

        this.parent.horizonApiProvider.async.clearTimeout(this.deathDisableAsyncId);
        this.parent.setIsEnabled(true);

        this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onRevive, {
            targetData: this.parent.getEventTargetData(),
            sourceData: reviverData,
            playFX: playFX,
        });

        this.parent.updateCapabilities();
    }

    getHpPercent() {
        if (this.maxHp <= 0) {
            return 0;
        }
        return UtilsMath.clamp01(this.hp / this.maxHp);
    }

    getUnderShieldPercent() {
        if (this.underShieldMaxHp <= 0) {
            return 0;
        }
        return UtilsMath.clamp01(this.underShieldHp / this.underShieldMaxHp);
    }

    canTakeDamage() {
        return !this.isInvulnerable() && this.isAlive;
    }

    isInvulnerable() {
        if (!this.parent.attributes.hasAttribute(ConstsAttributes.AttributeId.IS_INVULNERABLE)) return false;

        return this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.IS_INVULNERABLE) > 0;
    }

    addDamager(data: EventData.SourceData) {
        const player = getPlayer(data.obj);
        if (!player) return;

        const statSourceData: StatSourceData = {weaponIds: [data.weaponId], abilityIds: [data.abilityId]};

        const existingEntry = this.damagers.find(([existingPlayer]) => existingPlayer == player);
        if (existingEntry) {
            existingEntry[1] = statSourceData;
        } else {
            this.damagers.push([player, statSourceData]);
        }
    }

    resetDamagers() {
        this.damagers = [];
    }

}
