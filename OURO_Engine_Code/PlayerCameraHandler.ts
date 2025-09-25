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

import { CameraModeSettings, cameraSettingsValueComparer, CameraShakeAnimation, DEFAULT_CAMERA_SETTINGS } from 'ConstsCamera';
import { HUDControlSchemeType } from 'ConstsMobileButtons';
import { onReplicatedObjectsUpdated } from 'Events';
import {
    addCameraOverride,
    addHUDControlSchemeOverride,
    clearCameraStack,
    DeathCameraSettings,
    disableDeathCamera,
    enableDeathCamera,
    onCameraModeChanged,
    removeCameraOverride,
    removeHUDControlSchemeOverride,
    requestCameraControlStructure,
    sendCameraControlStructure,
    setCameraFollowTarget,
    setDefaultCameraSettings,
    switchCameraTargetNext
} from 'EventsNetworked';
import { InputEventData, nextFollowTarget } from 'EventsPlayerControls';
import LocalCamera, { AttachCameraOptions, CameraMode, CameraTransitionEndReason, CameraTransitionOptions, Easing, FixedCameraOptions } from 'horizon/camera';
import { Component, Entity, EventSubscription, Player, PlayerDeviceType, PropsFromDefinitions, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { ReplicatedObjSyncer } from 'ReplicatedObjSyncer';
import { logEx } from 'UtilsConsoleEx';
import { getPositionRotation, setOwner, setPosRot } from 'UtilsGameplay';
import { projectVecOntoPlane } from 'UtilsMath';
import { PrioritySortedArray } from 'UtilsTypescript';

export const CAMERA_FOV_THIRD_PERSON_HZ_DEFAULT = 40;
export const CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT = 55;
export const CAMERA_FOV_ATTACHED_HZ_DEFAULT = 40;
export const CAMERA_FOV_ORBIT_HZ_DEFAULT = 40;

const LOG_CAMERA_TRANSITION_FAILURES = false;

// How many meters behind the target character's torso that the follow cam will be located
const FOLLOW_CAM_POSITION_OFFSET = new Vec3(0, 1, -4);
// How many degrees (XYZ) that the camera will be tilted
const FOLLOW_CAM_ROTATION = new Vec3(15, 0, 0);
// How smoothly the follow cam follows its target [0-1], higher values have more smoothing/lag-behind
const FOLLOW_CAM_POSITION_SMOOTHNESS = 0.7;
const FOLLOW_CAM_ROTATION_SMOOTHNESS = 0.3;

const DEFAULT_CAMERA_MODE_TRANSITION_OPTIONS: CameraTransitionOptions = {
    delay: 0.0,
    duration: 0.3,
    easing: Easing.EaseOut,
};

export const PlayerCameraHandlerProps = {
    PCH_smoothFollowAttachPoint: {type: PropTypes.Entity},
}
type Props = typeof PlayerCameraHandlerProps;

export class PlayerCameraHandler extends LocalPlayerComponent<Props> {
    private defaultCameraSettings = DEFAULT_CAMERA_SETTINGS;
    private cameraMode = DEFAULT_CAMERA_SETTINGS.cameraMode;
    // We keep a mode->method map because horizon doesn't have a single "change camera mode" method
    private cameraModeSwitchMethods!: Map<CameraMode, (options?: CameraTransitionOptions) => Promise<CameraTransitionEndReason>>;

    private sortedCameraSettings = new PrioritySortedArray<CameraModeSettings>(this.onActiveCameraSettingsChanged.bind(this));
    private fovOverride?: number;

    private smoothFollowTarget?: Entity | Player;
    private nextSubscription?: EventSubscription;
    private replicatedObjectsSubscription?: EventSubscription;

    constructor(hzObj: Component, owner: Player, props: PropsFromDefinitions<Props>, private replicatedObjectSyncer: ReplicatedObjSyncer) {
        super(hzObj, owner, props);
    }

    localPreStart() {
        this.cameraModeSwitchMethods = new Map([
            [CameraMode.FirstPerson, LocalCamera.setCameraModeFirstPerson.bind(LocalCamera)],
            [CameraMode.ThirdPerson, LocalCamera.setCameraModeThirdPerson.bind(LocalCamera)],
            [CameraMode.Orbit, LocalCamera.setCameraModeOrbit.bind(LocalCamera)],
            [CameraMode.Fixed, LocalCamera.setCameraModeFixed.bind(LocalCamera)],
            [CameraMode.Follow, LocalCamera.setCameraModeFollow.bind(LocalCamera)],
            [CameraMode.Pan, LocalCamera.setCameraModePan.bind(LocalCamera)],
            [CameraMode.Attach, this.setAttachedCameraMode.bind(this)],
        ]);

        this.hzObj.connectNetworkEvent(this.owner, setDefaultCameraSettings, (data) => this.setDefaultCameraSettings(data));
        this.hzObj.connectNetworkEvent(this.owner, addCameraOverride, data => this.pushCameraSettings(data));
        this.hzObj.connectNetworkEvent(this.owner, removeCameraOverride, data => this.removeCameraSettings(data));
        this.hzObj.connectNetworkEvent(this.owner, clearCameraStack, () => this.sortedCameraSettings.removeAll());
        this.hzObj.connectNetworkEvent(this.owner, setCameraFollowTarget, data => this.setCameraFollowTarget(data.target ?? undefined));
        this.hzObj.connectNetworkEvent(this.owner, switchCameraTargetNext, _ => this.followNextLivingTarget());
        this.hzObj.connectLocalBroadcastEvent(onReplicatedObjectsUpdated, this.onReplicatedObjectsUpdated.bind(this));

        this.hzObj.connectNetworkEvent(this.owner, requestCameraControlStructure, () => this.sendCameraControlStructure());

        this.connectDeathCameraEvents();

        setOwner(this.owner, this.props.PCH_smoothFollowAttachPoint);
    }

    localStart() {
        // Note: We build the map in Start because LocalCamera might not be initialized in our ctor, but it is initialized here
        this.applyCameraSettings(DEFAULT_CAMERA_SETTINGS);
    }

    localUpdate(deltaTimeSeconds: number) {
        this.updateSmoothFollowTarget(deltaTimeSeconds);
    }

    localDispose() {
    }

    private onActiveCameraSettingsChanged(settings: CameraModeSettings | undefined) {
        this.applyCameraSettings(settings ?? this.defaultCameraSettings);
    }

    private setDefaultCameraSettings(settings: CameraModeSettings) {
        this.defaultCameraSettings = settings;
        this.applyCameraSettings(this.sortedCameraSettings.peek() ?? this.defaultCameraSettings);
    }

    private pushCameraSettings(settings: CameraModeSettings) {
        this.sortedCameraSettings.enqueue(settings.priority, settings);
    }

    private removeCameraSettings(settings: CameraModeSettings) {
        this.sortedCameraSettings.remove(settings.priority, settings, cameraSettingsValueComparer);
    }

    private applyCameraSettings(settings: CameraModeSettings) {
        const transitionOptions = this.createTransitionOptions(settings);
        this.setCameraFOVIfNeeded(settings, transitionOptions);
        this.cameraModeSwitchMethods.get(settings.cameraMode)?.(transitionOptions)
            .then(result => this.onCameraModeTransitionComplete(settings, result))
            .catch((reason) => {
                if (LOG_CAMERA_TRANSITION_FAILURES) {
                    logEx(`${this.owner.name.get()} failed to set camera mode to ${CameraMode[settings.cameraMode]} with reason [${reason}]`, 'error')
                }
            });
    }

    private onCameraModeTransitionComplete(settings: CameraModeSettings, result: CameraTransitionEndReason) {
        if (result != CameraTransitionEndReason.Completed) {
            if (LOG_CAMERA_TRANSITION_FAILURES) {
                logEx(`camera transition to ${CameraMode[settings.cameraMode]} ${settings.transition}, ${settings.position}, ${settings.rotation} interrupted: ${CameraTransitionEndReason[result]}`, 'warning');
            }
            return;
        }
        this.cameraMode = settings.cameraMode;
        this.hzObj.sendNetworkEvent(this.owner, onCameraModeChanged, {cameraMode: settings.cameraMode});
    }

    private setCameraFOVIfNeeded(settings: CameraModeSettings, transitionOptions: CameraTransitionOptions) {
        if (settings.fovOverride != null) {
            this.setFOV(settings.fovOverride, transitionOptions);
        } else {
            this.resetFOV(transitionOptions);
        }
    }

    private createTransitionOptions(settings: CameraModeSettings) {
        const transitionOptions: CameraTransitionOptions & FixedCameraOptions = {
            ...DEFAULT_CAMERA_MODE_TRANSITION_OPTIONS,
            duration: settings.transition != null ? settings.transition : DEFAULT_CAMERA_MODE_TRANSITION_OPTIONS.duration,
            position: settings.position ?? Vec3.zero,
            rotation: settings.rotation ?? Quaternion.one,
        };
        return transitionOptions;
    }

    /** Returns hard-coded FOV values per camera mode. If constant is undefined, value returned will mismatch camera's FOV.
     * Ideally, this will be obviously visually broken when this occurs. */
    private getFOV(): number {
        if (this.fovOverride) return this.fovOverride;
        if (this.cameraMode == CameraMode.FirstPerson) return CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT;
        if (this.cameraMode == CameraMode.ThirdPerson) return CAMERA_FOV_THIRD_PERSON_HZ_DEFAULT;
        if (this.cameraMode == CameraMode.Attach) return CAMERA_FOV_ATTACHED_HZ_DEFAULT;
        if (this.cameraMode == CameraMode.Orbit) return CAMERA_FOV_ORBIT_HZ_DEFAULT;
        return CAMERA_FOV_THIRD_PERSON_HZ_DEFAULT;
    }

    private setFOV(fov: number, options: CameraTransitionOptions = {}, onSuccess?: () => void, onFailure?: () => void) {
        LocalCamera.overrideCameraFOV(fov, options)
            .then(() => onSuccess?.())
            .catch((e) => {
                logEx(`Failed to set camera FOV due to error: ${e}`, 'error');
                onFailure?.();
            });
    }

    private resetFOV(options: CameraTransitionOptions = {}, onSuccess?: () => void, onFailure?: () => void) {
        if (this.fovOverride != null) {
            this.setFOV(this.fovOverride, options);
            return;
        }

        LocalCamera.resetCameraFOV(options)
            .then(() => onSuccess?.())
            .catch((e) => {
                logEx(`Failed to reset camera FOV due to error: ${e}`, 'error');
                onFailure?.();
            });
    }

    private setRoll(angle: number, options: CameraTransitionOptions = {}, onSuccess?: () => void, onFailure?: () => void) {
        LocalCamera.setCameraRollWithOptions(angle, options)
            .then(() => onSuccess?.())
            .catch((e) => {
                logEx(`Failed to set camera roll due to error: ${e}`, 'error');
                onFailure?.();
            });
    }

    private resetRoll(options: CameraTransitionOptions = {}, onSuccess?: () => void, onFailure?: () => void) {
        LocalCamera.setCameraRollWithOptions(0, options)
            .then(() => onSuccess?.())
            .catch((e) => {
                logEx(`Failed to reset camera roll due to error: ${e}`, 'error');
                onFailure?.();
            });
    }

    public playCameraShake(animation: CameraShakeAnimation) {
        this.setFOV(this.getShakeAmount(animation.shakeFOV), animation.shakeStartAnimation, () => this.resetFOV(animation.shakeEndAnimation));
        this.setRoll(this.getRollAmount(animation.rollAngle), animation.rollStartAnimOptions, () => this.resetRoll(animation.rollEndAnimOptions));
    }

    private getShakeAmount(shakeFOV: number): number {
        return this.getFOV() + shakeFOV * (this.getFOV() / CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT);
    }

    private getRollAmount(angle: number): number {
        return angle * (this.getFOV() / CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT);
    }

    private async setAttachedCameraMode(transitionOptions: CameraTransitionOptions): Promise<CameraTransitionEndReason> {
        const attachOptions: CameraTransitionOptions & AttachCameraOptions = {
            ...transitionOptions,
            positionOffset: FOLLOW_CAM_POSITION_OFFSET,
            rotationOffset: Quaternion.fromEuler(FOLLOW_CAM_ROTATION),
        };
        return LocalCamera.setCameraModeAttach(this.props.PCH_smoothFollowAttachPoint!, attachOptions);
    }

    private updateSmoothFollowTarget(deltaTimeSeconds: number) {
        if (this.smoothFollowTarget === undefined || this.props.PCH_smoothFollowAttachPoint === undefined) {
            return;
        }

        if (this.replicatedObjectSyncer.get(this.smoothFollowTarget) == undefined) {
            this.smoothFollowTarget = this.getNextLivingTeamMate() ?? this.getNextAvailableTarget();
            if (this.smoothFollowTarget == undefined) {
                console.warn(`unable to find follow target for ${this.owner.name.get()}`);
            }
            return;
        }

        const targetPosition = this.smoothFollowTarget.position.get();
        const targetRotation = this.getTargetRotation();

        const [position, rotation] = getPositionRotation(this.props.PCH_smoothFollowAttachPoint);
        const newPosition = Vec3.lerp(position, targetPosition, Math.max(0.01, 1 - FOLLOW_CAM_POSITION_SMOOTHNESS));
        const newRotation = Quaternion.slerp(rotation, targetRotation, Math.max(0.01, 1 - FOLLOW_CAM_ROTATION_SMOOTHNESS));
        setPosRot(this.props.PCH_smoothFollowAttachPoint!, newPosition, newRotation, true);
    }

    /** Death Camera **/

    private connectDeathCameraEvents() {
        this.hzObj.connectNetworkEvent(this.owner, enableDeathCamera, this.enableDeathCamera.bind(this));
        this.hzObj.connectNetworkEvent(this.owner, disableDeathCamera, this.disableDeathCamera.bind(this));
    }

    private enableDeathCamera(cameraSettings: DeathCameraSettings) {
        this.hzObj.sendNetworkEvent(this.owner, addHUDControlSchemeOverride, {scheme: cameraSettings.isFollowCam ? HUDControlSchemeType.DEATH_ELIMINATION : HUDControlSchemeType.DEATH_POINTS});
        this.pushCameraSettings(cameraSettings);
        if (cameraSettings.isFollowCam) {
            this.nextSubscription = this.hzObj.connectLocalBroadcastEvent(nextFollowTarget, this.onNextFollowTarget.bind(this));
            this.followIfAble(this.owner);
            this.followNextLivingTeammate();
        }
    }

    private disableDeathCamera(cameraSettings: DeathCameraSettings) {
        this.hzObj.sendNetworkEvent(this.owner, removeHUDControlSchemeOverride, {scheme: cameraSettings.isFollowCam ? HUDControlSchemeType.DEATH_ELIMINATION : HUDControlSchemeType.DEATH_POINTS});
        this.removeCameraSettings(cameraSettings);
        this.setCameraFollowTarget(undefined);
        this.nextSubscription?.disconnect();
    }

    private onReplicatedObjectsUpdated() {
        if (this.smoothFollowTarget == undefined) {
            return;
        }

        const followedPlayer = this.replicatedObjectSyncer.getPlayers(player => player == this.smoothFollowTarget).find(_ => true);
        if (!followedPlayer || !followedPlayer.isAlive) {
            this.followNextLivingTeammate();
        }
    }

    private onNextFollowTarget(data: InputEventData) {
        if (!data.pressed) {
            return;
        }
        this.followNextLivingTeammate();
    }

    private followNextLivingTeammate() {
        this.followIfAble(this.getNextLivingTeamMate());
    }

    private followNextLivingTarget() {
        this.followIfAble(this.getNextAvailableTarget());
    }

    private followIfAble(toFollow: Entity | Player | undefined) {
        if (toFollow === undefined || toFollow == this.smoothFollowTarget) {
            return;
        }
        this.setCameraFollowTarget(toFollow);
    }

    private getNextLivingTeamMate() {
        const ownerTeamId = this.replicatedObjectSyncer.getLocalPlayer().teamId;
        const livingTeammates = this.replicatedObjectSyncer.getPlayers((_, data) => data.teamId == ownerTeamId && data.objData != this.owner && data.isAlive).map(o => o.gameplayObject);
        return this.getNextFollowTarget(livingTeammates);
    }

    private getNextAvailableTarget() {
        const allPlayers = this.replicatedObjectSyncer.getPlayers((_, data) => data.isAlive).map(o => o.gameplayObject);
        return this.getNextFollowTarget(allPlayers);
    }

    private getNextFollowTarget(livingPlayers: (Entity | Player)[]) {
        if (livingPlayers.length == 0) {
            return undefined;
        }
        const currentlyFollowingIndex = this.smoothFollowTarget ? livingPlayers.indexOf(this.smoothFollowTarget) : -1;
        return livingPlayers[(currentlyFollowingIndex + 1) % livingPlayers.length];
    }

    private getTargetRotation() {
        if (this.smoothFollowTarget instanceof Player) {
            return this.smoothFollowTarget!.rootRotation.get();
        }
        // TODO: other.rotation.get() throws, but other.forward.get() doesn't, so we derive rotation from forward
        const rootBone = this.smoothFollowTarget!.forward.get();
        const forward = projectVecOntoPlane(rootBone, Vec3.up);
        return Quaternion.lookRotation(forward);
    }

    private setCameraFollowTarget(target: Entity | Player | undefined) {
        this.smoothFollowTarget = target;
        if (!target) {
            return;
        }
        this.props.PCH_smoothFollowAttachPoint!.position.set(target.position.get());
        this.props.PCH_smoothFollowAttachPoint!.rotation.set(this.getTargetRotation());
    }

    private sendCameraControlStructure() {
        const str = `current: ${CameraMode[this.sortedCameraSettings.peek()?.cameraMode ?? this.defaultCameraSettings.cameraMode]}, default: ${CameraMode[this.defaultCameraSettings.cameraMode]}, overrides: ${this.sortedCameraSettings.values().map(setting => CameraMode[setting.cameraMode]).join(',')}`;
        this.hzObj.sendNetworkEvent(this.owner, sendCameraControlStructure, {structure: str});
    }
}
