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

import { BaseHzComponent } from 'BaseHzComponent';
import { BaseObj, IBaseObjImplementation } from 'BaseObj';
import { BaseUITextLog, BaseUITextLogEntry, DEFAULT_ALIGNMENT_HORIZONTAL, LOG_ENTRIES_UNLIMITED, UITextLogEntryStatusEffect } from 'BaseUITextLog';
import { BaseWeakPoint, WEAK_POINT_TAG } from 'BaseWeakPoint';
import * as CompHealth from 'CompHealth';
import { ICompStatusEffectsListener } from 'CompStatusEffects';
import * as ConstsActor from 'ConstsActor';
import * as ConstsAttributes from 'ConstsAttributes';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import * as ConstsObj from 'ConstsObj';
import { ObjTargetPart } from 'ConstsObj';
import * as EventData from 'EventData';
import { ChangeDataHitInfo, getEntityOrPlayerOrThrow } from 'EventData';
import { killEncounterActor, onEncounterActorDeath } from 'EventsCrossWorld';
import { ReplicatedObjPartData } from 'EventsNetworked';
import { AudioGizmo, Color, Component, Entity, PhysicalEntity, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { TickBarUI } from 'TickBarUI';
import { playSFXForEveryone, playVFXForEveryone, playVFXForPlayer } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { getCachedLocalTransform } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';

const SPAWN_VOCALS_DELAY_MIN = 0;
const SPAWN_VOCALS_DELAY_MAX = 1;

export class BaseActor<T = typeof BaseActor> extends BaseHzComponent<typeof BaseActor & T>
    implements IBaseObjImplementation,
        CompHealth.IDamageExtraProvider,
        CompHealth.ICompHealthListener,
        ICompStatusEffectsListener {
    static propsDefinition = {
        ...BaseHzComponent.propsDefinition,
        showDebug: {type: PropTypes.Boolean, default: false},
        debugText: {type: PropTypes.Entity},
        debugLine: {type: PropTypes.Entity},

        selfInitializeInStart: {type: PropTypes.Boolean, default: false},

        actorId: {type: PropTypes.String, default: ''},

        characterModel: {type: PropTypes.Entity},

        healthBarContainer: {type: PropTypes.Entity},
        healthbar: {type: PropTypes.Entity},

        statusEffectUI: {type: PropTypes.Entity},

        meleeWeapon: {type: PropTypes.Entity},
        projectileWeapon: {type: PropTypes.Entity},

        head: {type: PropTypes.Entity},
        center: {type: PropTypes.Entity},
        feet: {type: PropTypes.Entity},

        criticalHitVFX: {type: PropTypes.Entity},
        hitGlowVFX: {type: PropTypes.Entity},

        deathSFX: {type: PropTypes.Entity},
        deathVFX: {type: PropTypes.Entity},

        spawnVocalsSFX: {type: PropTypes.Entity},
        spawnVocalsDelayMin: {type: PropTypes.Number, default: SPAWN_VOCALS_DELAY_MIN},
        spawnVocalsDelayMax: {type: PropTypes.Number, default: SPAWN_VOCALS_DELAY_MAX},
        spawnVocalsPitch: {type: PropTypes.Number, default: 0}
    };

    obj!: BaseObj;

    actorId = EventData.UNDEFINED_BIGINT;
    actorData = ConstsActor.ACTOR_DATA_DEFAULT;

    healthBar!: TickBarUI;

    weakPointDataMapping = new Map<number, ConstsActor.ActorWeakPointData>();
    weakPointHandlers: WeakPointHandler[] = [];

    statusContainerVisible = true;
    displayedHpBarPercent = 0.0;

    statusUIIsShowing = false;

    encounterEntity: Entity | undefined = undefined;

    scaleFactor = 1; // TODO: Check if this breaks weakpoint logic when the actor is scaled.. Note from Dio, while looking @ this code.

    debugLog!: BaseUITextLog;

    preStart() {
        super.preStart();
        this.debugLog = new BaseUITextLog(this, this.props.statusEffectUI, LOG_ENTRIES_UNLIMITED, DEFAULT_ALIGNMENT_HORIZONTAL, false);

        this.actorId = UtilsMath.hashString(this.props.actorId);

        this.connectLocalEvent(this.entity, killEncounterActor, () => {
            this.obj.health.kill();
        });

        this.connectLocalBroadcastEvent(World.onUpdate, data => this.onUpdate(data.deltaTime));

        const actorData = ConstsActor.ACTOR_DATA_REGISTRY.get(this.actorId);
        if (actorData) {
            this.actorData = actorData;
            this.actorData.weakPoints.forEach((value) => {
                this.weakPointDataMapping.set(value.id, value);
            });
        } else {
            console.warn('Unable to find ActorData for id: ' + this.props.actorId.toString());
        }

        const scale = this.entity.scale.get();
        this.scaleFactor = Math.max(scale.x, scale.y, scale.z);

        this.healthBar = new TickBarUI(this.props.healthbar);
        this.setHpBarPercent(1.0);

        this.obj = new BaseObj(this, this.entity);
        this.obj.implementation = this;
    }

    start() {
        this.props.spawnVocalsSFX?.as(AudioGizmo)?.pitch.set(this.props.spawnVocalsPitch);

        if (this.props.selfInitializeInStart) {
            this.initialize();
        }

        this.entity.children.get().forEach((value) => {
            const weakPointScripts = value.getComponents(BaseWeakPoint);
            const weakPoint = weakPointScripts.length > 0 ? weakPointScripts[0] : undefined;
            if (weakPoint && weakPoint.tags.has(WEAK_POINT_TAG)) {
                this.weakPointHandlers.push(new WeakPointHandler(this, weakPoint));
            }
        });
    };

    override getName() {
        return this.actorData.displayName;
    }

    getTargetPartPos(targetPart: ConstsObj.ObjTargetPart, localPos: boolean = false) {
        let pos: Vec3 | undefined = undefined;

        switch (targetPart) {
            case ConstsObj.ObjTargetPart.HEAD:
                pos = localPos ? getCachedLocalTransform(this.props.head)?.[0] : this.props.head?.position.get();
                break;
            case ConstsObj.ObjTargetPart.TORSO:
                pos = localPos ? getCachedLocalTransform(this.props.center)?.[0] : this.props.center?.position.get();
                break;
            case ConstsObj.ObjTargetPart.FOOT:
                pos = localPos ? Vec3.zero : this.entity.position.get();
                break;
        }

        return pos ? pos : this.entity.position.get();
    };

    getTargetPartRadius(targetPart: ConstsObj.ObjTargetPart) {
        let radius = this.actorData.bodyPartData.centerRadius;
        switch (targetPart) {
            case ConstsObj.ObjTargetPart.HEAD:
                if (this.actorData.bodyPartData.headRadius) {
                    radius = this.actorData.bodyPartData.headRadius;
                }
                break;
            case ConstsObj.ObjTargetPart.FOOT:
                if (this.actorData.bodyPartData.feetRadius) {
                    radius = this.actorData.bodyPartData.feetRadius;
                }
                break;
        }
        radius *= this.scaleFactor;
        return radius;
    }

    initialize() {
        // Health
        this.obj.health.damageExtraProvider = this;
        this.obj.health.listeners.push(this);

        // Attributes
        this.obj.attributes.setInitialAttributes(ConstsAttributes.ACTOR_ATTRIBUTES_DEFAULT);
        this.obj.attributes.setInitialAttributes(this.actorData.initialAttributeOverrides, false);

        // Status Effects
        this.obj.statusEffects.listeners.push(this);

        // Behavior
        this.obj.initializeComponents();

        this.onInitialized();
    }

    onInitialized(){
        // for child to implement
    }

    getActorId(): bigint | undefined {
        return this.actorId;
    }

    isInAOERange(origin: Vec3, radius: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined {
        if (targetPart == ConstsObj.ObjTargetPart.WEAKPOINT) {
            for (let i = 0; i < this.weakPointHandlers.length; ++i) {
                const handler = this.weakPointHandlers[i];
                if (handler.isActive) {
                    const weakPointPos = handler.weakPoint.entity.position.get();
                    const weakPointRadius = handler.radius;
                    if (UtilsMath.isSphereInSphere(weakPointPos, weakPointRadius, origin, radius)) {
                        let isInAngle = true;
                        if (handler.data.directionalAngle < 360) {
                            isInAngle = UtilsMath.isInAngle(origin, weakPointPos, handler.weakPoint.entity.forward.get(), handler.directionThresholdRadians);
                        }

                        if (isInAngle) {
                            return {
                                didHit: true,
                                hitPos: UtilsMath.getClosestPointInSphereTo(weakPointPos, origin, radius),
                                bodyPart: targetPart,
                                pos: weakPointPos,
                                radius: weakPointRadius,
                            };
                        }
                    }
                }
            }
            return;
        }

        const partPos = this.getTargetPartPos(targetPart);
        const partRadius = this.getTargetPartRadius(targetPart);
        if (partPos && UtilsMath.isSphereInSphere(partPos, partRadius, origin, radius)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointInSphereTo(partPos, origin, radius),
                bodyPart: targetPart,
                pos: partPos,
                radius: partRadius,
            };
        }
    }

    isInConeArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined {
        if (targetPart == ConstsObj.ObjTargetPart.WEAKPOINT) {
            for (let i = 0; i < this.weakPointHandlers.length; ++i) {
                const handler = this.weakPointHandlers[i];
                if (handler.isActive) {
                    const weakPointPos = handler.weakPoint.entity.position.get();
                    const weakPointRadius = handler.radius;
                    const isInCone = UtilsMath.isSphereInCone(weakPointPos, weakPointRadius, origin, dir, radius, dist);

                    if (isInCone) {
                        let isInAngle = true;
                        const linePoint = UtilsMath.getClosestPointOnLine(weakPointPos, origin, dir);
                        if (handler.data.directionalAngle < 360) {
                            isInAngle = UtilsMath.isInAngle(linePoint, weakPointPos, handler.weakPoint.entity.forward.get(), handler.directionThresholdRadians);
                        }

                        if (isInAngle) {
                            return {
                                didHit: true,
                                hitPos: linePoint,
                                bodyPart: targetPart,
                                pos: weakPointPos,
                                radius: weakPointRadius,
                            };
                        }
                    }
                }
            }
            return;
        }

        const partPos = this.getTargetPartPos(targetPart);
        const partRadius = this.getTargetPartRadius(targetPart);
        if (partPos && UtilsMath.isSphereInCone(partPos, partRadius, origin, dir, radius, dist)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointOnLine(partPos, origin, dir),
                bodyPart: targetPart,
                pos: partPos,
                radius: partRadius,
            };
        }
    }

    isInBeamArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined {
        if (targetPart == ConstsObj.ObjTargetPart.WEAKPOINT) {
            for (let i = 0; i < this.weakPointHandlers.length; ++i) {
                const handler = this.weakPointHandlers[i];
                if (handler.isActive) {
                    const weakPointPos = handler.weakPoint.entity.position.get();
                    const weakPointRadius = handler.radius;

                    const isInBeam = UtilsMath.isSphereInBeam(weakPointPos, weakPointRadius, origin, dir, radius, dist);
                    if (isInBeam) {
                        let isInAngle = true;
                        const linePoint = UtilsMath.getClosestPointOnLine(weakPointPos, origin, dir);
                        if (handler.data.directionalAngle < 360) {
                            isInAngle = UtilsMath.isInAngle(linePoint, weakPointPos, handler.weakPoint.entity.forward.get(), handler.directionThresholdRadians);
                        }

                        if (isInAngle) {
                            return {
                                didHit: true,
                                hitPos: linePoint,
                                bodyPart: targetPart,
                                pos: weakPointPos,
                                radius: weakPointRadius,
                            };
                        }
                    }
                }
            }
            return;
        }

        const partPos = this.getTargetPartPos(targetPart);
        const partRadius = this.getTargetPartRadius(targetPart);
        if (partPos && UtilsMath.isSphereInBeam(partPos, partRadius, origin, dir, radius, dist)) {
            return {
                didHit: true,
                hitPos: UtilsMath.getClosestPointOnLine(partPos, origin, dir),
                bodyPart: targetPart,
                pos: partPos,
                radius: partRadius,
            };
        }
    }

    getWeakPointData(id: number): ConstsActor.ActorWeakPointData | undefined {
        return this.weakPointDataMapping.get(id);
    }

    getMaterial(): ConstsObj.ObjMaterial {
        return this.actorData.material;
    }

    shouldShowDebug() {
        return this.props.showDebug;
    }

    setDebugText(text: string): void {
        UtilsGameplay.setText(this.props.debugText, text);
    }

    setDebugLine(start: Vec3, end: Vec3, color: Color): void {
        if (!this.props.debugLine) {
            return;
        }
        const dir = Vec3.sub(end, start);
        const scale = this.props.debugLine.scale.get();
        scale.z = dir.magnitude();
        UtilsGameplay.setPosRotScale(this.props.debugLine, Vec3.lerp(start, end, 0.5), Quaternion.lookRotation(dir), scale);
        UtilsGameplay.setTrimeshTintColor(this.props.debugLine, color);
    }

    setHpBarPercent(percent: number) {
        if (percent == this.displayedHpBarPercent) {
            return;
        }

        this.displayedHpBarPercent = percent;
        this.healthBar.setPercent(this.displayedHpBarPercent);
        this.updateStatusContainerVisibility();
    }

    updateStatusContainerVisibility() {
        const shouldShowStatusContainer = this.statusUIIsShowing || (this.displayedHpBarPercent > 0 && this.displayedHpBarPercent < 1.0);

        if (shouldShowStatusContainer == this.statusContainerVisible) {
            return;
        }
        this.statusContainerVisible = shouldShowStatusContainer;
        UtilsGameplay.setVisible(this.props.healthBarContainer, this.statusContainerVisible);
    }

    calculateDamageExtra(event: EventData.ChangeDataWithSource): CompHealth.DamageExtraResult {
        let finalDmgAmount = 0;
        let didHeadShot = false;
        let didHitWeakPoint = false;
        let weakPointId = 0;

        const hitPos = event.sourceData.targetRelativePos ? event.sourceData.targetRelativePos.add(this.entity.position.get()) : event.sourceData.pos;

        const headPos = this.getTargetPartPos(ConstsObj.ObjTargetPart.HEAD);
        if (headPos && UtilsMath.isInRange(headPos, hitPos, this.getTargetPartRadius(ConstsObj.ObjTargetPart.HEAD))) {
            const headShotDmg = event.changeData.headshotAmount ? event.changeData.headshotAmount : event.changeData.amount;
            finalDmgAmount += headShotDmg;
            didHeadShot = true;
        }

        this.weakPointHandlers.forEach((value) => {
            const result = value.onCalculateDamageExtra(event, hitPos);
            if (result && result.didHit) {
                didHitWeakPoint = true;
                weakPointId = value.data.id;
                finalDmgAmount += result.damage;
            }
        });

        if (!didHeadShot && !didHitWeakPoint) {
            finalDmgAmount += event.changeData.amount;
        }

        return {
            ...CompHealth.DAMAGE_EXTRA_RESULTS_DEFAULT,
            didHeadShot: didHeadShot,
            didHitWeakPoint: didHitWeakPoint,
            weakPointId: weakPointId,
            finalDmgAmount: Math.round(finalDmgAmount),
        };
    }

    calculateHealExtra(event: EventData.ChangeDataWithSource): number {
        return event.changeData.amount;
    }

    onDamageTaken(damageData:ChangeDataHitInfo) {
        if (damageData.isHeadshotHit) {
            playVFXForEveryone(this.props.criticalHitVFX);
        }

        const damager = getEntityOrPlayerOrThrow(damageData.sourceData);
        if (damager instanceof Player) {
            playVFXForPlayer(this.props.hitGlowVFX, damager);
        }
    }

    onHpChange(comp: CompHealth.CompHealth) {
        const percent = comp.getHpPercent();
        this.setHpBarPercent(percent);
    }

    onUnderShieldHpChange(comp: CompHealth.CompHealth): void {
        // TODO: provide feedback
    }

    onUnderShieldEvent(comp: CompHealth.CompHealth, eventId: CompHealth.UnderShieldEventId): void {
        // TODO: provide feeback
    }

    onDeath(comp: CompHealth.CompHealth, damageData: EventData.ChangeDataHitInfo) {
        if (damageData.isHeadshotHit) {
            this.entity.as(PhysicalEntity).zeroVelocity();
        }

        this.async.setTimeout(() => {
            this.obj.setVisibilityAndCollidability(false);
            this.debugLog.removeAll();

            const center = this.getTargetPartPos(ConstsObj.ObjTargetPart.TORSO);
            const pos = center ? center : this.entity.position.get();
            playVFXForEveryone(this.props.deathVFX, {position: pos});
            playSFXForEveryone(this.props.deathSFX, {position: pos});
        }, this.actorData.animData.deathAnimDuration * 1000);

        if (this.encounterEntity) {
            this.sendLocalEvent(this.encounterEntity, onEncounterActorDeath, {actor: this.entity});
        }

        this.obj.pushReplicatedObjDataForAllClients();
    }

    onRevive(comp: CompHealth.CompHealth) {
        // re-apply attributes
        this.obj.attributes.reset();

        this.weakPointHandlers.forEach((value) => {
            value.reset();
        });

        this.obj.setVisibilityAndCollidability(true);
        this.playSpawnVocals();

        this.obj.pushReplicatedObjDataForAllClients();
    }

    onUpdate(deltaTime: number) {
        if (!this.obj.health.isAlive) {
            return;
        }

        this.updateDebugLog();

        this.updateStatusEffectHandlers(deltaTime);
    }

    playSpawnVocals() {
        this.async.setTimeout(() => {
            const center = this.getTargetPartPos(ConstsObj.ObjTargetPart.HEAD);
            const pos = center ? center : this.entity.position.get();

            playSFXForEveryone(this.props.spawnVocalsSFX, {position: pos});
        }, UtilsMath.randomRange(this.props.spawnVocalsDelayMin, this.props.spawnVocalsDelayMax) * 1000);
    }

    //** ICompStatusEffectsListener */
    onStatusEffectApplied(statusEffectId: StatusEffectId): void {
        this.addToStatusEffectUI(statusEffectId);
    }

    onStatusEffectRemoved(statusEffectId: StatusEffectId): void {
        this.removeFromStatusEffectUI(statusEffectId);
    }

    onStatusEffectCompleted(statusEffectId: StatusEffectId): void {
        this.removeFromStatusEffectUI(statusEffectId);
    }

    addToStatusEffectUI(statusEffectId: StatusEffectId) {
        const statusEffectHandler = this.obj.statusEffects.getHandler(statusEffectId);
        if (statusEffectHandler && statusEffectHandler.effectData.showOnActorLog) {
            const existingStatusEffectEntries = this.debugLog.getBaseEntriesOfType(UITextLogEntryStatusEffect);

            if (existingStatusEffectEntries.length > 0) {
                if (existingStatusEffectEntries.filter((entry) => entry.statusEffectHandler == statusEffectHandler).length > 0) {
                    return;
                }
            }
            this.debugLog.add(new UITextLogEntryStatusEffect(statusEffectHandler, '250%'));
        }
    }

    removeFromStatusEffectUI(statusEffectId: StatusEffectId) {
        const existingStatusEffectEntries = this.debugLog.getBaseEntriesOfType(UITextLogEntryStatusEffect);
        if (existingStatusEffectEntries.length > 0) {
            existingStatusEffectEntries.filter((entry) => {
                if (entry.statusEffectHandler.effectData.id == statusEffectId) {
                    this.debugLog.remove(entry);
                }
            });
        }
    }

    protected updateStatusEffectHandlers(deltaTime: number) {
        this.obj.statusEffects.update(deltaTime);
    }

    // Debug UI
    debugLogEntry: BaseUITextLogEntry | undefined;

    addDebugLogEntry(text: string, priority: number = 0) {
        return this.debugLog.add(new BaseUITextLogEntry(text, Color.white, priority, -1));
    }

    updateDebugLog() {
        if (!this.obj.debugLogString) {
            return;
        }
        if (!this.debugLogEntry) {
            this.debugLogEntry = this.addDebugLogEntry(this.obj.debugLogString, -100);
        } else {
            this.debugLogEntry.text = this.obj.debugLogString;
        }
    }

    getTeamId(): number | undefined {
        return undefined;
    }

    getReplicatedObjPartsData(): ReplicatedObjPartData[] {
        return [
            {targetPart: ObjTargetPart.HEAD, entity: this.props.head ?? null},
            {targetPart: ObjTargetPart.TORSO, entity: this.props.center ?? null},
            {targetPart: ObjTargetPart.FOOT, entity: this.props.feet ?? null},
        ]
    }
}

Component.register(BaseActor);


const WEAK_POINT_RADIUS_LEEWAY = 0.1;

export class WeakPointHandler {
    parent: BaseActor;
    weakPoint: BaseWeakPoint;
    data: ConstsActor.ActorWeakPointData = ConstsActor.ACTOR_WEAKPOINT_DATA_DEFAULT;

    hp = 0;
    directionThresholdRadians = -1;
    isActive = true;

    radius: number;

    constructor(parent: BaseActor, weakPoint: BaseWeakPoint) {
        this.parent = parent;
        this.weakPoint = weakPoint;

        const data = this.parent.weakPointDataMapping.get(this.weakPoint.props.id);
        if (data) {
            this.data = data;
        } else {
            console.warn('Actor: ' + this.parent.getName() + ' - missing weakPoint: ' + this.weakPoint.props.id);
        }
        const scale = this.weakPoint.entity.transform.localScale.get();
        this.radius = this.data.radiusOverride ? this.data.radiusOverride : Math.max(scale.x, scale.y, scale.z) * 0.5;
        this.radius = this.radius * this.parent.scaleFactor + WEAK_POINT_RADIUS_LEEWAY;
        this.directionThresholdRadians = UtilsMath.DEGREES_TO_RADIANS * this.data.directionalAngle * 0.5;
        this.reset();
    }

    reset() {
        this.hp = this.data.hp;
        this.setActive(this.data.activeByDefault);
    }

    setActive(isActive: boolean) {
        this.isActive = isActive;
        if (this.isActive) {
            UtilsGameplay.setVisible(this.weakPoint.entity, this.data.isVisible);
            UtilsGameplay.setCollidable(this.weakPoint.entity, this.data.hasCollision);
        } else {
            UtilsGameplay.setVisibilityAndCollidable(this.weakPoint.entity, this.isActive);
        }
    }

    onCalculateDamageExtra(event: EventData.ChangeDataWithSource, hitPos: Vec3) {
        if (!this.isActive) {
            return;
        }

        let didHit = false;
        let damage = event.changeData.amount;

        if (this.data.hp <= 0 || this.hp > 0) {
            // weak point doesn't have HP and is always a valid target or does have HP and hasn't been destroyed
            const pos = this.weakPoint.entity.position.get();
            const isInRange = UtilsMath.isInRange(pos, hitPos, this.radius);
            let isInAngle = true;
            if (this.data.directionalAngle < 360) {
                isInAngle = UtilsMath.isInAngle(hitPos, pos, this.weakPoint.entity.forward.get(), this.directionThresholdRadians);
            }
            didHit = isInRange && isInAngle;
        }

        if (didHit) {
            let critMultiplier = 0;
            const damageSource = ServerBaseObjRegistry.getObjFrom(event.sourceData);
            if (damageSource) {
                critMultiplier += damageSource.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.DAMAGE_MULTIPLIER_WEAKPOINT_DAMAGE_PERCENT);
            }

            switch (this.data.additionalDamageMultiplierScheme) {
                case ConstsActor.WeakpointDamageMultiplierScheme.ADD_RAW:
                    critMultiplier += this.data.additionalDamageMultiplier;
                    break;
                case ConstsActor.WeakpointDamageMultiplierScheme.SCALE_SOURCE:
                    critMultiplier *= this.data.additionalDamageMultiplier;
                    break;
                case ConstsActor.WeakpointDamageMultiplierScheme.OVERRIDE:
                    critMultiplier = this.data.additionalDamageMultiplier;
                    break;
            }

            critMultiplier = Math.max(critMultiplier, 0);
            damage *= critMultiplier;

            if (this.data.hp > 0 && this.hp > 0) {
                this.hp -= damage;
                if (this.hp <= 0) {
                    this.onWeakPointDestroyed();
                }
            }
        }

        return {
            didHit: didHit,
            damage: damage,
        };
    }

    onWeakPointDestroyed() {
        this.setActive(false);

        // TODO custom weakpoint behavior / events

        this.data.onDestroyActiveWeakPoints.forEach((weakPointId) => {
            this.parent.weakPointHandlers.forEach((handler) => {
                if (handler.weakPoint.props.id == weakPointId) {
                    handler.setActive(true);
                }
            });
        });
    }
}
