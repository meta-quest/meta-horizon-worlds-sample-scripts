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

import {BaseObj} from 'BaseObj';
import {StatusEffectHandler} from 'CompStatusEffects';
import * as ConstsObj from 'ConstsObj';
import {EntityOrPlayer} from 'ConstsObj';
import * as EventData from 'EventData';
import {CHANGE_DATA_SPLASH_DEFAULT, ChangeDataHitInfo, ChangeDataSplash, ChangeDataWithSource, SourceData, TargetScheme} from 'EventData';
import * as EventsNetworked from 'EventsNetworked';
import {GlobalVFXBank, VFXPoolTracker} from 'GlobalVFXBank';
import * as UtilsObj from 'UtilsObj';
import {WeaponId} from 'ConstsIdsWeapon';
import {AbilityId} from 'ConstsIdsAbility';
import {StatusEffectId} from 'ConstsIdsStatusEffect';
import {ServerBaseObjRegistry} from "./ServerBaseObjRegistry";
import {deactivateAbility} from 'EventsNetworked';
import { Color, Entity, Quaternion, Vec3 } from 'horizon/core';

export interface WeaponEventData {
    parent: BaseObj,
    weapon: Entity,
    weaponId: WeaponId,
    handler: StatusEffectHandler,
    currentAmmo?: number,
    target?: EntityOrPlayer,
}

interface WeaponStateCallbacks {
    doOnWeaponFired?: (data: WeaponEventData) => void;
    doOnWeaponAmmoChanged?: (data: WeaponEventData) => void;
    doOnWeaponReloaded?: (data: WeaponEventData) => void;
    doOnWeaponTargetAcquired?: (data: WeaponEventData) => void;
}

interface StatusEffectCallbacks {
    doOnApply?: (parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined) => void;
    doOnTick?: () => void;
    doOnStackAdded?: (parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData) => void;
    doOnStackRemoved?: (parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData) => void;
    doOnRemove?: (parent: BaseObj, handler: StatusEffectHandler) => void;
    doOnComplete?: (parent: BaseObj, handler: StatusEffectHandler) => void;
}

export class BaseStatusEffectBehavior {
    onWeaponFired(parent: BaseObj, weapon: Entity, weaponId: WeaponId, handler: StatusEffectHandler): void {
    }

    onWeaponAmmoChanged(parent: BaseObj, weapon: Entity, weaponId: WeaponId, handler: StatusEffectHandler, currentAmmo: number): void {
    }

    onWeaponReloaded(data: WeaponEventData): void {
    }

    onWeaponTargetAcquired(data: WeaponEventData): void {
    }

    onDamageTaken(parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler): void {
    }

    onDeath(parent: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler): void {
    }

    onDamageDealt(parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler): void {
    }

    onKill(parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler): void {
    }

    onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
    }

    onRemove(parent: BaseObj, handler: StatusEffectHandler): void {
    }

    onComplete(parent: BaseObj, handler: StatusEffectHandler): void {
    }

    onTick(parent: BaseObj, handler: StatusEffectHandler): void {
    }

    onStackAdded(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData): void {
    }

    onStackRemoved(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData): void {
    }

    onStackCountChange(parent: BaseObj, handler: StatusEffectHandler): void {
    }

    onAbilityActivated(parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler): void {
    }

    onAbilityDeactivated(parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler): void {
    }
}

//** GENERAL *//
export class OnStatusEffectChanged extends BaseStatusEffectBehavior {
    callbacks: StatusEffectCallbacks;

    constructor(callbacks: StatusEffectCallbacks) {
        super();
        this.callbacks = callbacks;
    }

    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined) {
        super.onApply(parent, handler, sourceData);
        if (this.callbacks.doOnApply) {
            this.callbacks.doOnApply(parent, handler, sourceData);
        }
    }

    override onRemove(parent: BaseObj, handler: StatusEffectHandler) {
        super.onRemove(parent, handler);
        if (this.callbacks.doOnRemove) {
            this.callbacks.doOnRemove(parent, handler);
        }
    }

    override onStackAdded(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData) {
        super.onStackAdded(parent, handler, sourceData);
        if (this.callbacks.doOnStackAdded) {
            this.callbacks.doOnStackAdded(parent, handler, sourceData);
        }
    }

    override onStackRemoved(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData) {
        super.onStackRemoved(parent, handler, sourceData);
        if (this.callbacks.doOnStackRemoved) {
            this.callbacks.doOnStackRemoved(parent, handler, sourceData);
        }
    }
}

export class OnWeaponStateChanged extends BaseStatusEffectBehavior {
    callbacks: WeaponStateCallbacks;

    constructor(callbacks: WeaponStateCallbacks) {
        super();
        this.callbacks = callbacks;
    }

    override onWeaponFired(parent: BaseObj, weapon: Entity, weaponId: WeaponId, handler: StatusEffectHandler) {
        if (!this.callbacks.doOnWeaponFired) {
            return;
        }
        this.callbacks.doOnWeaponFired({parent: parent, weapon: weapon, weaponId: weaponId, handler: handler});
    }

    override onWeaponAmmoChanged(parent: BaseObj, weapon: Entity, weaponId: WeaponId, handler: StatusEffectHandler, currentAmmo: number) {
        if (!this.callbacks.doOnWeaponAmmoChanged) {
            return;
        }
        this.callbacks.doOnWeaponAmmoChanged({parent: parent, weapon: weapon, weaponId: weaponId, handler: handler, currentAmmo: currentAmmo});
    }

    override onWeaponReloaded(data: WeaponEventData) {
        if (!this.callbacks.doOnWeaponReloaded) {
            return;
        }
        this.callbacks.doOnWeaponReloaded(data);
    }

    override onWeaponTargetAcquired(data: WeaponEventData) {
        if (!this.callbacks.doOnWeaponTargetAcquired) {
            return;
        }
        this.callbacks.doOnWeaponTargetAcquired(data);
    }


}

/** Can be used when we want to apply behavior to the source of who applied this status effect (i.e. player applies onto enemy, we apply to player) */
export class ApplyToSource extends BaseStatusEffectBehavior {
    onApplyEffect: ((parent: BaseObj, handler: StatusEffectHandler, source: BaseObj) => void) | undefined;

    constructor(onApplyEffect: ((parent: BaseObj, handler: StatusEffectHandler, source: BaseObj) => void) | undefined = undefined) {
        super();
        this.onApplyEffect = onApplyEffect;
    }

    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        if (!this.onApplyEffect || !sourceData) {
            return;
        }

        const sourceObj = ServerBaseObjRegistry.getObjFrom(sourceData);
        if (!sourceObj) {
            return;
        }

        this.onApplyEffect(parent, handler, sourceObj);
    }
}

export class AOETargetFinder extends BaseStatusEffectBehavior {
    constructor(parent: BaseObj, changeDataSplash: ChangeDataSplash = CHANGE_DATA_SPLASH_DEFAULT, onTargetFound: (target: BaseObj, changeDataWithSource: ChangeDataWithSource) => void) {
        super();

        const pos = parent.getPos();
        changeDataSplash.targetSelectionData.pos = pos;

        const candidates = new Map<BaseObj, Vec3>();

        parent.forEachTarget(changeDataSplash.changeData.targetScheme, changeDataSplash.sourceData, (target) => {
            const result = target.getFirstBodyPartInRange(pos, changeDataSplash.radius, ConstsObj.DAMAGE_TARGET_PARTS);
            if (result && result.didHit) {
                candidates.set(target, result.pos);
            }
        });

        candidates.forEach((pos, candidate) => {
            const changeDataWithSource: ChangeDataWithSource = {
                ...changeDataSplash,
                sourceData: {
                    ...changeDataSplash.sourceData,
                    pos: pos
                }
            };
            onTargetFound(candidate, changeDataWithSource);
        });
    }
}

export class AOEApplyStatusEffectBehavior extends BaseStatusEffectBehavior {
    statusEffectId: StatusEffectId;
    duration: number;

    radius: number;

    targetScheme: EventData.TargetScheme;
    targetSelectionData: EventData.TargetingSelectionData;

    onApplyEffect: ((parent: BaseObj, handler: StatusEffectHandler) => void) | undefined;
    onApplyToTarget: ((parent: BaseObj, target: BaseObj, index: number, handler: StatusEffectHandler) => void) | undefined;

    constructor(statusEffectId: StatusEffectId,
                duration: number,
                radius: number,
                targetScheme: EventData.TargetScheme,
                targetSelectionData: EventData.TargetingSelectionData = EventData.TARGETING_SELECTION_DATA_DEFAULT,
                onApplyEffect: ((parent: BaseObj, handler: StatusEffectHandler) => void) | undefined = undefined,
                onApplyToTarget: ((parent: BaseObj, target: BaseObj, index: number, handler: StatusEffectHandler) => void) | undefined = undefined) {
        super();

        this.statusEffectId = statusEffectId;
        this.duration = duration;
        this.radius = radius;

        this.targetScheme = targetScheme;
        this.targetSelectionData = targetSelectionData;

        this.onApplyEffect = onApplyEffect;
        this.onApplyToTarget = onApplyToTarget;
    }

    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        this.applyEffect(parent, handler);
    }

    applyEffect(parent: BaseObj, handler: StatusEffectHandler) {
        if (this.onApplyEffect) {
            this.onApplyEffect(parent, handler);
        }

        const pos = parent.getPos();
        this.targetSelectionData.pos = pos;

        const candidates: BaseObj[] = [];
        parent.forEachTarget(this.targetScheme, handler.sourceData, (value) => {
            const result = value.getFirstBodyPartInRange(pos, this.radius, ConstsObj.DAMAGE_TARGET_PARTS);
            if (result && result.didHit) {
                candidates.push(value);
            }
        });

        UtilsObj.forEachInSelection(candidates, this.targetSelectionData, (value, index) => {
            this.applyToTarget(parent, value, index, handler);
        });
    }

    applyToTarget(parent: BaseObj, obj: BaseObj, index: number, handler: StatusEffectHandler) {
        obj.statusEffects.applyEffect(this.statusEffectId, this.duration, handler.sourceData);
        if (this.onApplyToTarget) {
            this.onApplyToTarget(parent, obj, index, handler);
        }
    }
}

//** HEALING */
export abstract class BaseHealBehavior extends BaseStatusEffectBehavior {
    amount: number;
    scheme: EventData.ChangeScheme;

    constructor(amount: number = 1.0, scheme: EventData.ChangeScheme = EventData.ChangeScheme.PERCENT) {
        super();
        this.amount = amount;
        this.scheme = scheme;
    }

    heal(parent: BaseObj, handler: StatusEffectHandler) {
        parent.health.applyHeal({
            ...EventData.CHANGE_DATA_WITH_SOURCE_DEFAULT,
            changeData: {
                ...EventData.CHANGE_DATA_DEFAULT,
                amount: this.amount,
                changeScheme: this.scheme,
                changeAction: EventData.ChangeAction.HEAL
            },
            sourceData: {
                ...handler.sourceData,
                pos: parent.getPos()
            }
        });
    }
}

export class HealOnApplyBehavior extends BaseHealBehavior {
    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        this.heal(parent, handler);
    }
}

/** TICK BASED */
export class RegenHealthBehavior extends BaseStatusEffectBehavior {
    hpPerTick: number;
    changeScheme: EventData.ChangeScheme;
    modifierAttributeId = 0;

    constructor(hpPerTick: number,
                changeScheme: EventData.ChangeScheme = EventData.ChangeScheme.RAW,
                modifierAttributeId: number = 0) {
        super();
        this.hpPerTick = hpPerTick;
        this.changeScheme = changeScheme;
        this.modifierAttributeId = modifierAttributeId;
    }

    override onTick(parent: BaseObj, handler: StatusEffectHandler) {
        super.onTick(parent, handler);

        let amount = this.hpPerTick;
        const sourceObj = ServerBaseObjRegistry.getObjFrom(handler.sourceData);
        if (sourceObj) {
            amount = sourceObj.attributes.multiplyAmount(amount, parent.health.maxHp, this.changeScheme, sourceObj, this.modifierAttributeId);
        }

        parent.health.applyHeal({
            changeData: {
                ...EventData.CHANGE_DATA_DEFAULT,
                amount: amount,
                changeScheme: this.changeScheme,
                changeAction: EventData.ChangeAction.HEAL
            },
            sourceData: {
                ...handler.sourceData,
                pos: parent.getPos()
            }
        });
    }
}

export class DamageOverTimeBehavior extends BaseStatusEffectBehavior {
    hpPerTick: number;
    changeScheme: EventData.ChangeScheme;
    changeElement: EventData.ChangeElement;
    modiferAttributeId: number;

    constructor(hpPerTick: number,
                changeScheme: EventData.ChangeScheme = EventData.ChangeScheme.RAW,
                changeElement: EventData.ChangeElement = EventData.ChangeElement.UNDEFINED,
                modifierAttributeId: number = 0) {
        super();
        this.hpPerTick = hpPerTick;
        this.changeScheme = changeScheme;
        this.changeElement = changeElement;
        this.modiferAttributeId = modifierAttributeId;
    }

    override onTick(parent: BaseObj, handler: StatusEffectHandler) {
        super.onTick(parent, handler);

        let amount = this.hpPerTick;
        const sourceObj = ServerBaseObjRegistry.getObjFrom(handler.sourceData);
        if (sourceObj) {
            amount = sourceObj.attributes.multiplyAmount(amount, parent.health.maxHp, this.changeScheme, sourceObj, this.modiferAttributeId);
        }

        parent.health.applyDamage({
            changeData: {
                ...EventData.CHANGE_DATA_DEFAULT,
                amount: amount,
                changeScheme: this.changeScheme,
                changeElement: this.changeElement,
                targetScheme: TargetScheme.ALL_INCLUDING_OWNER,
            },
            sourceData: {
                ...handler.sourceData,
                pos: parent.getPos()
            }
        });
    }
}

export class AuraBehavior extends AOEApplyStatusEffectBehavior {
    override onTick(parent: BaseObj, handler: StatusEffectHandler) {
        super.onTick(parent, handler);
        this.applyEffect(parent, handler);
    }
}

export class GravityBehavior extends BaseStatusEffectBehavior {
    force: number;
    offset: Vec3;

    constructor(force: number = 10, offset: Vec3 = Vec3.zero) {
        super();

        this.force = force;
        this.offset = offset;
    }

    override onTick(parent: BaseObj, handler: StatusEffectHandler) {
        super.onTick(parent, handler);

        const parentPos = parent.getPos();
        const destPos = Vec3.add(handler.sourceData.pos, this.offset);
        const forceDir = Vec3.sub(destPos, parentPos).normalizeInPlace();

        parent.movement.applyForce({
            ...EventData.FORCE_DATA_WITH_SOURCE_DEFAULT,
            forceData: {
                ...EventData.FORCE_DATA_DEFAULT,
                forceType: EventData.ForceType.GRAVITY,
                force: this.force,
                forceDir: forceDir
            },
            sourceData: handler.sourceData
        });
    }
}

//** PLAYER STATE */
export class RemoveStatusOnActionBehavior extends BaseStatusEffectBehavior {
    statusToRemove: StatusEffectId;

    constructor(statusToRemove: StatusEffectId) {
        super();
        this.statusToRemove = statusToRemove;
    }

    override onWeaponFired(parent: BaseObj, weapon: Entity, weaponId: WeaponId, handler: StatusEffectHandler) {
        super.onWeaponFired(parent, weapon, weaponId, handler);
        this.removeStatus(parent);
    }

    override onDamageTaken(parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) {
        super.onDamageTaken(parent, event, handler);
        this.removeStatus(parent);
    }

    override onDamageDealt(parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) {
        super.onDamageDealt(parent, target, event, handler);
        this.removeStatus(parent);
    }

    removeStatus(parent: BaseObj) {
        parent.statusEffects.removeEffect(this.statusToRemove);
    }
}

export class RemoveStatusOnDamageTakenBehavior extends BaseStatusEffectBehavior {
    statusToRemove: StatusEffectId;

    constructor(statusToRemove: StatusEffectId) {
        super();
        this.statusToRemove = statusToRemove;
    }

    override onDamageTaken(parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) {
        super.onDamageTaken(parent, event, handler);
        parent.statusEffects.removeEffect(this.statusToRemove);
    }
}

export class UpdatePlayerCapabilitiesBehavior extends BaseStatusEffectBehavior {
    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        parent.updateCapabilities();
    }

    override onRemove(parent: BaseObj, handler: StatusEffectHandler) {
        super.onRemove(parent, handler);
        parent.updateCapabilities();
    }

    override onComplete(parent: BaseObj, handler: StatusEffectHandler) {
        super.onComplete(parent, handler);
        parent.updateCapabilities();
    }
}

export class OnDamageTakenBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onDamageTaken(parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) {
        super.onDamageTaken(parent, event, handler);
        this.callback(parent, event, handler);
    }
}

export class OnDeathBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onDeath(parent: BaseObj, event: EventData.ChangeDataHitInfo, handler: StatusEffectHandler) {
        super.onDeath(parent, event, handler);
        this.callback(parent, event, handler);
    }
}

//** WEAPON BASED */
export class OnDamageDealtBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onDamageDealt(parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) {
        super.onDamageDealt(parent, target, event, handler);
        this.callback(parent, target, event, handler);
    }
}

export class OnKillBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onKill(parent: BaseObj, target: BaseObj, event: EventData.ChangeDataWithSource, handler: StatusEffectHandler) {
        super.onKill(parent, target, event, handler);
        this.callback(parent, target, event, handler);
    }
}

//** ABILITY BASED */
export class OnAbilityActivatedBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onAbilityActivated(parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) {
        this.callback(parent, abilityId, handler);
    }
}

export class OnAbilityDeactivatedBehavior extends BaseStatusEffectBehavior {
    callback: (parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) => void;

    constructor(callback: (parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) => void) {
        super();
        this.callback = callback;
    }

    override onAbilityDeactivated(parent: BaseObj, abilityId: AbilityId, handler: StatusEffectHandler) {
        this.callback(parent, abilityId, handler);
    }
}

export class DeactivateAbilityOnRemovedBehavior extends BaseStatusEffectBehavior {
    // TODO: Find a way to remove the slot requirement here
    constructor(protected abilityToStop: AbilityId, protected slot: number) {
        super();
    }

    onStackRemoved(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData) {
        super.onStackRemoved(parent, handler, sourceData);
        if (parent.gameplayObject instanceof Entity) {
            return;
        }
        parent.horizonApiProvider.sendNetworkBroadcastEvent(deactivateAbility, {
            player: parent.gameplayObject,
            abilitySlot: this.slot,
            abilityId: this.abilityToStop,
        });
    }
}

//** SHIELD */
export class ShieldBehavior extends BaseStatusEffectBehavior {
    maxShieldHp: number;

    constructor(maxShieldHp: number) {
        super();
        this.maxShieldHp = maxShieldHp;
    }

    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        parent.health.shieldMaxHp = this.maxShieldHp;
        parent.health.shieldHp = this.maxShieldHp;
    }

    override onRemove(parent: BaseObj, handler: StatusEffectHandler) {
        super.onRemove(parent, handler);
        parent.health.shieldHp = 0;
    }

    override onComplete(parent: BaseObj, handler: StatusEffectHandler) {
        super.onComplete(parent, handler);
        parent.health.shieldHp = 0;
    }
}

//** AGGRO */
export abstract class BaseAggroBehavior extends BaseStatusEffectBehavior {
    amount: number;
    radius: number;

    constructor(amount: number, radius: number) {
        super();
        this.amount = amount;
        this.radius = radius;
    }

    applyAggro(parent: BaseObj, handler: StatusEffectHandler) {
        applyAggro(parent, this.amount, parent.getPos(), this.radius, handler);
    }
}

export class AggroOnApplyBehavior extends BaseAggroBehavior {
    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        this.applyAggro(parent, handler);
    }
}

export class AggroOnTickBehavior extends BaseAggroBehavior {
    override onTick(parent: BaseObj, handler: StatusEffectHandler) {
        this.applyAggro(parent, handler);
    }
}

export class AggroOnRemoveBehavior extends BaseAggroBehavior {
    override onRemove(parent: BaseObj, handler: StatusEffectHandler) {
        this.applyAggro(parent, handler);
    }
}

export class AggroOnCompleteBehavior extends BaseAggroBehavior {
    override onComplete(parent: BaseObj, handler: StatusEffectHandler) {
        this.applyAggro(parent, handler);
    }
}


//** OTHER */
export class SelfDestructBehavior extends BaseStatusEffectBehavior {
    changeDataSplash: EventData.ChangeDataSplash;
    color = Color.white;
    explodeOnRemove = true;

    telegraphMap = new TelegraphMap();

    constructor(changeDataSplash: EventData.ChangeDataSplash, explodeOnRemove: boolean = true, color: Color = Color.white) {
        super();

        this.changeDataSplash = changeDataSplash;
        this.explodeOnRemove = explodeOnRemove;
        this.color = color;
    }

    override onApply(parent: BaseObj, handler: StatusEffectHandler, sourceData: SourceData | undefined = undefined): void {
        super.onApply(parent, handler);
        this.startTelegraph(parent);
    }

    override onRemove(parent: BaseObj, handler: StatusEffectHandler) {
        super.onRemove(parent, handler);

        this.stopTelegraph(parent);

        if (this.explodeOnRemove) {
            this.explode(parent, handler);
        }
    }

    override onComplete(parent: BaseObj, handler: StatusEffectHandler) {
        super.onComplete(parent, handler);
        this.stopTelegraph(parent);
        this.explode(parent, handler);
    }

    startTelegraph(parent: BaseObj) {
        const tracker = GlobalVFXBank.instance.radialTelegraphs.playRelativeToTarget(parent,
            ConstsObj.ObjTargetPart.FOOT,
            Vec3.zero, Quaternion.one,
            {
                radius: this.changeDataSplash.radius,
                color: Color.red
            });

        if (tracker) {
            this.telegraphMap.registerTracker(parent, tracker);
        }
    }

    stopTelegraph(parent: BaseObj) {
        const tracker = this.telegraphMap.getAndRemoveTracker(parent);
        if (tracker) {
            tracker.stop();
        }
    }

    explode(parent: BaseObj, handler: StatusEffectHandler) {
        const pos = parent.getPos();

        // rather than this
        parent.health.kill({
            ...EventData.CHANGE_DATA_HIT_INFO_DEFAULT,
            targetData: parent.getEventTargetData(),
            sourceData: {
                ...handler.sourceData,
                pos: pos
            }
        });

        GlobalVFXBank.instance.playExplosionAt(pos, this.changeDataSplash.radius, this.color);
        parent.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.handleSplashAction, {
            ...this.changeDataSplash,
            sourceData: {
                ...handler.sourceData,
                pos: pos
            }
        });
    }
}

//** UTILITY CLASSES AND FUNCTIONS */
export class TelegraphMap {
    map = new Map<EntityOrPlayer, VFXPoolTracker>();

    registerTracker(obj: BaseObj, tracker: VFXPoolTracker) {
        this.map.set(obj.gameplayObject, tracker);
    }

    hasTracker(obj: BaseObj) {
        return this.map.has(obj.gameplayObject);
    }

    getAndRemoveTracker(obj: BaseObj) {
        let tracker: VFXPoolTracker | undefined = undefined;
        tracker = this.map.get(obj.gameplayObject);
        this.map.delete(obj.gameplayObject);
        return tracker;
    }
}


export function applyAggro(parent: BaseObj, amount: number, pos: Vec3, radius: number, handler: StatusEffectHandler) {
    if (amount == 0 || radius < 0) {
        return;
    }

    parent.horizonApiProvider.sendNetworkBroadcastEvent(EventsNetworked.handleSplashAction, {
        ...EventData.CHANGE_DATA_SPLASH_DEFAULT,
        changeData: {
            ...EventData.CHANGE_DATA_SPLASH_DEFAULT.changeData,
            amount: amount,
            changeAction: EventData.ChangeAction.AGGRO
        },
        sourceData: {
            ...handler.sourceData,
            pos: pos
        },
        radius: radius
    });
}
