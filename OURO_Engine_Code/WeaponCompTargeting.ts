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
import * as ConstsWeapon from 'ConstsWeapon';
import * as Events from 'Events';
import LocalCamera, { CameraMode } from 'horizon/camera';
import { DEFAULT_CAMERA_SETTINGS } from 'ConstsCamera';
import { onCameraModeChanged, setReticleVisibility } from 'EventsNetworked';
import { Color, Component, Entity, Player, PlayerDeviceType, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { getCameraFOVScaleFactor } from 'UtilsCamera';
import { playVFXForPlayer, setVFXParameter, stopVFXForPlayer } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { getRayData, setPosRotScale, setText, setVisible } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { addIfExists } from 'UtilsTypescript';

const DYNAMIC_SCALE_FACTOR = 15.0;
const DYNAMIC_SCALE_MIN_SIZE = 1.0;

const HWXS_RETICLE_FIXED_DISTANCE_FROM_BARREL = 1.2;
/**Currently using a hard coded value for how far the raycast gizmo (barrel) is away from camera to derive a scale factor when distance changes (due to camera collisions)*/
const HACK_DISTANCE_FROM_BARREL_TO_CAMERA = 3.44;

const TRAJECTORY_STEP_COUNT = 3;
const TRAJECTORY_START_OFFSET: number = 0.3;


export class WeaponCompTargeting extends BaseWeaponComp<typeof WeaponCompTargeting> {
    static propsDefinition = {
        ...BaseWeaponComp.propsDefinition,
        targetingId: {type: PropTypes.Number, default: 0},

        raycastGizmo: {type: PropTypes.Entity},
        infoDisplay: {type: PropTypes.Entity},

        trajectoryIndicator1: {type: PropTypes.Entity},
        trajectoryIndicator2: {type: PropTypes.Entity},
        trajectoryIndicator3: {type: PropTypes.Entity},

        defaultColor: {type: PropTypes.Color, default: Color.white},
        disabledColor: {type: PropTypes.Color, default: Color.red},

        // baseReticleMesh - used on most weapons
        baseReticleMesh: {type: PropTypes.Entity},
        centerDotMesh: {type: PropTypes.Entity},
        // spreadReticleMesh - used for auto rifle and stun net
        spreadReticleMesh: {type: PropTypes.Entity},
        // used only on railgun and auto rifle for the thin line currently
        fixedReticleMesh: {type: PropTypes.Entity},

        disabledReticleMesh: {type: PropTypes.Entity},

        textDisplayGroup: {type: PropTypes.Entity},
        textDisplay: {type: PropTypes.Entity},

        autoAimVFX: {type: PropTypes.Entity},
        autoAimActivateVFX: {type: PropTypes.Entity},

        syncGroup: {type: PropTypes.Entity}, // lets you move something with the reticle

        isStunNet: {type: PropTypes.Boolean, default: false},

    };

    canFire: boolean = true;
    isVisible: boolean = false;
    currentColor: Color = Color.white;

    private trajectoryIndicators = new Set<Entity>;

    private targetingData = ConstsWeapon.WEAPON_DATA_DEFAULT.targetingData;
    private projectileData = ConstsWeapon.WEAPON_DATA_DEFAULT.projectileData;

    private meshes = new Set<Entity>;

    autoFireSpreadNormalized = 0;

    private cameraMode: CameraMode = DEFAULT_CAMERA_SETTINGS.cameraMode;

    override preStart() {
        this.isVisible = false;
        this.setIsVisible(this.isVisible);

        addIfExists(this.meshes, this.props.baseReticleMesh);
        addIfExists(this.meshes, this.props.centerDotMesh);
        addIfExists(this.meshes, this.props.spreadReticleMesh);
        addIfExists(this.meshes, this.props.fixedReticleMesh);

        if (this.targetingData.useCustomMeshSetup && this.deviceType == PlayerDeviceType.VR) {
            const globalScale = Vec3.one.mul(this.targetingData.reticleScaleVR);
            UtilsGameplay.setScale(this.props.baseReticleMesh, globalScale, true);
            UtilsGameplay.setScale(this.props.spreadReticleMesh, globalScale, true);
            UtilsGameplay.setScale(this.props.fixedReticleMesh, globalScale, true);
        }

        addIfExists(this.meshes, this.props.trajectoryIndicator1);
        addIfExists(this.meshes, this.props.trajectoryIndicator2);
        addIfExists(this.meshes, this.props.trajectoryIndicator3);

        this.meshes.forEach(mesh => {
            UtilsGameplay.setTrimeshTintBrightness(mesh, 1);
            UtilsGameplay.setTrimeshTintStrength(mesh, 1);
        });

        addIfExists(this.trajectoryIndicators, this.props.trajectoryIndicator1);
        addIfExists(this.trajectoryIndicators, this.props.trajectoryIndicator2);
        addIfExists(this.trajectoryIndicators, this.props.trajectoryIndicator3);

        this.setColor(this.props.defaultColor);

        super.preStart(); // call after populating arrays since preStart calls setOwner and setOwner transfers ownership of array contents

        UtilsGameplay.connectLocalEvent(this, this.entity, Events.setCanFire, (data) => this.setCanFire(data.canFire));

        UtilsGameplay.connectLocalEvent(this, this.entity, Events.setAutoFireSpread, (data) => {
            this.autoFireSpreadNormalized = data.spread * this.targetingData.autoFireReticleSpreadMultiplier;
        });

        UtilsGameplay.connectLocalEvent(this, this.entity, Events.setTargetingReticleText, (data) => {
            // console.log(`recieving setTargetingReticleText for ${this.owner.name.get()} and prop is [${this.props.infoDisplay ? this.props.infoDisplay.name.get() : 'undefined'}], visible[${data.text.length > 0}], text[${data.text}]`)
            setText(this.props.infoDisplay, data.text);
            setVisible(this.props.infoDisplay, data.text.length > 0);
        });

        UtilsGameplay.connectNetworkEvent(this, this.owner, onCameraModeChanged, (data) => this.cameraMode = data.cameraMode);
    }

    setOwner(player: Player) {
        super.setOwner(player);

        UtilsGameplay.setOwner(this.owner, this.props.raycastGizmo);

        UtilsGameplay.setVisibilityForPlayers(this.entity, [this.owner]);
        this.trajectoryIndicators.forEach(indicator => UtilsGameplay.setVisibilityForPlayers(indicator, [this.owner]));

        UtilsGameplay.setVisibilityForPlayers(this.props.textDisplayGroup, [this.owner]);
        setText(this.props.textDisplay, '');
        setText(this.props.infoDisplay, '');

        UtilsGameplay.setOwner(this.owner, this.props.textDisplayGroup);
        UtilsGameplay.setOwner(this.owner, this.props.textDisplay);
        UtilsGameplay.setOwner(this.owner, this.props.infoDisplay);

        this.setIsVisible(false);
        UtilsGameplay.setVisible(this.props.syncGroup, false);

        if (this.ownerIsPlayer) {
            this.connectNetworkEvent(this.owner, setReticleVisibility, (data) => {
                this.setIsVisible(data.visible && this.parentWeapon.isHeld);
            });
        }

        // Disable last reticle piece for Desktop / Mobile
        UtilsGameplay.setVisible(this.props.fixedReticleMesh, this.ownerIsPlayer && this.deviceType == PlayerDeviceType.VR);

        this.async.setTimeout(() => {
            // post ownership, transfer ownership of indicators
            this.trajectoryIndicators.forEach(indicator => UtilsGameplay.setOwner(this.owner, indicator));

            UtilsGameplay.setOwner(this.owner, this.props.syncGroup);
        }, 300);

    }

    override onWeaponDataChanged() {
        super.onWeaponDataChanged();
        if (this.parentWeapon.weaponData.targetingData.targetDetectionTargetId != this.props.targetingId) {
            this.setIsEnabled(false);
            return;
        }


        this.setIsEnabled(true);
        this.targetingData = this.parentWeapon.weaponData.targetingData;
        this.projectileData = this.parentWeapon.weaponData.projectileData;

        this.setColor(this.targetingData.defaultReticleColor);

        if (!this.targetingData.dynamicallyScaleReticle && !this.targetingData.useCustomMeshSetup) {
            const scale = this.targetingData.reticleScaleVR;
            UtilsGameplay.setScale(this.entity, new Vec3(scale, scale, 1), true);
        }

        UtilsGameplay.setText(this.props.textDisplay, this.targetingData.reticleTextDisplay);
    }

    onGrab(isRightHand: boolean) {
        if (this.isActiveTargetingComp()) {
            this.setIsVisible(true);
        }
    }

    onRelease() {
        if (this.isActiveTargetingComp()) {
            this.setIsVisible(false);
        }
    }

    onStartAttack() {
        if (!this.parentWeapon.isHeld) {
            this.setIsVisible(true);
            if (this.targetingData.shouldPositionSyncGroup) {
                UtilsGameplay.setVisible(this.props.syncGroup, true);
            }
        }
    }

    onStartHit() {
        if (!this.parentWeapon.isHeld) {
            this.setIsVisible(false);
        }
    }

    onStopAttack() {
        if (!this.parentWeapon.isHeld) {
            this.setIsVisible(false);
            if (this.targetingData.shouldPositionSyncGroup) {
                UtilsGameplay.setVisible(this.props.syncGroup, false);
            }
        }
    }

    isActiveTargetingComp() {
        return this.parentWeapon.weaponData.targetingData.targetDetectionTargetId == this.props.targetingId;
    }

    setIsVisible(visible: boolean) {
        if (this.isVisible == visible) {
            return;
        }

        this.isVisible = visible;

        if (this.isVisible && this.props.autoAimVFX) {
            playVFXForPlayer(this.props.autoAimVFX, this.owner);
            UtilsGameplay.setPos(this.props.autoAimActivateVFX, this.props.autoAimVFX.position.get());

        } else {
            stopVFXForPlayer(this.props.autoAimVFX, this.owner);
            playVFXForPlayer(this.props.autoAimActivateVFX, this.owner);
        }

        UtilsGameplay.setVisible(this.entity, visible);
        this.trajectoryIndicators.forEach(indicator => UtilsGameplay.setVisible(indicator, visible));
    }

    setCanFire(canFire: boolean) {
        this.canFire = canFire;
    }

    // refactored this, the standard reticle is the "projected" one. The amount of branching we had added was making a bit of a mess (apologies!)
    update(deltaTime: number) {
        if (!this.ownerIsPlayer) {
            return;
        }

        if (this.isVisible && this.isActiveTargetingComp()) {
            // use the projected reticle for VR or the stun net
            let projectedReticle = (this.deviceType == PlayerDeviceType.VR || this.targetingData.forceUseProjectedReticle);
            if (projectedReticle) {
                this.updateProjectedReticle(deltaTime);
            } else {
                this.updateCrossScreensReticle(deltaTime);
            }
        }
    }

    updateAutoFireReticle(normalizedDist: number) {
        if (!this.isActiveTargetingComp()) {
            return;
        }

        if (UtilsGameplay.exists(this.props.spreadReticleMesh)) {
            const autoFireRetScale = UtilsMath.lerp(0.2, 1.15, normalizedDist - 0.15);
            UtilsGameplay.setScale(this.props.spreadReticleMesh, Vec3.one.componentMul(new Vec3(autoFireRetScale, 1, autoFireRetScale)));
        }
        if (UtilsGameplay.exists(this.props.autoAimVFX)) {
            const autoFireRetScale = UtilsMath.lerp(1.3, 0, normalizedDist);
            setVFXParameter(this.props.autoAimVFX, 'targetingAmt', autoFireRetScale);
        }
    }

    setColor(c: Color) {
        if (c != this.currentColor) {
            this.currentColor = c;

            if (this.meshes.size > 0) {
                this.meshes.forEach(mesh => {
                    if (c.equals(this.props.defaultColor)) {
                        // disable tint when using default color to preserve the default mesh colors due to the way tech art built shader tint...
                        UtilsGameplay.setTrimeshTintStrength(mesh, 0);
                    } else {
                        UtilsGameplay.setTrimeshTintStrength(mesh, 1);
                        UtilsGameplay.setColor(mesh, c, true);
                    }
                });
            } else {
                UtilsGameplay.setColor(this.entity, c);
                this.trajectoryIndicators.forEach(indicator => UtilsGameplay.setColor(indicator, c));
            }
        }
    }

    updateCrossScreensReticle(deltaTime: number) {
        // Raycast is used here to get the tip of barrel but this is BAD because they're not always placed properly... We should make this better...
        if (!this.props.raycastGizmo) {
            console.error('Missing Raycast Gizmo');
            return;
        }

        const cameraPosition = LocalCamera.position.get();
        const cameraToBarrelDistance = this.props.raycastGizmo.position.get().sub(cameraPosition).magnitude() + HWXS_RETICLE_FIXED_DISTANCE_FROM_BARREL;
        const positionOffset = LocalCamera.forward.get().mul(cameraToBarrelDistance);
        const position = Vec3.add(cameraPosition, positionOffset);

        const cameraDistanceScaleFactor = cameraToBarrelDistance / HACK_DISTANCE_FROM_BARREL_TO_CAMERA;
        const scale = Vec3.one.mul(this.targetingData.reticleScaleXS * cameraDistanceScaleFactor * getCameraFOVScaleFactor(this.cameraMode));

        setPosRotScale(this.entity, position, LocalCamera.rotation.get(), scale, true);
        this.updateReticleColor();
    }

    updateProjectedReticle(deltaTime: number) {
        let rayData = getRayData(this.props.raycastGizmo, this.deviceType);
        if (!rayData) {
            return;
        }

        let speed = this.projectileData.projectileSpeedMetersPerSecond;
        let vel = rayData.forward.mul(speed);
        let gravity = this.projectileData.projectileGravity;
        let useTrajectoryCalculations = gravity != 0;

        let dist = this.targetingData.reticleMaxDist;
        let timeToDist = dist / speed;

        let hitResult = (useTrajectoryCalculations) ?
            this.getTrajectoryHitResult(rayData, vel, gravity, timeToDist) :
            UtilsGameplay.raycast(this.props.raycastGizmo, rayData.origin, rayData.forward, dist);

        // calculate final pos and rot
        let reticlePos: Vec3;
        if (hitResult) {
            reticlePos = hitResult.hitPoint.add(rayData.forward.mul(-this.targetingData.surfaceOffset));

            dist = Vec3.sub(hitResult.hitPoint, rayData.origin).magnitude() - this.targetingData.surfaceOffset;
            timeToDist = dist / speed;
        } else {
            reticlePos = (useTrajectoryCalculations) ?
                UtilsMath.calculatePositionOverTime(rayData.origin, vel, gravity, timeToDist * 0.95) :
                rayData.origin.add(rayData.forward.mul(dist));
        }
        reticlePos.y += this.targetingData.yOffset;

        let reticleRot =
            (this.targetingData.isGroundAOEIndicator) ?
                Quaternion.lookRotation(Vec3.down, rayData.forward) :
                (this.targetingData.reticleAlignToSurface && hitResult) ?
                    Quaternion.lookRotation(Vec3.mul(hitResult.normal, -1)) :
                    rayData.rot;

        this.updateReticleColor();
        this.updateTrajectoryIndicators(rayData, this.projectileData.projectileGravity, reticlePos, vel, timeToDist);

        if (this.targetingData.useCustomMeshSetup) {
            this.updateCustomMeshSetup(rayData, hitResult ? (hitResult.distance - this.targetingData.surfaceOffset) : dist, reticleRot, deltaTime);
        } else {
            this.updateReticleTransform(rayData, reticlePos, reticleRot);
        }

        this.updateSyncGroupTransform(reticlePos, reticleRot);
    }

    getTrajectoryHitResult(rayData: UtilsGameplay.RayData, vel: Vec3, gravity: number, timeToDist: number) {
        const indicatorStep = (1.0 - TRAJECTORY_START_OFFSET) / TRAJECTORY_STEP_COUNT;
        let lastTrajectoryPos = rayData.origin.clone();
        for (let i = 0; i < TRAJECTORY_STEP_COUNT + 1; ++i) {
            let t = TRAJECTORY_START_OFFSET + indicatorStep * i;
            let trajectoryPos = UtilsMath.calculatePositionOverTime(rayData.origin, vel, gravity, t * timeToDist);
            let trajectoryDir = Vec3.sub(trajectoryPos, lastTrajectoryPos);
            let trajectoryDist = trajectoryDir.magnitude();
            trajectoryDir.normalizeInPlace();
            let trajectoryResult = UtilsGameplay.raycast(this.props.raycastGizmo, lastTrajectoryPos, trajectoryDir, trajectoryDist);
            if (trajectoryResult) {
                return trajectoryResult; // hit something
            }
            lastTrajectoryPos = trajectoryPos;
        }
    }

    updateTrajectoryIndicators(rayData: UtilsGameplay.RayData, gravity: number, reticlePos: Vec3, vel: Vec3, timeToDist: number) {
        if (this.trajectoryIndicators.size == 0) return;

        const indicatorStep = (1.0 - TRAJECTORY_START_OFFSET) / this.trajectoryIndicators.size;
        let i = 0;
        this.trajectoryIndicators.forEach(indicator => {
            let t = TRAJECTORY_START_OFFSET + indicatorStep * i;
            if (gravity != 0) {
                UtilsGameplay.setPosRot(indicator, UtilsMath.calculatePositionOverTime(rayData.origin, vel, gravity, t * timeToDist), rayData.rot, true);
            } else {
                UtilsGameplay.setPosRot(indicator, Vec3.lerp(rayData.origin, reticlePos, t), rayData.rot, true);
            }
            i++;
        });
    }

    updateReticleColor() {
        this.setColor(this.canFire ? this.props.defaultColor : this.props.disabledColor);
    }

    updateReticleTransform(rayData: UtilsGameplay.RayData, reticlePos: Vec3, reticleRot: Quaternion) {
        if (this.targetingData.dynamicallyScaleReticle) {
            let dist = UtilsMath.dist(rayData.origin, reticlePos);
            let scale = Math.max(DYNAMIC_SCALE_MIN_SIZE, dist / DYNAMIC_SCALE_FACTOR);
            UtilsGameplay.setPosRotScale(this.entity, reticlePos, reticleRot, new Vec3(scale, scale, scale), true);
        } else {
            UtilsGameplay.setPosRot(this.entity, reticlePos, reticleRot, true);
        }
    }

    updateSyncGroupTransform(reticlePos: Vec3, reticleRot: Quaternion) {
        if (this.targetingData.shouldPositionSyncGroup && this.props.syncGroup) {
            const back = Quaternion.mulVec3(reticleRot, Vec3.backward);
            let dist = this.targetingData.maxSyncGroupDist;
            let syncPos = reticlePos;

            if (this.targetingData.syncGroupShouldRaycast) {
                const raycastOrigin = Vec3.add(reticlePos, Vec3.mul(back, this.targetingData.sycnGroupRaycastOffset));
                const syncPosRayResult = UtilsGameplay.raycast(this.props.raycastGizmo, raycastOrigin, back, this.targetingData.maxSyncGroupDist - this.targetingData.sycnGroupRaycastOffset);
                if (syncPosRayResult) {
                    dist = syncPosRayResult.distance - this.targetingData.syncGroupSurfaceOffset;
                }
            }

            syncPos.addInPlace(Vec3.mul(back, dist));
            UtilsGameplay.setPosRot(this.props.syncGroup, syncPos, reticleRot);
        }
    }

    updateCustomMeshSetup(rayData: UtilsGameplay.RayData, dist: number, rot: Quaternion, deltaTime: number) {
        const globalScale = this.targetingData.reticleScaleVR;
        const minScale = this.targetingData.reticleMinScaleVR;
        const distScale = Vec3.lerp(Vec3.one.mul(minScale), Vec3.one.mul(globalScale), dist / this.targetingData.reticleMaxDist);
        const lookRot = Quaternion.lookRotation(rayData.forward, Vec3.up);

        if (UtilsGameplay.exists(this.props.baseReticleMesh)) {
            const baseReticleDist = Math.max(Math.min(dist, this.targetingData.baseReticleDistMultiplier * this.targetingData.reticleMaxDist), this.targetingData.fixedReticleDist);
            const baseReticlePos = Vec3.add(rayData.origin, Vec3.mul(rayData.forward, baseReticleDist));

            if (this.targetingData.dynamicallyScaleReticle) {
                const scale = Math.max(DYNAMIC_SCALE_MIN_SIZE, dist / DYNAMIC_SCALE_FACTOR);
                UtilsGameplay.setPosRotScale(this.props.baseReticleMesh, baseReticlePos, rayData.rot, new Vec3(scale, scale, scale), true);
            } else {
                UtilsGameplay.setPosRotScale(this.props.baseReticleMesh, baseReticlePos, rot, distScale, true);
            }
        }

        if (UtilsGameplay.exists(this.props.spreadReticleMesh)) {

            if (!this.props.isStunNet) {
                const spreadReticleDist = Math.max(Math.min(dist, this.targetingData.spreadReticleDistMultiplier * this.targetingData.reticleMaxDist), this.targetingData.fixedReticleDist);
                const spreadReticlePos = Vec3.add(rayData.origin, Vec3.mul(rayData.forward, spreadReticleDist + this.targetingData.spreadReticleOffset));
                const spreadReticleScale = UtilsMath.lerp(globalScale, globalScale * this.targetingData.autoFireMaxScaleVR, this.autoFireSpreadNormalized);
                this.autoFireSpreadNormalized = this.autoFireSpreadNormalized > 0 ? (this.autoFireSpreadNormalized - deltaTime * 1.5) : 0;

                UtilsGameplay.setPosRotScale(this.props.spreadReticleMesh, spreadReticlePos, rot, distScale.mul(spreadReticleScale), true);
            }

        }

        if (UtilsGameplay.exists(this.props.fixedReticleMesh)) {
            const fixedReticlePos = Vec3.add(rayData.origin, Vec3.mul(rayData.forward, this.targetingData.fixedReticleDist));
            const scale = new Vec3(minScale, minScale, Math.min(dist / 2, globalScale));

            if (this.targetingData.fixedReticleUseFixedRotation) {
                UtilsGameplay.setPosRotScale(this.props.fixedReticleMesh, fixedReticlePos, lookRot, scale, true);
            } else {
                UtilsGameplay.setPosRotScale(this.props.fixedReticleMesh, fixedReticlePos, rot, scale, true);
            }
        }
    }
}

Component.register(WeaponCompTargeting);
