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

import * as BaseObj from 'BaseObj';
import * as ConstsAttributes from 'ConstsAttributes';
import { AbilityId } from 'ConstsIdsAbility';
import { StatusEffectCategoryId, StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { EntityOrPlayer } from 'ConstsObj';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import * as ConstsWeapon from 'ConstsWeapon';
import * as EventData from 'EventData';
import { SOURCE_DATA_DEFAULT } from 'EventData';
import * as Events from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { Entity } from 'horizon/core';
import * as StatusEffectBehavior from 'StatusEffectBehavior';

export interface ICompStatusEffectsListener {
    onStatusEffectApplied(statusEffectId: StatusEffectId): void;

    onStatusEffectRemoved(statusEffectId: StatusEffectId): void;

    onStatusEffectCompleted(statusEffectId: StatusEffectId): void;
}

export class CompStatusEffects implements BaseObj.IObjectComponent {
    parent: BaseObj.BaseObj;

    activeEffects = new Map<StatusEffectId, StatusEffectHandler>();

    listeners: ICompStatusEffectsListener[] = [];

    constructor(parent: BaseObj.BaseObj) {
        this.parent = parent;
    }

    initialize() {
        // direct targeting
        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyStatusEffectFromWeapon, (data) => {
            this.applyStatusEffectsFromWeapon(data);
        });

        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyStatusEffect, (data) => {
            this.applyEffect(data.statusEffectId, data.duration, data.sourceData);
        });

        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.removeStatusEffect, (data) => {
            this.removeEffect(data.statusEffectId);
        });

        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.removeAllStatusEffectsOfCategory, (data) => {
            this.removeAllEffectsOfCategory(data.statusEffectCategoryId);
        });

        // general broadcasting
        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyStatusEffectFromWeapon, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.applyStatusEffectsFromWeapon(data);
            }
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyStatusEffect, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.applyEffect(data.statusEffectId, data.duration, data.sourceData);
            }
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.removeStatusEffect, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.removeEffect(data.statusEffectId);
            }
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.removeAllStatusEffectsOfCategory, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.removeAllEffectsOfCategory(data.statusEffectCategoryId);
            }
        })
    }

    reset(forceAll: boolean = false) {
        const effects = new Map(this.activeEffects); // create clone so we don't mutate while removing

        effects.forEach((value, key) => {
            if (forceAll || value.effectData.removeOnReset) {
                this.removeEffect(key);
            }
        });
    }

    hasAttributeMods(id: ConstsAttributes.AttributeId, scheme: ConstsAttributes.AttributeModScheme) {
        let hasMods = false;

        this.activeEffects.forEach((value) => {
            if (hasMods) {
                return; // returns from the foreach
            }
            hasMods = value.stackCount > 0 && value.effectData.attributeMods.hasAttributeMods(id, scheme);
        });

        return hasMods;
    }

    getAttributeMods(id: ConstsAttributes.AttributeId, scheme: ConstsAttributes.AttributeModScheme): number {
        let finalAmount = 0;
        this.forEachHandler((handler) => {
            if (handler.stackCount <= 0) {
                return; // skip if empty stack
            }

            switch (scheme) {
                case ConstsAttributes.AttributeModScheme.SET_TAKE_MAX:
                    finalAmount = Math.max(finalAmount, handler.effectData.attributeMods.getAttributeMods(id, scheme));
                    break;
                default:
                    let amount = handler.effectData.attributeMods.getAttributeMods(id, scheme);
                    switch (handler.effectData.stackAttributeModScheme) {
                        case ConstsStatusEffect.StatusEffectStackAttributeModScheme.COMPOUNDING:
                            amount *= handler.stackCount;
                            break;
                    }
                    finalAmount += amount;
                    break;
            }
        });

        return finalAmount;
    }

    hasStatusEffect(statusEffectId: StatusEffectId) {
        return this.activeEffects.has(statusEffectId);
    }

    addHandler(statusEffectId: StatusEffectId, handler: StatusEffectHandler) {
        this.activeEffects.set(statusEffectId, handler);
    }

    getHandler(statusEffectId: StatusEffectId) {
        return this.activeEffects.get(statusEffectId);
    }

    removeHandler(statusEffectId: StatusEffectId) {
        this.activeEffects.delete(statusEffectId);
    }

    applyEffect(statusEffectId: StatusEffectId, duration: number = -1, sourceData: EventData.SourceData = SOURCE_DATA_DEFAULT, stacks: number = 1) {
        const effectData = ConstsStatusEffect.STATUS_EFFECT_DATA_REGISTRY.get(statusEffectId);
        if (!effectData) {
            return;
        }

        if (!this.parent.health.isAlive && effectData.requiresAliveToApply) {
            return;
        }

        let handler: StatusEffectHandler;
        const existingHandler = this.getHandler(statusEffectId);

        if (existingHandler) {
            handler = existingHandler;
            handler.duration = duration;
            if (effectData.maxStacks > 0 && existingHandler.stackCount == effectData.maxStacks) {
                // TODO: Validate that its safe to early exit here. Reasoning is if we're at max stacks, we shouldn't be running applied logic since nothing changed. - Dio
                return;
            }
            handler.addStacks(stacks, sourceData);
        } else {
            handler = new StatusEffectHandler(effectData, this.parent, duration, sourceData, stacks);
            this.addHandler(statusEffectId, handler);
        }

        if (effectData.attributeMods.attributeMods.size > 0) {
            this.parent.attributes.updateSystems(effectData.attributeMods.attributeModsList);
        }

        effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
            value.onApply(this.parent, handler!, sourceData);
        });

        this.listeners.forEach((value) => {
            value.onStatusEffectApplied(statusEffectId);
        });

        this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onStatusEffectApplied, {
            targetData: this.parent.getEventTargetData(),
            statusEffectId: statusEffectId,
            duration: duration,
            sourceData: sourceData
        });

        if (duration == 0) {
            this.completeEffect(statusEffectId);
        }
    }

    removeEffect(statusEffectId: StatusEffectId, stacks: number = 1, sourceData?: EventData.SourceData) {
        const handler = this.getHandler(statusEffectId);
        if (handler) {
            handler.removeStacks(stacks, sourceData);
            handler.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
                value.onRemove(this.parent, handler);
            });

            if (handler.stackCount <= 0) {
                this.removeHandler(statusEffectId);

                handler.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
                    value.onRemove(this.parent, handler);
                });

                this.listeners.forEach((value) => {
                    value.onStatusEffectRemoved(statusEffectId);
                });

                this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onStatusEffectRemoved, {
                    targetData: this.parent.getEventTargetData(),
                    statusEffectId: statusEffectId,
                    sourceData: handler.sourceData
                });
            }
        }
    }

    removeAllEffectsOfCategory(categoryId: StatusEffectCategoryId) {
        const found = new Set<StatusEffectId>();
        this.forEachHandler((handler) => {
            if (handler.effectData.categoryId == categoryId) {
                found.add(handler.effectData.id);
            }
        });

        found.forEach((value) => {
            this.removeEffect(value);
        });
    }

    completeEffect(statusEffectId: StatusEffectId) {
        const handler = this.getHandler(statusEffectId);
        if (handler) {
            this.removeHandler(statusEffectId);

            handler.updateAttributeSystems();

            handler.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
                value.onComplete(this.parent, handler);
            });

            this.listeners.forEach((value) => {
                value.onStatusEffectCompleted(statusEffectId);
            });

            this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onStatusEffectCompleted, {
                targetData: this.parent.getEventTargetData(),
                statusEffectId: statusEffectId,
                sourceData: handler.sourceData
            });
        }
    }

    update(deltaTime: number) {
        const completed = new Set<StatusEffectId>();
        this.forEachHandler((handler) => {
            handler.update(deltaTime);
            if (handler.isComplete) {
                completed.add(handler.effectData.id);
            }
        });

        completed.forEach((value) => this.completeEffect(value));
    }

    private forEachHandler(action: (handler: StatusEffectHandler) => void) {
        this.activeEffects.forEach(handler => action(handler));
    }

    private forEachHandlerBehavior(func: (behavior: StatusEffectBehavior.BaseStatusEffectBehavior, handler: StatusEffectHandler) => void) {
        this.forEachHandler(handler => handler.effectData.behaviors.forEach(behavior => func(behavior, handler)));
    }

    onWeaponFired(weapon: Entity, weaponId: WeaponId) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onWeaponFired(this.parent, weapon, weaponId, handler));
    }

    onWeaponAmmoChanged(weapon: Entity, weaponId: WeaponId, currentAmmo: number) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onWeaponAmmoChanged(this.parent, weapon, weaponId, handler, currentAmmo));
    }

    onWeaponTargetAcquired(weapon: Entity, weaponId: WeaponId, target: EntityOrPlayer) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onWeaponTargetAcquired({parent: this.parent, weapon: weapon, weaponId: weaponId, handler: handler, target: target}));
    }

    onDamageTaken(event: EventData.ChangeDataHitInfo) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onDamageTaken(this.parent, event, handler));
    }

    onDeath(event: EventData.ChangeDataHitInfo) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onDeath(this.parent, event, handler));
    }

    onDamageDealt(target: BaseObj.BaseObj, event: EventData.ChangeDataWithSource) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onDamageDealt(this.parent, target, event, handler));
    }

    onKill(target: BaseObj.BaseObj, event: EventData.ChangeDataWithSource) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onKill(this.parent, target, event, handler));
    }

    onAbilityActivated(abilityId: AbilityId) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onAbilityActivated(this.parent, abilityId, handler));
    }

    onAbilityDeactivated(abilityId: AbilityId) {
        this.forEachHandlerBehavior((behavior, handler) => behavior.onAbilityDeactivated(this.parent, abilityId, handler));
    }

    applyStatusEffectsFromWeapon(event: EventData.ChangeDataWithSource) {
        const weaponData = ConstsWeapon.WEAPON_DATA_REGISTRY.get(event.sourceData.weaponId);
        if (weaponData) {
            let statusEffects = weaponData.projectileData.statusEffects;
            switch (event.changeData.changeType) {
                case EventData.ChangeType.MELEE:
                    statusEffects = weaponData.meleeData.statusEffects;
                    break;
            }

            statusEffects.forEach((value) => {
                this.parent.statusEffects.applyEffect(value.statusEffectId, value.duration, {
                    ...event.sourceData,
                    weaponId: ConstsWeapon.WEAPON_DATA_DEFAULT.id // clear weapon id, since the status effect is now the source
                });
            });
        }
    }
}


export class StatusEffectHandler {
    effectData: ConstsStatusEffect.StatusEffectData;
    timeCreated: number;

    originalDuration: number;
    duration: number;

    stackCount = 0;

    tickTimer: number = 0;

    isComplete: boolean = false;

    sourceData: EventData.SourceData;
    stackSourceData: EventData.SourceData[] = [];

    target: BaseObj.BaseObj;

    constructor(effectData: ConstsStatusEffect.StatusEffectData, target: BaseObj.BaseObj, duration: number, sourceData: EventData.SourceData, stacks: number = 1) {
        this.effectData = effectData;
        this.originalDuration = duration;
        this.duration = duration;
        this.sourceData = sourceData;
        // this.parent = parent;
        this.target = target;
        this.timeCreated = Date.now();

        this.addStacks(stacks, sourceData);
    }

    addStacks(stacks: number, sourceData: EventData.SourceData) {
        this.stackCount += stacks;
        const stacksExceededDefinedMax = this.effectData.maxStacks > 0 && this.stackCount > this.effectData.maxStacks;
        if (stacksExceededDefinedMax) {
            const excess = this.stackCount - this.effectData.maxStacks;
            this.stackSourceData.splice(0, excess);
            this.stackCount = this.effectData.maxStacks;
        }
        this.stackSourceData.push(...Array(stacks).fill(sourceData));

        this.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
            value.onStackAdded(this.target, this, sourceData);
        });

        this.onStackCountChange();
    }

    removeStacks(stacks: number, sourceData?: EventData.SourceData) {
        this.stackCount = Math.max(0, this.stackCount - stacks);

        if (sourceData) {
            const matchesToRemove = this.stackSourceData.filter((data) => data.obj == sourceData?.obj);
            matchesToRemove.length = stacks > matchesToRemove.length ? matchesToRemove.length : stacks;
            this.stackSourceData = this.stackSourceData.filter((data) => !matchesToRemove.includes(data));
        }

        this.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
            value.onStackRemoved(this.target, this, sourceData ? sourceData : this.stackSourceData.splice(0, stacks)[0]);
        });

        this.onStackCountChange();
    }

    onStackCountChange() {
        this.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
            value.onStackCountChange(this.target, this);
        });

        this.updateAttributeSystems();
    }

    update(deltaTime: number) {
        this.tickTimer += deltaTime;
        if (this.tickTimer >= this.effectData.tickRate) {
            this.tickTimer -= this.effectData.tickRate;
            this.effectData.behaviors.forEach((value: StatusEffectBehavior.BaseStatusEffectBehavior) => {
                value.onTick(this.target, this);
            });
        }

        if (this.duration > 0) {
            this.duration -= deltaTime;
            if (this.duration <= 0) {
                switch (this.effectData.stackRemovalScheme) {
                    case ConstsStatusEffect.StatusEffectStackRemovalScheme.REMOVE_1_ON_DURATION_COMPLETE:
                        this.removeStacks(1);
                        break;
                    case ConstsStatusEffect.StatusEffectStackRemovalScheme.REMOVE_ALL_ON_DURATION_COMPLETE:
                        this.removeStacks(this.stackCount);
                        break;
                }

                if (this.stackCount <= 0) {
                    this.isComplete = true;
                } else {
                    this.duration = this.originalDuration;
                }
            }
        }
    }

    updateAttributeSystems() {
        if (this.effectData.attributeMods.attributeMods.size > 0) {
            this.target.attributes.updateSystems(this.effectData.attributeMods.attributeModsList);
        }
    }
}
