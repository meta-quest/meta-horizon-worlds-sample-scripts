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


import { BaseWeaponComp } from 'BaseWeaponComp';
import { EntityOrPlayer } from 'ConstsObj';
import * as ConstsWeapon from 'ConstsWeapon';
import * as EventData from 'EventData';
import { AvatarGripPoseAnimationNames, CodeBlockEvents, Component, Entity, Player, PlayerDeviceType, PropTypes, Vec3 } from 'horizon/core';
import { playSFXForEveryone, playVFXForEveryone, stopVFXForEveryone } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';

export class WeaponCompMelee extends BaseWeaponComp<typeof WeaponCompMelee> {

    static propsDefinition = {
        ...BaseWeaponComp.propsDefinition,
        playerDamageTrigger: {type: PropTypes.Entity},
        damageTrigger: {type: PropTypes.Entity},

        startAttackSFX: {type: PropTypes.Entity},

        hitVFX: {type: PropTypes.Entity},
        hitSFX: {type: PropTypes.Entity},

        heldVFX: {type: PropTypes.Entity},

        abilityActivateVFX: {type: PropTypes.Entity},

        bladeContainer: {type: PropTypes.Entity},
    };

    private meleeData = ConstsWeapon.MELEE_DATA_DEFAULT;
    private lastEntityHitTime = new Map<Player | Entity, number>();
    private entitiesHitThisAttack: (Player | Entity)[] = [];
    private swingWeaponIntervalId?: number;

    override preStart() {
        super.preStart();
        this.connectPlayerHitEvents();
        this.connectEntityHitEvents();
    }

    private connectPlayerHitEvents() {
        if (!this.props.playerDamageTrigger) return;

        UtilsGameplay.connectCodeBlockEvent(this, this.props.playerDamageTrigger, CodeBlockEvents.OnPlayerEnterTrigger, (enteredBy) => {
            if (this.meleeData.targetScheme == EventData.TargetScheme.ENTITIES_ONLY) {
                return;
            }

            if (UtilsGameplay.playersEqual(this.parentWeapon.owner, enteredBy)) {
                return;
            }

            if (this.canApplyAction()) {
                this.applyHit(enteredBy);
            }
        });
    }

    private connectEntityHitEvents() {
        if (!this.props.damageTrigger) return;

        UtilsGameplay.connectCodeBlockEvent(this, this.props.damageTrigger, CodeBlockEvents.OnEntityEnterTrigger, (enteredBy) => {
            if (this.meleeData.targetScheme == EventData.TargetScheme.PLAYERS_ONLY) {
                return;
            }

            if (UtilsGameplay.entitiesEqual(this.parentWeapon.props.ownerObj, enteredBy)) {
                return;
            }

            const owner = enteredBy.owner.get();
            const targetObj = this.getCorrectTargetIfHitDummy(owner, enteredBy);

            if (this.canApplyAction()) {
                this.applyHit(targetObj);
            }
        });
    }

    override setOwner(player: Player) {
        super.setOwner(player);

        UtilsGameplay.setOwner(this.owner, this.props.damageTrigger);
        UtilsGameplay.setOwner(this.owner, this.props.playerDamageTrigger);
        UtilsGameplay.setOwner(this.owner, this.props.startAttackSFX);
        UtilsGameplay.setOwner(this.owner, this.props.hitVFX);
        UtilsGameplay.setOwner(this.owner, this.props.hitSFX);
        UtilsGameplay.setOwner(this.owner, this.props.heldVFX);
        UtilsGameplay.setOwner(this.owner, this.props.bladeContainer);
    }

    override onWeaponDataChanged() {
        super.onWeaponDataChanged();
        this.meleeData = this.parentWeapon.weaponData.meleeData;
    }

    override onFirePressed(target?: EntityOrPlayer) {
        if (this.owner.deviceType.get() != PlayerDeviceType.VR) {
            this.startSwingingWeapon();
        }
    }

    override onFireReleased() {
        if (this.owner.deviceType.get() != PlayerDeviceType.VR) {
            this.stopSwingingWeapon();
        }
    }

    private startSwingingWeapon() {
        UtilsGameplay.clearAsyncInterval(this, this.swingWeaponIntervalId);
        this.swingWeaponIntervalId = this.async.setInterval(() => {
            if (this.parentWeapon.isTriggerHeld) {
                this.swingWeapon();
            }
        }, this.meleeData.meleeAttackAnimationTimeMs);
        this.swingWeapon();
    }

    private swingWeapon() {
        this.async.setTimeout(() => playSFXForEveryone(this.props.startAttackSFX), 250);
        this.owner.playAvatarGripPoseAnimationByName(AvatarGripPoseAnimationNames.Fire);
    }

    private stopSwingingWeapon() {
        UtilsGameplay.clearAsyncInterval(this, this.swingWeaponIntervalId);
        this.swingWeaponIntervalId = undefined;
    }

    onStartAttack() {
        this.entitiesHitThisAttack.length = 0;
    }

    onStartHit() {
        if (!this.canApplyAction()) {
            return;
        }

        this.lastEntityHitTime.forEach((_, entity) => {
            this.applyHit(entity);
        });
    }

    private canBeHitByAttack(target: Player | Entity): boolean {
        const now = Date.now();
        const lastHitTime: number = this.lastEntityHitTime.get(target) ?? 0;
        const wasHitThisAttack: boolean = this.entitiesHitThisAttack.includes(target);
        const hitInterval = this.owner.deviceType.get() == PlayerDeviceType.VR ? this.meleeData.vrAttackIntervalMs : this.meleeData.meleeAttackAnimationTimeMs;
        const hitIsTooFrequent = now < (lastHitTime + hitInterval);
        return !wasHitThisAttack && !hitIsTooFrequent;
    }

    applyHit(target: Player | Entity) {
        if (!this.canBeHitByAttack(target)) {
            return;
        }

        this.applyAction(target);

        this.lastEntityHitTime.set(target, Date.now());
        if (!this.parentWeapon.ownerIsPlayer) {
            this.entitiesHitThisAttack.push(target);
        }
    }

    canApplyAction(): boolean {
        if (!this.parentWeapon.isEnabled) {
            return false;
        }

        if (this.parentWeapon.ownerIsPlayer) {
            if (!this.parentWeapon.isHeld) {
                return false;
            }
        } else if (!this.parentWeapon.hitActive) {
            return false;
        }

        return true;
    }

    doHitFeedback(pos: Vec3) {
        const hitPos = Vec3.lerp(this.entity.position.get(), pos, 0.25);
        playVFXForEveryone(this.props.hitVFX, {position: hitPos});
        playSFXForEveryone(this.props.hitSFX, {position: hitPos});
        return hitPos;
    }

    override applyAction(target: Player | Entity) {
        const targetPos = target.position.get();

        const hitPos = this.doHitFeedback(targetPos);
        const targetRelativePos = hitPos.sub(targetPos);

        if (this.meleeData.forceData.strength > 0 && this.meleeData.forceData.targets != EventData.TargetScheme.UNDEFINED) {
            const forceDir = Vec3.sub(targetPos, hitPos);
            if (this.meleeData.forceData.horizontalOnly) {
                forceDir.y = 0;
            }
            forceDir.normalizeInPlace();
            this.applyForce(target, this.meleeData.forceData.forceType, this.meleeData.forceData.strength, forceDir);
        }

        super.applyAction(target, this.meleeData, hitPos, targetRelativePos);
    }

    override onGrab(isRightHand: boolean) {
        this.props.bladeContainer?.visible.set(true);
        playVFXForEveryone(this.props.heldVFX);
    }

    override onRelease() {
        this.props.bladeContainer?.visible.set(false);
        stopVFXForEveryone(this.props.heldVFX);
        stopVFXForEveryone(this.props.abilityActivateVFX);
    }
}

Component.register(WeaponCompMelee);
