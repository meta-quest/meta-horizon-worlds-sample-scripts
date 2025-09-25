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

import { isSourceWorld } from 'ConstsAssetSourceWorld';
import { AUTO_AIM_DRAW_DEBUG_VISUAL, AUTO_TRIGGER_DRAW_DEBUG_VISUAL, DEBUG_DISABLE_AUTO_AIM, DEBUG_DISABLE_AUTO_TRIGGER } from 'ConstsDebugging';
import { WeaponId } from 'ConstsIdsWeapon';
import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import { AUTO_TRIGGER_VFX_COLOR, AUTO_TRIGGER_VFX_SCALE } from 'ConstsVFX';
import { AUTO_TRIGGER_HOVER_VISUAL_THRESHOLD_SECONDS, ScreensTargetingConfig, WeaponData } from 'ConstsWeapon';
import { drawDebugCircle, updateDebugCircle } from 'DebugDraw';
import { onCameraModeChanged, ReplicatedObjData } from 'EventsNetworked';
import { onFirePressed, onFireReleased, updateAutoAimTarget } from 'EventsPlayerControls';
import LocalCamera, { CameraMode } from 'horizon/camera';
import { AttachablePlayerAnchor, Color, Component, LayerType, Player, PlayerDeviceType, PropsFromDefinitions, PropTypes, RaycastTargetType, Vec3 } from 'horizon/core';
import { LocalPlayerComponent, ReplicatedObject } from 'LocalPlayerComponent';
import { ReplicatedObjSyncer } from 'ReplicatedObjSyncer';
import { getCameraFOVScaleFactor } from 'UtilsCamera';
import { playVFXForPlayer, setVFXParameter, setVFXParameters, stopVFXForPlayer } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { attachToPlayer, EntityOrUndefined, raycastIgnoreTags } from 'UtilsGameplay';
import { capsuleInCone, clamp01, DEGREES_TO_RADIANS, inverseLerp, lerp } from 'UtilsMath';

const FIRST_OBJECT_HIT_DISTANCE_TOLERANCE = 0.5;
const AVATAR_CAPSULE_RADIUS = .125;

type Target = {
    replicatedObject: ReplicatedObject
    gameplayObject: EntityOrPlayer
    directionTo: Vec3
    distanceTo: number
    dotProduct: number
}

export const PlayerAimProps = {
    raycast: {type: PropTypes.Entity},
    PA_autoTriggerAttachGroup: {type: PropTypes.Entity},
    PA_autoTriggerVFX: {type: PropTypes.Entity},
};
type Props = typeof PlayerAimProps;

export class PlayerAim extends LocalPlayerComponent<Props> {
    private weaponData?: WeaponData;
    private getOriginFunc?: () => Vec3;

    private autoAimTarget?: EntityOrPlayer;
    private autoAimTargetLastUpdatedPosition?: Vec3;

    private autoTriggerAcquiredTimer: number | undefined;
    private autoTriggerIsFiring = false;
    private autoTriggerTarget?: EntityOrPlayer;

    private autoAimDebugCircle: EntityOrUndefined;
    private autoTriggerDebugCircle: EntityOrUndefined;

    private isInSourceWorldCached?: boolean;

    constructor(hzObj: Component, owner: Player, props: PropsFromDefinitions<Props>, private deviceType: PlayerDeviceType, private replicatedObjectSyncer: ReplicatedObjSyncer) {
        super(hzObj, owner, props);
    }

    localPreStart() {
        this.hzObj.connectNetworkEvent(this.owner, onCameraModeChanged, (data) => this.updateAutoTriggerVFXScaleOnCameraModeChanged(data.cameraMode));
    }

    localStart() {
        if (!this.props.raycast) throw Error('Raycast not found on local player props');
        attachToPlayer(this.props.PA_autoTriggerAttachGroup, this.owner, AttachablePlayerAnchor.Head);
        UtilsGameplay.attachToPlayerOnCameraModeChanged(this.hzObj, this.props.PA_autoTriggerAttachGroup, this.owner, AttachablePlayerAnchor.Head);
    }

    localUpdate(deltaTimeSeconds: number) {
        if (!this.shouldLocalUpdate()) return;

        if (!this.ownerIsAlive()) {
            this.clearAutoAimTarget();
            this.disableAutoTrigger();
            return;
        }

        const targetingConfig = this.getScreensTargetingConfig(this.weaponData!);
        if (!targetingConfig.autoAimEnabled && !targetingConfig.autoTriggerEnabled) return;

        const allTargets = this.replicatedObjectSyncer.getAll();
        if (allTargets.length <= 0) return;

        const origin = LocalCamera.position.get();
        const forward = LocalCamera.forward.get();
        const maxTargetingAngle = Math.max(targetingConfig.autoAimAngle, targetingConfig.autoTriggerAngle);

        const localPlayer = this.replicatedObjectSyncer.getLocalPlayer();

        const targetsSortedByDotProduct = allTargets
            .map(object => this.convertToTarget(object, origin, forward))
            // This is a little weird that we're multi-filtering, but purposely doing cheaper filters first to cut down on network / bridge calls
            .filter(target => this.isValidCheap(localPlayer, origin, target, forward, targetingConfig.targetingActivationRangeMeters, maxTargetingAngle))
            .sort((aObject, bObject) => {
                const aDot = aObject.gameplayObject.position.get().sub(origin).normalizeInPlace().dot(forward);
                const bDot = bObject.gameplayObject.position.get().sub(origin).normalizeInPlace().dot(forward);

                return aDot > bDot ? -1 : 1;
            });

        const bestTarget = targetsSortedByDotProduct.find(target => this.isValidExpensive(localPlayer, origin, target));
        if (!bestTarget) {
            this.clearAutoAimTarget();
            this.disableAutoTrigger();
            return;
        }

        // AutoAim: Pulling reticle closer to target
        this.autoAim(bestTarget, origin, forward, targetingConfig);

        // AutoTrigger: This is responsible for firing
        this.autoTrigger(bestTarget, origin, forward, targetingConfig, deltaTimeSeconds);
    };

    localDispose() {
    }

    initialize(weaponData?: WeaponData, getOriginFunc?: () => Vec3) {
        this.weaponData = weaponData;
        this.getOriginFunc = getOriginFunc;
        this.initializeAutoTriggerVFXIfNeeded();
    }

    reset(weaponId: WeaponId) {
        if (this.weaponData?.id == weaponId) {
            this.weaponData = undefined;
            this.getOriginFunc = undefined;
        }
        this.disableAutoTrigger();
    }

    private shouldLocalUpdate() {
        return this.getOriginFunc != undefined && this.weaponData != undefined;
    }

    private ownerIsAlive() {
        return this.replicatedObjectSyncer.getLocalPlayer().isAlive;
    }

    private getScreensTargetingConfig(weaponData: WeaponData) {
        switch (this.deviceType) {
            case PlayerDeviceType.Mobile:
            case PlayerDeviceType.Desktop:
                return weaponData.screensTargetingConfig;
            default:
                throw Error('This should only be wired up for HWXS');
        }
    }

    private convertToTarget(replicatedObject: ReplicatedObject, origin: Vec3, forward: Vec3): Target {
        const gameplayObject = replicatedObject.gameplayObject;
        const targetPosition = gameplayObject.position.get();
        const directionTo = targetPosition.sub(origin).normalizeInPlace();
        return {
            replicatedObject: replicatedObject,
            gameplayObject: gameplayObject,
            directionTo: directionTo,
            distanceTo: targetPosition.distance(origin),
            dotProduct: directionTo.dot(forward),
        };
    }

    private isValidCheap(localPlayer: ReplicatedObjData, origin: Vec3, target: Target, forward: Vec3, targetingActivationRangeMeters: number, maxTargetingAngleDegrees: number) {
        if (this.owner == target.gameplayObject) return false;

        if (!this.shouldShootTarget(localPlayer, target.replicatedObject)) return false;

        if (target.distanceTo > targetingActivationRangeMeters) return false;

        // Checks to see if in the bounds of either feature's angles
        return this.isTargetCapsuleInAngle(target, origin, forward, maxTargetingAngleDegrees, targetingActivationRangeMeters);
    }

    private isTargetCapsuleInAngle(target: Target, origin: Vec3, forward: Vec3, maxTargetingAngleDegrees: number, targetingActivationRangeMeters: number) {
        let headOrPosition = target.gameplayObject.position.get();
        let footOrPosition = target.gameplayObject.position.get();
        if (target.gameplayObject instanceof Player) {
            headOrPosition = target.gameplayObject.head.position.get();
            footOrPosition = target.gameplayObject.foot.position.get();
        } else {
            // Entity
            const head = this.replicatedObjectSyncer.getTargetPart(target.gameplayObject, ObjTargetPart.HEAD);
            if (head) {
                headOrPosition = head.position.get();
            }

            const foot = this.replicatedObjectSyncer.getTargetPart(target.gameplayObject, ObjTargetPart.FOOT);
            if (foot) {
                footOrPosition = foot.position.get();
            }
        }
        return capsuleInCone(
            headOrPosition,
            footOrPosition,
            AVATAR_CAPSULE_RADIUS,
            origin,
            forward,
            maxTargetingAngleDegrees,
            targetingActivationRangeMeters,
        );
    }

    private shouldShootTarget(localPlayer: ReplicatedObjData, targetReplicatedObj: ReplicatedObject) {
        if (!targetReplicatedObj.canTakeDamage) return false;

        const ownerOnATeam = localPlayer.teamId != undefined;
        const targetOnATeam = targetReplicatedObj.teamId != undefined;
        const isOnSameTeam = localPlayer.teamId == targetReplicatedObj.teamId;

        if (this.isInSourceWorld()) {
            return !ownerOnATeam || !isOnSameTeam;
        }
        return targetOnATeam && ownerOnATeam && !isOnSameTeam;
    }

    private isValidExpensive(localPlayer: ReplicatedObjData, origin: Vec3, target: Target) {
        return this.hasLineOfSight(localPlayer, origin, target);
    }

    private hasLineOfSight(localPlayer: ReplicatedObjData, origin: Vec3, target: Target) {
        const firstObjectAlongDirToTarget = raycastIgnoreTags(
            this.props.raycast,
            origin,
            target.directionTo,
            target.distanceTo,
            ['weapon'],
            LayerType.Both,
        );
        if (!firstObjectAlongDirToTarget) return true;

        switch (firstObjectAlongDirToTarget.targetType) {
            case RaycastTargetType.Player:
                if (firstObjectAlongDirToTarget.target == target.gameplayObject) return true;

                // If you hit another player, if it's a player you could hit, do it.
                return this.shouldShootTarget(localPlayer, target.replicatedObject);

            case RaycastTargetType.Entity:
                if (firstObjectAlongDirToTarget.target == target.gameplayObject) return true;

                return target.distanceTo < firstObjectAlongDirToTarget.distance + FIRST_OBJECT_HIT_DISTANCE_TOLERANCE;
            default:
                return false;
        }
    }

    private setAutoAimTarget(origin: Vec3, targetingConfig: ScreensTargetingConfig, gameplayObject: EntityOrPlayer) {
        if (this.autoAimTarget == gameplayObject) return;

        this.autoAimTarget = gameplayObject;
        this.autoAimTargetLastUpdatedPosition = gameplayObject.position.get();
        const distanceFromTarget = this.autoAimTargetLastUpdatedPosition.distance(origin);
        this.owner.setAimAssistTarget(this.autoAimTarget,
            {
                assistanceStrength: this.getDynamicAssistanceStrength(targetingConfig, distanceFromTarget),
                targetSize: this.getDynamicTargetSize(targetingConfig, distanceFromTarget),
                noInputGracePeriod: 0.5,
            },
        );
    }

    private autoAim(bestTarget: Target, origin: Vec3, forward: Vec3, targetingConfig: ScreensTargetingConfig) {
        if (!targetingConfig.autoAimEnabled || this.isDebugDisabled(DEBUG_DISABLE_AUTO_AIM)) return;

        const isInAutoAimAngle = this.isTargetCapsuleInAngle(bestTarget, origin, forward, targetingConfig.autoAimAngle, targetingConfig.targetingActivationRangeMeters);

        if (AUTO_AIM_DRAW_DEBUG_VISUAL) {
            this.autoAimDebugCircle = this.drawDebugCircleAtReticle(this.autoAimDebugCircle, forward, targetingConfig.autoAimAngle, Color.blue);
        }

        if (isInAutoAimAngle) {
            this.setAutoAimTarget(origin, targetingConfig, bestTarget.gameplayObject);
        } else if (!isInAutoAimAngle && this.autoAimTarget != undefined) {
            this.clearAutoAimTarget();
        }
    }

    private clearAutoAimTarget() {
        if (this.autoAimTarget == undefined) return;

        this.autoAimTarget = undefined;
        this.autoAimTargetLastUpdatedPosition = undefined;
        this.owner.clearAimAssistTarget();
    }

    private getDynamicAssistanceStrength(targetingConfig: ScreensTargetingConfig, distanceFromTarget: number): number {
        const alpha = clamp01(inverseLerp(distanceFromTarget, targetingConfig.autoAimNearDistance, targetingConfig.autoAimFarDistance));
        return lerp(targetingConfig.autoAimNearAssistanceStrength, targetingConfig.autoAimFarAssistanceStrength, alpha);
    }

    private getDynamicTargetSize(targetingConfig: ScreensTargetingConfig, distanceFromTarget: number) {
        const alpha = clamp01(inverseLerp(distanceFromTarget, targetingConfig.autoAimNearDistance, targetingConfig.autoAimFarDistance));
        return lerp(targetingConfig.autoAimNearTargetSize, targetingConfig.autoAimFarTargetSize, alpha);
    }

    private autoTrigger(bestTarget: Target, origin: Vec3, forward: Vec3, targetingConfig: ScreensTargetingConfig, deltaTimeSeconds: number) {
        if (!targetingConfig.autoTriggerEnabled || this.isDebugDisabled(DEBUG_DISABLE_AUTO_TRIGGER)) return;

        const isInAutoTriggerAngle = this.isTargetCapsuleInAngle(bestTarget, origin, forward, targetingConfig.autoTriggerAngle, targetingConfig.targetingActivationRangeMeters);

        if (AUTO_TRIGGER_DRAW_DEBUG_VISUAL) {
            const color = isInAutoTriggerAngle ? Color.green : Color.red;
            this.autoTriggerDebugCircle = this.drawDebugCircleAtReticle(this.autoTriggerDebugCircle, forward, targetingConfig.autoTriggerAngle, color);
        }

        if (isInAutoTriggerAngle) {
            this.enableAutoTrigger(deltaTimeSeconds, bestTarget, targetingConfig);
        } else {
            this.disableAutoTrigger();
        }
    }

    private enableAutoTrigger(deltaTimeSeconds: number, bestTarget: Target, targetingConfig: ScreensTargetingConfig) {
        if (this.autoTriggerAcquiredTimer == undefined) {
            this.autoTriggerAcquiredTimer = 0;
            this.playAutoTriggerVFXIfNeeded(targetingConfig);
        } else {
            this.autoTriggerAcquiredTimer += deltaTimeSeconds;
        }

        const hasMetFireTimeRequirement = this.autoTriggerAcquiredTimer > targetingConfig.autoTriggerHoverDelayThresholdSeconds;
        if (!hasMetFireTimeRequirement) {
            return;
        }

        if (!this.autoTriggerIsFiring) {
            this.hzObj.sendLocalBroadcastEvent(onFirePressed, {autoAimTarget: bestTarget.gameplayObject});
            this.autoTriggerTarget = bestTarget.gameplayObject;
            this.autoTriggerIsFiring = true;
            return;
        }

        if (this.autoTriggerTarget != bestTarget.gameplayObject) {
            this.hzObj.sendLocalEvent(this.owner, updateAutoAimTarget, {autoAimTarget: bestTarget.gameplayObject});
            this.autoTriggerTarget = bestTarget.gameplayObject;
        }
    }

    private disableAutoTrigger(targetingConfig?: ScreensTargetingConfig) {
        if (this.autoTriggerIsFiring) {
            this.hzObj.sendLocalBroadcastEvent(onFireReleased, {});
            this.autoTriggerIsFiring = false;
            this.stopAutoTriggerVFXIfNeeded(targetingConfig);
        }

        this.autoTriggerTarget = undefined;
        this.autoTriggerAcquiredTimer = undefined;
    }

    private initializeAutoTriggerVFXIfNeeded() {
        if (!this.weaponData || this.weaponData.screensTargetingConfig.autoTriggerHoverDelayThresholdSeconds <= AUTO_TRIGGER_HOVER_VISUAL_THRESHOLD_SECONDS) {
            return;
        }

        setVFXParameters(this.props.PA_autoTriggerVFX, [
            ['life', this.weaponData.screensTargetingConfig.autoTriggerHoverDelayThresholdSeconds],
            ['color', AUTO_TRIGGER_VFX_COLOR],
        ]);
    }

    private updateAutoTriggerVFXScaleOnCameraModeChanged(cameraMode: CameraMode) {
        setVFXParameter(this.props.PA_autoTriggerVFX, 'radius', AUTO_TRIGGER_VFX_SCALE * getCameraFOVScaleFactor(cameraMode));
    }

    private playAutoTriggerVFXIfNeeded(targetingConfig: ScreensTargetingConfig) {
        if (targetingConfig.autoTriggerHoverDelayThresholdSeconds <= AUTO_TRIGGER_HOVER_VISUAL_THRESHOLD_SECONDS) {
            return;
        }

        playVFXForPlayer(this.props.PA_autoTriggerVFX, this.owner);
    }

    private stopAutoTriggerVFXIfNeeded(targetingConfig?: ScreensTargetingConfig) {
        if (!targetingConfig || targetingConfig.autoTriggerHoverDelayThresholdSeconds <= AUTO_TRIGGER_HOVER_VISUAL_THRESHOLD_SECONDS) {
            return;
        }

        stopVFXForPlayer(this.props.PA_autoTriggerVFX, this.owner);
    }

    private drawDebugCircleAtReticle(circle: EntityOrUndefined, forward: Vec3, angleDegrees: number, color: Color) {
        const cameraPos = LocalCamera.position.get();
        const cameraForward = LocalCamera.forward.get();
        const reticlePos = Vec3.add(cameraPos, Vec3.mul(forward, 0.2)); // HWXS_RETICLE_FIXED_DISTANCE is scalar value
        const distanceFromCamera = cameraPos.distance(reticlePos);
        const radius = distanceFromCamera * Math.tan(angleDegrees * DEGREES_TO_RADIANS) * 2; // needing to mul by 2 for some reason

        if (!circle) {
            return drawDebugCircle(reticlePos, cameraForward, radius, color);
        }
        updateDebugCircle(circle, reticlePos, cameraForward, radius, color);
        return circle;
    }

    private isDebugDisabled(debugProperty: boolean): boolean {
        return this.isInSourceWorld() && debugProperty;
    }

    private isInSourceWorld() {
        if (this.isInSourceWorldCached == undefined) {
            this.isInSourceWorldCached = isSourceWorld(this.hzObj.world);
        }
        return this.isInSourceWorldCached;
    }
}
