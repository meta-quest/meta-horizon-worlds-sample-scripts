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

import { ProjectileFiringPayload } from 'BaseWeapon';
import { BaseWeaponComp } from 'BaseWeaponComp';
import { debugLogProjectileHitEvents, debugShowObstructedTargetPartsVisual } from 'ConstsDebugging';
import { EntityOrPlayer } from 'ConstsObj';
import * as ConstsWeapon from 'ConstsWeapon';
import { getScreensTargetingConfig, ProjectileRicochetSourcePosition, ProjectileShape } from 'ConstsWeapon';
import { drawDebugLine } from 'DebugDraw';
import * as EventData from 'EventData';
import { startAttack, startHit, stopAttack, stopHit } from 'EventsNetworked';
import { queueFrameDistributedExecution } from 'FrameDistributor';
import LocalCamera from 'horizon/camera';
import { CodeBlockEvents, Color, Component, Entity, Player, PlayerDeviceType, ProjectileLauncherGizmo, PropTypes, Quaternion, RaycastTargetType, Vec3 } from 'horizon/core';
import { LocalAim, LocalPlayerActorVelocities, LocalReplicatedObjSyncer } from 'LocalPlayer';
import { logEx } from 'UtilsConsoleEx';
import { ColorWithAlpha, GameFX, gameFXExistsAny, playGameFX, playGameFXAt, playSFXForEveryone, playVFXForEveryone, setOwnerGameFX, setVFXParameter, setVFXParameters, stopGameFX } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { getRayHitObjectName, raycastIgnoreAncestorTags, toStringSafe } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { chooseFromWeightedValues } from 'UtilsMath';
import { getDebugName } from 'UtilsObj';
import { pushIfExists } from 'UtilsTypescript';

// This is an arbitrary color that we set on all of the projectiles. This is load bearing for now, since the projectile launcher lazy initializes once the first property is set
export const ARBITRARY_COLOR = new Color(0.10, 0.69, 0.05);

export class WeaponCompProjectile extends BaseWeaponComp<typeof WeaponCompProjectile> {
    static propsDefinition = {
        ...BaseWeaponComp.propsDefinition,
        projectileId: {type: PropTypes.Number, default: 0},

        localPosRef: {type: PropTypes.Entity},
        directionRef: {type: PropTypes.Entity},

        rayCast: {type: PropTypes.Entity},

        warningVFX: {type: PropTypes.Entity},
        warningSFX_all: {type: PropTypes.Entity},
        warningSFX_player: {type: PropTypes.Entity},
        warningSFX_other: {type: PropTypes.Entity},

        fireVFX: {type: PropTypes.Entity},
        fireSFX_all: {type: PropTypes.Entity},
        fireSFX_player: {type: PropTypes.Entity},
        fireSFX_other: {type: PropTypes.Entity},

        fireTailDefaultDelay: {type: PropTypes.Number, default: 0},
        fireTailDefaultSFX_all: {type: PropTypes.Entity},
        fireTailDefaultSFX_player: {type: PropTypes.Entity},
        fireTailDefaultSFX_other: {type: PropTypes.Entity},

        fireTailIndoorDelay: {type: PropTypes.Number, default: 0},
        fireTailIndoorSFX_all: {type: PropTypes.Entity},
        fireTailIndoorSFX_player: {type: PropTypes.Entity},
        fireTailIndoorSFX_other: {type: PropTypes.Entity},

        hitVFX_useOneShot: {type: PropTypes.Boolean, default: false},
        hitVFX_id_radius: {type: PropTypes.String, default: ''},
        hitVFX_id_radius_core: {type: PropTypes.String, default: ''},

        hitVFX_id_color: {type: PropTypes.String, default: ''},

        hitVFX: {type: PropTypes.Entity},
        hitSFX_all: {type: PropTypes.Entity},
        hitSFX_player: {type: PropTypes.Entity},
        hitSFX_other: {type: PropTypes.Entity},

        hitMidAirVFX: {type: PropTypes.Entity},
        hitMidAirSFX_all: {type: PropTypes.Entity},
        hitMidAirSFX_player: {type: PropTypes.Entity},
        hitMidAirSFX_other: {type: PropTypes.Entity},

        hitTailSFX1: {type: PropTypes.Entity},
        hitTailSFX2: {type: PropTypes.Entity},
        hitTailSFX3: {type: PropTypes.Entity},
        hitTailSFX4: {type: PropTypes.Entity},
        hitTailSFX5: {type: PropTypes.Entity},

        beamStartVFX: {type: PropTypes.Entity},
        beamStartSFX_all: {type: PropTypes.Entity},
        beamStartSFX_player: {type: PropTypes.Entity},
        beamStartSFX_other: {type: PropTypes.Entity},

        beamActiveLoopVFX: {type: PropTypes.Entity},
        beamActiveLoopVFX_id_length: {type: PropTypes.String, default: ''},
        beamActiveLoopVFX_id_radius: {type: PropTypes.String, default: ''},
        beamActiveLoopVFX_id_color_inside: {type: PropTypes.String, default: ''},
        beamActiveLoopVFX_id_color_outside: {type: PropTypes.String, default: ''},
        beamActiveLoopSFX_all: {type: PropTypes.Entity},
        beamActiveLoopSFX_player: {type: PropTypes.Entity},
        beamActiveLoopSFX_other: {type: PropTypes.Entity},

        beamHitLoopVFX: {type: PropTypes.Entity},
        beamHitLoopSFX_all: {type: PropTypes.Entity},
        beamHitLoopSFX_player: {type: PropTypes.Entity},
        beamHitLoopSFX_other: {type: PropTypes.Entity},

        beamEndVFX: {type: PropTypes.Entity},
        beamEndSFX_all: {type: PropTypes.Entity},
        beamEndSFX_player: {type: PropTypes.Entity},
        beamEndSFX_other: {type: PropTypes.Entity},

        coneFireVFX: {type: PropTypes.Entity},
        coneFireVFX_id_length: {type: PropTypes.String, default: ''},
        coneFireVFX_id_radius: {type: PropTypes.String, default: ''},
        coneFireVFX_id_count: {type: PropTypes.String, default: ''},
        coneFireVFX_id_speed: {type: PropTypes.String, default: ''},
        coneFireVFX_id_color: {type: PropTypes.String, default: ''},

        pooledObj1: {type: PropTypes.Entity},
        pooledObj2: {type: PropTypes.Entity},
        pooledObj3: {type: PropTypes.Entity},

        isRicochetProjectileLauncher: {type: PropTypes.Boolean, default: false},
        ricochetFromProjectileLauncher: {type: PropTypes.Entity},
    };

    static INDOOR_DETECTION_RAYCAST_DIST: number = 10;

    static INDOOR_DETECTION_CHECK_THRESHOLD = 0.2;
    static SQR_INDOOR_DETECTION_CHECK_THRESHOLD = WeaponCompProjectile.INDOOR_DETECTION_CHECK_THRESHOLD * WeaponCompProjectile.INDOOR_DETECTION_CHECK_THRESHOLD;

    static HIT_VFX_NORMAL_OFFSET: number = 0.2;
    static HIT_SFX_PLAY_DIST_FILTER: number = 1;

    hitSFXPlayed = false;
    lastHitSFXPos = Vec3.zero;

    private hitTailSFXPool: Entity[] = [];
    currHitTrailSFXIndex = 0;

    isIndoor = false;
    lastIndoorCheckPos = Vec3.zero;

    projectileData: ConstsWeapon.ProjectileData = ConstsWeapon.WEAPON_DATA_DEFAULT.projectileData;

    beamDuration = 0.0;
    beamActionTimer = 0.0;
    beamIsHitting = false;

    serverId = 0;

    private pooledObjs: Entity[] = [];
    pooledObjIndex = 0;

    warningFX!: GameFX;
    fireFX!: GameFX;
    fireTailDefaultFX!: GameFX;
    fireTailIndoorFX!: GameFX;
    hitFX!: GameFX;
    hitMidAirFX!: GameFX;
    beamStartFX!: GameFX;
    beamActiveLoopFX!: GameFX;
    beamHitLoopFX!: GameFX;
    beamEndFX!: GameFX;

    gameFXs: GameFX[] = [];

    ricochetFromLastFirePosition = Vec3.zero;
    private debugLogProjectileHits = false;
    private debugShowAndLogObstructedTargetParts = false;

    override preStart() {
        this.setupGameFX();

        pushIfExists(this.hitTailSFXPool, this.props.hitTailSFX1);
        pushIfExists(this.hitTailSFXPool, this.props.hitTailSFX2);
        pushIfExists(this.hitTailSFXPool, this.props.hitTailSFX3);
        pushIfExists(this.hitTailSFXPool, this.props.hitTailSFX4);
        pushIfExists(this.hitTailSFXPool, this.props.hitTailSFX5);

        pushIfExists(this.pooledObjs, this.props.pooledObj1);
        pushIfExists(this.pooledObjs, this.props.pooledObj2);
        pushIfExists(this.pooledObjs, this.props.pooledObj3);

        super.preStart(); // call after populating arrays since preStart calls setOwner and setOwner transfers ownership of array contents

        this.serverId = this.world.getServerPlayer().id;

        if (this.props.localPosRef) {
            this.entity.transform.localPosition.set(this.props.localPosRef.transform.localPosition.get());
            this.entity.transform.localRotation.set(this.props.localPosRef.transform.localRotation.get());
        }

        this.pooledObjs.forEach((value) => UtilsGameplay.setVisibilityAndCollidable(value, false));

        this.connectHitEvents();
    }

    override start() {
        super.start();

        this.initializeRicochet();
        // This must happen after setOwner() is called (in preStart()) for this.props.ricochetFromProjectileLauncher
        this.connectRicochetEvents();
    }

    override setOwner(player: Player) {
        super.setOwner(player);

        UtilsGameplay.setOwner(this.owner, this.props.rayCast);
        UtilsGameplay.setOwner(this.owner, this.props.directionRef);

        this.gameFXs.forEach((value) => setOwnerGameFX(value, this.owner));
        this.hitTailSFXPool.forEach((value) => UtilsGameplay.setOwner(this.owner, value));
        this.pooledObjs.forEach((value) => UtilsGameplay.setOwner(this.owner, value));
        this.connectNetworkEvent(this.owner, debugLogProjectileHitEvents, (data) => {
            this.debugLogProjectileHits = data.shouldLog;
        });
        this.connectNetworkEvent(this.owner, debugShowObstructedTargetPartsVisual, (data) => {
            this.debugShowAndLogObstructedTargetParts = data.show;
        });
    }

    override onWeaponDataChanged() {
        super.onWeaponDataChanged();

        if (this.beamDuration > 0) {
            this.stopBeam();
        }

        this.projectileData = this.parentWeapon.weaponData.projectileData;
        this.setVFXProperties();
        if (this.parentWeapon.isHeld && this.ownerIsPlayer) {
            LocalAim().initialize(this.parentWeapon.weaponData, () => this.getFireOriginProperties().origin);
        }
    }

    onGrab(isRightHand: boolean) {
        if (!this.props.rayCast) return;

        const screensTargetingConfig = getScreensTargetingConfig(this.parentWeapon.weaponData, this.deviceType);
        if (!screensTargetingConfig) return;

        LocalAim().initialize(this.parentWeapon.weaponData, () => this.getFireOriginProperties().origin);
    }

    onRelease() {
        LocalAim().reset(this.parentWeapon.weaponData.id);
    }

    onDestroy() {
        LocalAim().reset(this.parentWeapon.weaponData.id);
    }

    onWeaponModifiersChanged() {
        this.setVFXProperties();
    }

    private getFiringPos() {
        return this.props.localPosRef ? this.props.localPosRef.position.get() : this.entity.position.get();
    }

    private getFiringForward() {
        if (this.deviceType == PlayerDeviceType.VR) {
            const dirRef = this.props.directionRef ? this.props.directionRef : this.parentWeapon.entity;
            return dirRef.forward.get();
        }

        return Vec3.sub(LocalCamera.lookAtPosition.get(), this.getFiringPos()).normalizeInPlace();
    }

    private getFiringUp() {
        if (this.deviceType == PlayerDeviceType.VR) {
            const dirRef = this.props.directionRef ? this.props.directionRef : this.parentWeapon.entity;
            return dirRef.up.get();
        }
        return LocalCamera.up.get();
    }

    /**Gets correct origin properties based on projectile shape. Should get refactored when we split out different the different types of comp projectiles.*/
    private getFireOriginProperties(): {origin: Vec3, forward: Vec3, unmodifiedOrigin: Vec3} {
        switch (this.projectileData.projectileShape) {
            case ProjectileShape.BEAM:
                return {origin: this.getFiringPos(), forward: this.getFiringForward(), unmodifiedOrigin: this.getFiringPos()};

            case ProjectileShape.CONE:
                if (this.deviceType == PlayerDeviceType.VR) {
                    return {origin: this.getFiringPos(), forward: this.getFiringForward(), unmodifiedOrigin: this.getFiringPos()};
                }

                const camPos = LocalCamera.position.get();
                const camForward = LocalCamera.forward.get();
                const projectedFirePos = UtilsMath.projectVec(Vec3.sub(this.getFiringPos(), camPos), camForward).addInPlace(camPos);
                return {origin: projectedFirePos, forward: camForward, unmodifiedOrigin: this.getFiringPos()};

            case ProjectileShape.PROJECTILE:
            //FALLTHROUGH
            default:
                return {origin: this.getFiringPos(), forward: this.getFiringForward(), unmodifiedOrigin: this.getFiringPos()};
        }
    }

    onFiredSuccess(projectileSettings: ProjectileFiringPayload) {
        if (!this.isEnabled || this.props.isRicochetProjectileLauncher || projectileSettings.projectileId != this.props.projectileId) {
            return;
        }

        this.hitSFXPlayed = false;

        switch (this.projectileData.projectileShape) {
            case ConstsWeapon.ProjectileShape.BEAM:
                this.startBeam();
                break;
            case ConstsWeapon.ProjectileShape.CONE:
                this.fireConeProjectile();
                break;
            default:
                if (this.projectileData.spreadPattern) {
                    this.fireSpreadProjectiles(projectileSettings);
                } else {
                    this.fireProjectileAt(projectileSettings);
                }
                break;
        }
    }

    private fireSpreadProjectiles(projectileSettings: ProjectileFiringPayload) {
        const spreadCount = projectileSettings.spreadCount ?? this.projectileData.spreadCount;
        const targetPosition = this.getUnobstructedBodyPartPosition(projectileSettings.autoAimTarget);
        const predictedTargetPosition = this.getPredictedTargetPosition(projectileSettings.autoAimTarget, targetPosition);
        const forward = predictedTargetPosition?.sub(this.getFiringPos()) ?? this.getFiringForward();
        const up = this.getFiringUp();
        const right = Vec3.cross(up, forward);
        const projectileDirections = this.projectileData.spreadPattern!.getSpread(spreadCount, forward, up, right);
        for (let i = 0; i < spreadCount; ++i) {
            this.fireProjectile(projectileDirections[i]);
        }
    }

    fireConeProjectile() {
        const fireValues = this.getFireOriginProperties();

        let vfxEndPos = Vec3.add(fireValues.origin, Vec3.mul(fireValues.forward, this.projectileData.range));

        if (UtilsGameplay.exists(this.props.rayCast)) {
            const hit = UtilsGameplay.raycast(this.props.rayCast, fireValues.origin, fireValues.forward, this.projectileData.range);
            if (hit && hit.hitPoint && hit.normal) {
                vfxEndPos = Vec3.add(hit.hitPoint, Vec3.mul(hit.normal, WeaponCompProjectile.HIT_VFX_NORMAL_OFFSET));
            }
        }

        this.doConeAction(fireValues.origin, fireValues.forward);
        this.playConeFX(fireValues.unmodifiedOrigin, vfxEndPos);
    }

    playConeFX(startPos: Vec3, endPos: Vec3) {
        // Scale the size of hitVFX and coneFireVFX to the distance to the hit.
        const dir = Vec3.sub(endPos, startPos);
        const magnitudePlayerToVfx = dir.magnitude();
        const distanceProportion = magnitudePlayerToVfx / this.projectileData.range;
        setVFXParameter(this.props.hitVFX, this.props.hitVFX_id_radius, this.projectileData.hitVFXRadius * this.parentWeapon.weaponModifiers.splashRadiusMultiplier * distanceProportion);
        setVFXParameter(this.props.coneFireVFX, this.props.coneFireVFX_id_length, magnitudePlayerToVfx);
        setVFXParameter(this.props.coneFireVFX, this.props.coneFireVFX_id_radius, this.projectileData.horizontalSpreadRadius * distanceProportion);

        if (this.deviceType != PlayerDeviceType.VR) {
            UtilsGameplay.setRot(this.props.coneFireVFX, Quaternion.lookRotation(dir));
        }

        this.playHitFeedback(endPos);
        playVFXForEveryone(this.props.coneFireVFX);
        playGameFX(this.fireFX, {player: this.owner});
        this.playTrailSFX();
    }

    private fireProjectileAt(projectileSettings: ProjectileFiringPayload) {
        const targetPosition = this.getUnobstructedBodyPartPosition(projectileSettings.autoAimTarget);
        const predictedTargetPosition = this.getPredictedTargetPosition(projectileSettings.autoAimTarget, targetPosition);
        this.fireProjectile(predictedTargetPosition?.sub(this.getFiringPos()));
    }

    private getUnobstructedBodyPartPosition(target?: EntityOrPlayer): Vec3 | undefined {
        if (!target) return undefined;

        const preferredPartId = chooseFromWeightedValues(this.parentWeapon.weaponData.targetingData.weightedBodyParts);
        const preferredPartPosition = LocalReplicatedObjSyncer().getTargetPartPos(target, preferredPartId);
        if (preferredPartPosition && this.hasLineOfSightToPart(target, preferredPartPosition)) {
            return preferredPartPosition;
        }

        const otherPartsPrioritized = Array.from(this.parentWeapon.weaponData.targetingData.weightedBodyParts)
            .sort((a, b) => b[1] - a[1])
            .map((weightedBodyPart) => weightedBodyPart[0])
            .filter((partId) => partId != preferredPartId);

        const validTargetPart = otherPartsPrioritized.find((partId) => {
            return this.hasLineOfSightToPart(target, LocalReplicatedObjSyncer().getTargetPartPos(target, partId));
        });

        return validTargetPart ? LocalReplicatedObjSyncer().getTargetPartPos(target, validTargetPart) : undefined;
    }

    private hasLineOfSightToPart(target: EntityOrPlayer, targetPartPosition?: Vec3): boolean {
        if (!targetPartPosition) return false;

        const firingPosition = this.getFiringPos();
        const targetPartPos = targetPartPosition;
        const rayDirection = firingPosition.sub(targetPartPos).normalizeInPlace();
        const rayDistance = firingPosition.distance(targetPartPos);
        const hit = raycastIgnoreAncestorTags(
            this.props.rayCast,
            targetPartPos,
            rayDirection,
            rayDistance,
            ['weapon', 'hittable'], 0.5,
        );

        const hitCorrectTarget = hit?.targetType != RaycastTargetType.Static && hit?.target == target;
        const hasLineOfSight = !hit || hitCorrectTarget;

        if (!hasLineOfSight && this.debugShowAndLogObstructedTargetParts) {
            drawDebugLine(targetPartPos, hit.hitPoint, Color.red, 10);
            logEx(`${getDebugName(this.owner)}'s ${this.parentWeapon.weaponData.displayName} does not have line of sight because it hit ${getRayHitObjectName(hit)}.`);
        }

        return hasLineOfSight;
    }

    private getPredictedTargetPosition(target?: EntityOrPlayer, targetPosition?: Vec3) {
        if (!target || !targetPosition) return;

        const timeToTarget = targetPosition.distance(this.getFiringPos()) / this.projectileData.projectileSpeedMetersPerSecond;
        const targetPointVelocity = LocalPlayerActorVelocities().getActorPointVelocity(target) ?? Vec3.zero;

        return targetPosition?.addInPlace(targetPointVelocity.mul(timeToTarget).mul(this.projectileData.predictionStrength));
    }


    private fireProjectile(projectileDir?: Vec3) {
        this.launchProjectileFromPositionDirection(this.getFiringPos(), projectileDir ?? this.getFiringForward());
        this.playFireProjectileGameFX();
    }

    private playFireProjectileGameFX(position?: Vec3) {
        queueFrameDistributedExecution('PLAY_FX_DISCARDABLE', () => {
            if (position) playGameFXAt(this.fireFX, position, {player: this.owner});
            else playGameFX(this.fireFX, {player: this.owner});
            this.playTrailSFX();
        });
    }

    private launchProjectileFromPositionDirection(startPosition: Vec3, direction: Vec3) {
        queueFrameDistributedExecution('PL_Launch', () => {
            const projectileLauncher = this.entity.as(ProjectileLauncherGizmo);
            if (!projectileLauncher) throw Error(`No projectile launcher gizmo configured for ${this.entity.name.get()}[${this.entityId}]`);

            const speed = this.getProjectileSpeedMetersPerSecond();
            const rangeMeters = this.getProjectileRangeMeters();
            projectileLauncher.launch({
                speed: speed,
                duration: rangeMeters != 0 ? rangeMeters / speed : 0,
                overrideStartPositionAndDirection: {
                    startPosition,
                    direction
                }
            });
        });
    }

    playHitFeedback(pos: Vec3, normal?: Vec3, isMidAirHit?: boolean) {
        let rot = undefined;
        if (normal) {
            rot = Quaternion.lookRotation(normal);
        }

        let hitFX = this.hitFX;
        if (!normal || isMidAirHit) {
            hitFX = this.hitMidAirFX;
        }

        if (!this.hitSFXPlayed || !UtilsMath.isInRange(this.lastHitSFXPos, pos, WeaponCompProjectile.HIT_SFX_PLAY_DIST_FILTER)) {
            // play full fx
            this.hitSFXPlayed = true;
            this.lastHitSFXPos = pos;
            playGameFXAt(hitFX, pos, {player: this.owner, rot: rot, vfxProps: {oneShot: this.props.hitVFX_useOneShot}});
        } else {
            // just play vfx
            playVFXForEveryone(hitFX.allVFX, {position: pos, rotation: rot, oneShot: this.props.hitVFX_useOneShot});
        }

        const count = this.hitTailSFXPool.length;
        if (count > 0) {
            const hitTailSFX = this.hitTailSFXPool[this.currHitTrailSFXIndex];
            playSFXForEveryone(hitTailSFX, {position: pos});
            this.currHitTrailSFXIndex = (this.currHitTrailSFXIndex + 1) % count;
        }
    }

    playTrailSFX() {
        let indoorTailPlayed: boolean = false;
        if (gameFXExistsAny(this.fireTailIndoorFX) && UtilsGameplay.exists(this.props.rayCast)) {
            const indoorCheckOrigin = this.entity.position.get();
            const delta = Vec3.sub(indoorCheckOrigin, this.lastIndoorCheckPos);
            if (delta.magnitudeSquared() > WeaponCompProjectile.SQR_INDOOR_DETECTION_CHECK_THRESHOLD) {
                this.lastIndoorCheckPos = indoorCheckOrigin;

                indoorCheckOrigin.y += 1.0; // offset up to avoid case of the gun pointing downward, and raycast hitting the gun mesh
                const hit = UtilsGameplay.raycast(this.props.rayCast, indoorCheckOrigin, Vec3.up, WeaponCompProjectile.INDOOR_DETECTION_RAYCAST_DIST);
                this.isIndoor = !!hit;
            }

            if (this.isIndoor) {
                indoorTailPlayed = true;
                this.async.setTimeout(() => playGameFX(this.fireTailIndoorFX, {player: this.owner}), this.props.fireTailIndoorDelay * 1000);
            }
        }

        if (!indoorTailPlayed) {
            this.async.setTimeout(() => playGameFX(this.fireTailDefaultFX, {player: this.owner}), this.props.fireTailDefaultDelay * 1000);
        }
    }

    doSplashAction(origin: Vec3) {
        if (this.projectileData.changeType != EventData.ChangeType.AOE) {
            return;
        }

        this.applySplashAction(this.projectileData,
            origin,
            this.getSplashRadius().minRadius,
            this.getSplashRadius().radius,
            this.projectileData.aoeTargetSelectionData);
    }

    doBeamAction(origin: Vec3, dir: Vec3, range: number) {
        this.applyBeamAction(this.projectileData,
            origin,
            dir,
            this.projectileData.minBeamRadius,
            this.projectileData.beamRadius,
            range,
            this.projectileData.aoeTargetSelectionData);
    }

    doConeAction(origin: Vec3, dir: Vec3) {
        this.applyConeAction(this.projectileData,
            origin,
            dir,
            this.projectileData.minSpreadRadius,
            this.projectileData.horizontalSpreadRadius,
            this.projectileData.range,
            this.projectileData.aoeTargetSelectionData);
    }

    startBeam() {
        this.beamDuration = this.projectileData.beamDuration;
        this.beamActionTimer = 0.0;

        playGameFX(this.fireFX, {player: this.owner});

        this.playTrailSFX();

        this.beamIsHitting = false;
        playGameFX(this.beamStartFX, {player: this.owner});
        playGameFX(this.beamActiveLoopFX, {player: this.owner});
        this.updateBeam(0);
    }

    stopBeam() {
        this.beamDuration = 0;
        stopGameFX(this.beamHitLoopFX, this.owner, this);
        stopGameFX(this.beamActiveLoopFX, this.owner, this);
        playGameFX(this.beamEndFX, {player: this.owner});
    }

    update(deltaTime: number) {
        this.updateBeam(deltaTime);
    }

    updateBeam(deltaTime: number) {
        if (this.beamDuration > 0) {
            this.beamDuration -= deltaTime;

            const pos = this.getFiringPos();
            const forward = this.getFiringForward();

            let isHitting = false;

            let range = this.projectileData.range;
            let beamEnd = Vec3.add(pos, Vec3.mul(forward, range));
            if (!this.projectileData.beamIsPiercing && UtilsGameplay.exists(this.props.rayCast)) {
                const hit = UtilsGameplay.raycast(this.props.rayCast, pos, forward, this.projectileData.range);
                if (hit) {
                    range = hit.distance;
                    beamEnd = hit.hitPoint;//Vec3.add(hit.hitPoint, Vec3.mul(hit.normal, WeaponCompProjectile.HIT_VFX_NORMAL_OFFSET));
                    isHitting = true;
                }
            }

            setVFXParameter(this.props.beamActiveLoopVFX, this.props.beamActiveLoopVFX_id_length, range);

            this.beamActionTimer -= deltaTime;
            if (this.beamActionTimer <= 0) {
                this.beamActionTimer += this.projectileData.beamActionRate;

                this.doBeamAction(pos, forward, range);

                if (this.getSplashRadius().radius > 0) {
                    this.doSplashAction(beamEnd);
                }

                this.playHitFeedback(beamEnd);
            }

            if (isHitting) {
                UtilsGameplay.setPosRot(this.props.beamHitLoopVFX, beamEnd, Quaternion.lookRotation(forward));
            }

            if (isHitting != this.beamIsHitting) {
                this.beamIsHitting = isHitting;
                if (isHitting) {
                    playGameFX(this.beamHitLoopFX, {player: this.owner});
                } else {
                    stopGameFX(this.beamHitLoopFX, this.owner, this);
                }
            }

            if (this.beamDuration <= 0) {
                this.stopBeam();
            }
        }
    }

    getNextPooledObj() {
        if (this.pooledObjs.length == 0) {
            return;
        }
        const obj = this.pooledObjs[this.pooledObjIndex];
        this.pooledObjIndex = (this.pooledObjIndex + 1) % this.pooledObjs.length;

        return obj;
    }

    doObjectPlacementAction(position: Vec3, normal?: Vec3) {
        const pos = position.clone();
        if (normal) {
            pos.addInPlace(Vec3.mul(normal, this.projectileData.objectPlacementData.offset));
        }

        this.placePooledObj(pos,
            Quaternion.one,
            this.projectileData.objectPlacementData.hitStartDelay,
            this.projectileData.objectPlacementData.duration);
    }

    placePooledObj(pos: Vec3, rot: Quaternion, hitStartDelay: number, duration: number) {
        const obj = this.getNextPooledObj();
        if (!obj) {
            return;
        }

        UtilsGameplay.setPosRot(obj, pos, rot);
        UtilsGameplay.zeroVelocity(obj);
        UtilsGameplay.sendLocalEvent(this, obj, startAttack, {});
        this.async.setTimeout(() => {
            UtilsGameplay.sendLocalEvent(this, obj, startHit, {});
            this.async.setTimeout(() => {
                UtilsGameplay.sendLocalEvent(this, obj, stopHit, {});
                UtilsGameplay.sendLocalEvent(this, obj, stopAttack, {});
            }, duration * 1000);
        }, hitStartDelay * 1000);
        return obj;
    }

    private doForceAction(target: Player | Entity | undefined, hitPos: Vec3) {
        const data = this.projectileData.forceData;

        if (data.targets == EventData.TargetScheme.UNDEFINED || data.strength == 0) {
            return;
        }

        if (target && data.radius == 0) { // If radius is 0, don't try to handle splash and send applyForce directly.
            //console.log("S: do force is applying force directly");
            const dir = Vec3.sub(target.position.get(), hitPos);
            if (data.horizontalOnly) {
                dir.y = 0;
            }
            dir.normalizeInPlace();
            this.applyForce(target, data.forceType, data.strength, dir);
            return;
        }

        this.handleSplashForce(data.targets, hitPos, data.forceType, data.strength, data.radius, data.horizontalOnly);
    }

    private setupGameFX() {
        this.warningFX = {
            allVFX: this.props.warningVFX,
            allSFX: this.props.warningSFX_all,
            playerSFX: this.props.warningSFX_player,
            otherSFX: this.props.warningSFX_other,
        };
        this.gameFXs.push(this.warningFX);

        this.fireFX = {
            allVFX: this.props.fireVFX,
            allSFX: this.props.fireSFX_all,
            playerSFX: this.props.fireSFX_player,
            otherSFX: this.props.fireSFX_other,
        };
        this.gameFXs.push(this.fireFX);

        this.fireTailDefaultFX = {
            allSFX: this.props.fireTailDefaultSFX_all,
            playerSFX: this.props.fireTailDefaultSFX_player,
            otherSFX: this.props.fireTailDefaultSFX_other,
        };
        this.gameFXs.push(this.fireTailDefaultFX);

        this.fireTailIndoorFX = {
            allSFX: this.props.fireTailIndoorSFX_all,
            playerSFX: this.props.fireTailIndoorSFX_player,
            otherSFX: this.props.fireTailIndoorSFX_other,
        };
        this.gameFXs.push(this.fireTailIndoorFX);

        this.hitFX = {
            allVFX: this.props.hitVFX,
            allSFX: this.props.hitSFX_all,
            playerSFX: this.props.hitSFX_player,
            otherSFX: this.props.hitSFX_other,
        };
        this.gameFXs.push(this.hitFX);

        this.hitMidAirFX = {
            allVFX: this.props.hitMidAirVFX ?? this.props.hitVFX,
            allSFX: this.props.hitMidAirSFX_all ?? this.props.hitSFX_all,
            playerSFX: this.props.hitMidAirSFX_player ?? this.props.hitSFX_player,
            otherSFX: this.props.hitMidAirSFX_other ?? this.props.hitSFX_player,
        };
        this.gameFXs.push(this.hitMidAirFX);

        this.beamStartFX = {
            allVFX: this.props.beamStartVFX,
            allSFX: this.props.beamStartSFX_all,
            playerSFX: this.props.beamStartSFX_player,
            otherSFX: this.props.beamStartSFX_other,
        };
        this.gameFXs.push(this.beamStartFX);

        this.beamActiveLoopFX = {
            allVFX: this.props.beamActiveLoopVFX,
            allSFX: this.props.beamActiveLoopSFX_all,
            playerSFX: this.props.beamActiveLoopSFX_player,
            otherSFX: this.props.beamActiveLoopSFX_other,
        };
        this.gameFXs.push(this.beamActiveLoopFX);

        this.beamHitLoopFX = {
            allVFX: this.props.beamHitLoopVFX,
            allSFX: this.props.beamHitLoopSFX_all,
            playerSFX: this.props.beamHitLoopSFX_player,
            otherSFX: this.props.beamHitLoopSFX_other,
        };
        this.gameFXs.push(this.beamHitLoopFX);

        this.beamEndFX = {
            allVFX: this.props.beamEndVFX,
            allSFX: this.props.beamEndSFX_all,
            playerSFX: this.props.beamEndSFX_player,
            otherSFX: this.props.beamEndSFX_other,
        };
        this.gameFXs.push(this.beamEndFX);
    }

    private connectHitEvents() {
        UtilsGameplay.connectCodeBlockEvent(this, this.entity, CodeBlockEvents.OnProjectileHitEntity,
            (entityHit: Entity, position: Vec3, normal: Vec3, isStaticHit: boolean) => {
                if (this.debugLogProjectileHits) logEx(`${this.parentWeapon.getName()}: projectile hit ${toStringSafe(entityHit)}. isStaticHit(${isStaticHit})`);
                if (isStaticHit) {
                    this.onProjectileHit(position, normal);
                } else {
                    this.onProjectileHit(position, normal, entityHit);

                    const targetEntity = entityHit;
                    const owner = entityHit.owner.get();

                    if (!this.getShouldDoHitActionBasedOnTargetScheme(owner)) {
                        return;
                    }
                    this.doDirectHitAction(this.getCorrectTargetIfHitDummy(owner, targetEntity), position, owner);
                }
            });

        UtilsGameplay.connectCodeBlockEvent(this, this.entity, CodeBlockEvents.OnProjectileHitPlayer,
            (playerHit: Player, position: Vec3, normal: Vec3, headshot: boolean) => {
                if (this.debugLogProjectileHits) logEx(`${this.parentWeapon.getName()}: projectile hit ${playerHit.name.get()}.)`);
                this.onProjectileHit(position, normal, playerHit);

                if (this.projectileData.targetScheme == EventData.TargetScheme.ENTITIES_ONLY) {
                    return;
                }

                this.doDirectHitAction(playerHit, position);
            });

        UtilsGameplay.connectCodeBlockEvent(this, this.entity, CodeBlockEvents.OnProjectileExpired,
            (position: Vec3, rotation: Quaternion, velocity: Vec3) => {
                if (this.debugLogProjectileHits) logEx(`${this.parentWeapon.getName()}: projectile expired)`);
                if (this.projectileData.projectileDoHitOnExpired) {
                    this.onProjectileHit(position);
                }
            });
    }

    private initializeRicochet() {
        if (this.props.isRicochetProjectileLauncher) {
            this.setIsEnabled(false);
        }
    }

    private connectRicochetEvents() {
        if (!this.props.isRicochetProjectileLauncher) {
            return;
        }

        if (!this.props.ricochetFromProjectileLauncher) {
            console.error(`Ricochet projectile launcher ${this.entity.name} does not have a ricochetFromProjectileLauncher`);
            return;
        }

        UtilsGameplay.connectCodeBlockEvent(this, this.props.ricochetFromProjectileLauncher, CodeBlockEvents.OnProjectileLaunched,
            (launcher: Entity) => {
                this.captureRicochetLastFirePosition();
            });

        UtilsGameplay.connectCodeBlockEvent(this, this.props.ricochetFromProjectileLauncher, CodeBlockEvents.OnProjectileHitEntity,
            (entityHit: Entity, position: Vec3, normal: Vec3, isStaticHit: boolean) => {
                this.ricochetProjectile(position, normal);
            });
    }

    private captureRicochetLastFirePosition() {
        // Avoid the Bridge call if we don't need the value.
        if (ConstsWeapon.PROJECTILE_RICOCHET_SOURCE_POSITION == ProjectileRicochetSourcePosition.LAST_FIRE_CAMERA_POSITION) {
            this.ricochetFromLastFirePosition = LocalCamera.position.get();
        }
    }

    private ricochetProjectile(hitPosition: Vec3, hitNormal: Vec3) {
        const sourcePosition = this.getRicochetSourcePosition();
        const hitDirection = hitPosition.sub(sourcePosition);
        const reflection = hitDirection.reflect(hitNormal);
        this.launchProjectileFromPositionDirection(hitPosition, reflection);
    }

    private getRicochetSourcePosition() {
        switch (ConstsWeapon.PROJECTILE_RICOCHET_SOURCE_POSITION) {
            case ProjectileRicochetSourcePosition.LAST_FIRE_CAMERA_POSITION:
                return this.ricochetFromLastFirePosition;
            case ProjectileRicochetSourcePosition.CURRENT_CAMERA_POSITION:
            default:
                return LocalCamera.position.get();
        }
    }

    private getShouldDoHitActionBasedOnTargetScheme(owner: Player) {
        switch (this.projectileData.targetScheme) {
            case EventData.TargetScheme.PLAYERS_ONLY:
                return owner.id != this.serverId; // we should not apply hit if scheme is for players but obj hit is owned by server.
            case EventData.TargetScheme.ENTITIES_ONLY:
                return owner.id == this.serverId; // we should not apply hit if scheme is for entities but obj hit is owned by player.
            default:
                // allow hit, filtering will happen on server side
                return true;
        }
    }

    private doDirectHitAction(targetObject: Entity | Player, position: Vec3, targetOwner?: Player) {
        if (!this.projectileData.splashExcludesDirectHit || this.getSplashRadius().radius > 0) {
            return;
        }

        const targetRelativePos = position.sub(targetObject.position.get());

        if (targetObject instanceof Player) {
            this.applyAction(targetObject, this.projectileData, position, targetRelativePos);
            return;
        }

        this.applyAction(targetObject, this.projectileData, position, targetRelativePos);

        // Do action on owner if it's a player (ie: players weapon was hit)
        if (targetOwner && targetOwner.id != this.serverId) {
            this.applyAction(targetOwner, this.projectileData, position, targetRelativePos);
        }
    }

    private setVFXProperties() {
        setVFXParameters(this.props.beamActiveLoopVFX, [
            [this.props.beamActiveLoopVFX_id_radius, this.projectileData.beamRadius],
            [this.props.beamActiveLoopVFX_id_color_inside, this.projectileData.beamInsideColor],
            [this.props.beamActiveLoopVFX_id_color_outside, this.projectileData.beamOutsideColor],
        ]);

        setVFXParameters(this.props.hitVFX, [
            [this.props.hitVFX_id_radius, this.projectileData.hitVFXRadius * this.parentWeapon.weaponModifiers.splashRadiusMultiplier],
            [this.props.hitVFX_id_radius_core, this.projectileData.hitVFXRadiusCore * this.parentWeapon.weaponModifiers.splashRadiusMultiplier],
            [this.props.hitVFX_id_color, new ColorWithAlpha(this.projectileData.hitVFXColor.r, this.projectileData.hitVFXColor.g, this.projectileData.hitVFXColor.b, this.projectileData.hitVFXColorAlpha)],
        ]);

        setVFXParameters(this.props.hitMidAirVFX, [
            [this.props.hitVFX_id_radius, this.projectileData.hitVFXRadius * this.parentWeapon.weaponModifiers.splashRadiusMultiplier],
            [this.props.hitVFX_id_radius_core, this.projectileData.hitVFXRadiusCore * this.parentWeapon.weaponModifiers.splashRadiusMultiplier],
            [this.props.hitVFX_id_color, new ColorWithAlpha(this.projectileData.hitVFXColor.r, this.projectileData.hitVFXColor.g, this.projectileData.hitVFXColor.b, this.projectileData.hitVFXColorAlpha)],
        ]);

        setVFXParameters(this.props.coneFireVFX, [
            [this.props.coneFireVFX_id_length, this.projectileData.range],
            [this.props.coneFireVFX_id_radius, this.projectileData.horizontalSpreadRadius],
            [this.props.coneFireVFX_id_count, this.projectileData.spreadCount],
            [this.props.coneFireVFX_id_speed, this.getProjectileSpeedMetersPerSecond()],
            [this.props.coneFireVFX_id_color, new ColorWithAlpha(this.projectileData.coneVFXColor.r, this.projectileData.coneVFXColor.g, this.projectileData.coneVFXColor.b, this.projectileData.coneVFXColorAlpha)],
        ]);

        this.lazyForceInitializationOfProjectileLauncherOnCSharpBECAUSEREASSONS__THISMAKESUSSAD();
    }

    private lazyForceInitializationOfProjectileLauncherOnCSharpBECAUSEREASSONS__THISMAKESUSSAD() {
        this.async.setTimeout(() => UtilsGameplay.setColor(this.entity, this.projectileData.projectileColor ?? ARBITRARY_COLOR), 500);
    }

    private onProjectileHit(position: Vec3, normal?: Vec3, target: Player | Entity | undefined = undefined) {
        const vfxPos = position.clone();
        if (normal) {
            vfxPos.addInPlace(Vec3.mul(normal, WeaponCompProjectile.HIT_VFX_NORMAL_OFFSET));
        }

        const isMidAir = !normal || target && target instanceof Player;
        queueFrameDistributedExecution('PLAY_FX_GUARANTEED', () => this.playHitFeedback(vfxPos, normal, isMidAir));
        this.doSplashAction(position);
        this.doForceAction(target, position);
        this.doObjectPlacementAction(position, normal);
    }

    private getProjectileSpeedMetersPerSecond() {
        return this.projectileData.projectileSpeedMetersPerSecond * this.parentWeapon.weaponModifiers.projectileSpeedMetersPerSecMultiplier;
    }

    private getProjectileRangeMeters() {
        return this.projectileData.projectileRangeMeters * this.parentWeapon.weaponModifiers.projectileRangeMultiplier;
    }

    private getSplashRadius() {
        return {
            radius: this.projectileData.splashRadius * this.parentWeapon.weaponModifiers.splashRadiusMultiplier,
            minRadius: this.projectileData.minSplashRadius * this.parentWeapon.weaponModifiers.splashRadiusMultiplier,
        };
    }
}

Component.register(WeaponCompProjectile);
