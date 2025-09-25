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

import { PrespawnedAssetId } from 'AssetPools';
import { LocalClientFrameDistributor } from 'FrameDistributor';
import { Component, World } from 'horizon/core';
import { LocalClientNuxHandler } from 'LocalClientNuxHandler';
import { LocalClientVideoTracker, PlayerVideoPlayerProps } from 'LocalClientVideoTracker';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { PlayerAbilityHandler } from 'PlayerAbilityHandler';
import { PlayerActorVelocities } from 'PlayerActorVelocities';
import { PlayerAim, PlayerAimProps } from 'PlayerAim';
import { PlayerAnimationController, PlayerAnimationControllerProps } from 'PlayerAnimationController';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import { PlayerCameraHandler, PlayerCameraHandlerProps } from 'PlayerCameraHandler';
import { PlayerControlHandler } from 'PlayerControlHandler';
import { PlayerFootSteps, PlayerFootstepsProps } from 'PlayerFootSteps';
import { PlayerHorizonApiWrapper } from 'PlayerHorizonApiWrapper';
import { PlayerJump, PlayerJumpProps } from 'PlayerJump';
import { PlayerLocomotion } from 'PlayerLocomotion';
import { PlayerNametagHandler, PlayerNametagHandlerProps } from 'PlayerNametagHandler';
import { ReplicatedObjSyncer } from 'ReplicatedObjSyncer';
import { flushlogExs } from 'UtilsConsoleEx';
import { checkIfClient, setHzObj, tryCatchFunc } from 'UtilsGameplay';

enum PlayerComponent {
    CONTROL_HANDLER,
    CAMERA_HANDLER,
    REPLICATED_OBJ_SYNCER,
    PLAYER_LOCOMOTION,
    PLAYER_ABILITY_HANDLER,
    PLAYER_JUMP,
    PLAYER_NAMETAG_HANDLER,
    PLAYER_FOOTSTEPS,
    PLAYER_AIM,
    ANIMATION_CONTROLLER,
    PLAYER_HORIZON_API_WRAPPER,
    ACTOR_VELOCITIES,
    VIDEO_PLAYER,
    NUX_HANDLER,
    FRAME_DISTRIBUTOR
}

// LocalPlayer props in this list are allowed to be undefined, otherwise we'll throw errors if a prop is undefined
const explicitlyUndefinedPropNames = [
    'PF_sneakSFX_player',
    'PF_sneakSFX_other',
];

/**
 * Central place for all player local (client side) things. Default to adding stuff here, but make separate assets as needed.
 *
 * Current litmus test is do NOT pull UI elements into this class
 */
export class LocalPlayer extends LocalClientPlayerAsset<typeof LocalPlayer> {
    private static _instance: LocalPlayer;
    static get instance() {
        checkIfClient();

        return this._instance;
    }

    static propsDefinition = {
        ...PlayerNametagHandlerProps,
        ...PlayerAimProps,
        ...PlayerJumpProps,
        ...PlayerFootstepsProps,
        ...PlayerCameraHandlerProps,
        ...PlayerAnimationControllerProps,
        ...PlayerVideoPlayerProps,
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'LocalPlayer';

    private components: Map<PlayerComponent, LocalPlayerComponent> = new Map;

    override onPreStart() {
        this.checkProps();

        LocalPlayer._instance = this;

        setHzObj(this);
        flushlogExs();

        const deviceType = this.owner.deviceType.get();

        this.components.set(PlayerComponent.CONTROL_HANDLER, new PlayerControlHandler(this, this.owner, this.props, deviceType));
        this.components.set(PlayerComponent.REPLICATED_OBJ_SYNCER, new ReplicatedObjSyncer(this, this.owner, this.props));
        this.components.set(PlayerComponent.CAMERA_HANDLER, new PlayerCameraHandler(this, this.owner, this.props, LocalReplicatedObjSyncer()));
        this.components.set(PlayerComponent.PLAYER_LOCOMOTION, new PlayerLocomotion(this, this.owner, this.props, LocalControlHandler()));
        this.components.set(PlayerComponent.PLAYER_ABILITY_HANDLER, new PlayerAbilityHandler(this, this.owner, this.props));
        this.components.set(PlayerComponent.PLAYER_JUMP, new PlayerJump(this, this.owner, this.props, LocalLocomotion()));
        this.components.set(PlayerComponent.PLAYER_NAMETAG_HANDLER, new PlayerNametagHandler(this, this.owner, this.props));
        this.components.set(PlayerComponent.PLAYER_FOOTSTEPS, new PlayerFootSteps(this, this.owner, this.props, LocalLocomotion()));
        this.components.set(PlayerComponent.PLAYER_AIM, new PlayerAim(this, this.owner, this.props, deviceType, LocalReplicatedObjSyncer()));
        this.components.set(PlayerComponent.ANIMATION_CONTROLLER, new PlayerAnimationController(this, this.owner, this.props));
        this.components.set(PlayerComponent.PLAYER_HORIZON_API_WRAPPER, new PlayerHorizonApiWrapper(this, this.owner, this.props));
        this.components.set(PlayerComponent.ACTOR_VELOCITIES, new PlayerActorVelocities(this, this.owner, this.props, LocalReplicatedObjSyncer()));
        this.components.set(PlayerComponent.VIDEO_PLAYER, new LocalClientVideoTracker(this, this.owner, this.props));
        this.components.set(PlayerComponent.NUX_HANDLER, new LocalClientNuxHandler(this, this.owner, this.props));
        this.components.set(PlayerComponent.FRAME_DISTRIBUTOR, new LocalClientFrameDistributor(this, this.owner, this.props));

        this.components.forEach(c => c.localPreStart());
    }

    override onStart() {
        this.components.forEach(c => c.localStart());

        this.connectLocalBroadcastEvent(World.onPrePhysicsUpdate, (data) => LocalReplicatedObjSyncer().checkIfPlayersExist());
    }

    override onReturnFromClient() {
    }

    override onReturnToServer() {
    }

    dispose() {
        this.components.forEach(c => c.localDispose());
    }

    getLocalPlayerComponent(component: PlayerComponent) {
        const playerComponent = this.components.get(component);
        if (playerComponent == undefined) {
            throw Error(`Expected LocalPlayerComponent not found: ${PlayerComponent[component]}`);
        }
        return playerComponent;
    }

    private checkProps() {
        const missingProps = [];
        for (const propName in this.props) {
            // @ts-ignore
            if (this.props[propName] === undefined && !explicitlyUndefinedPropNames.includes(propName)) {
                missingProps.push(propName);
            }
        }
        if (missingProps.length > 0) {
            throw Error(`LocalPlayer is missing required props: ${missingProps.join(', ')}`);
        }
    }
}

Component.register(LocalPlayer);

export function LocalControlHandler() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.CONTROL_HANDLER) as PlayerControlHandler;
}

export function LocalCameraHandler() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.CAMERA_HANDLER) as PlayerCameraHandler;
}

export function LocalReplicatedObjSyncer() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.REPLICATED_OBJ_SYNCER) as ReplicatedObjSyncer;
}

export function LocalLocomotion() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_LOCOMOTION) as PlayerLocomotion;
}

export function LocalAbilityHAndler() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_ABILITY_HANDLER) as PlayerAbilityHandler;
}

export function LocalJump() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_JUMP) as PlayerJump;
}

export function LocalNametagHandler() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_NAMETAG_HANDLER) as PlayerNametagHandler;
}

export function LocalFootsteps() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_FOOTSTEPS) as PlayerFootSteps;
}

export function LocalAim() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_AIM) as PlayerAim;
}

export function LocalAnimationController() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.ANIMATION_CONTROLLER) as PlayerAnimationController;
}

export function LocalPlayerHorizonApiWrapper() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.PLAYER_HORIZON_API_WRAPPER) as PlayerHorizonApiWrapper;
}

export function LocalPlayerActorVelocities() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.ACTOR_VELOCITIES) as PlayerActorVelocities;
}

export function LocalPlayerVideoPlayer() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.VIDEO_PLAYER) as LocalClientVideoTracker;
}

export function LocalFrameDistributor() {
    return LocalPlayer.instance.getLocalPlayerComponent(PlayerComponent.FRAME_DISTRIBUTOR) as LocalClientFrameDistributor;
}
