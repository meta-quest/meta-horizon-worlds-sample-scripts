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
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import { assignAsset } from 'EventsCore';
import * as EventsNetworked from 'EventsNetworked';
import { AttachablePlayerAnchor, Color, Component, Entity, Player, PlayerBodyPartType, PlayerDeviceType, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import {
    ColorWithAlpha,
    GameFX,
    playGameFX,
    playGameFXAt,
    playVFXForEveryone,
    setOwnerGameFX,
    setVFXParameter,
    setVFXParameters,
    setVFXParametersAndPlay,
    stopGameFX,
    stopVFXForEveryone
} from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { IPlayerOwnedObj, playerObjShouldAcceptBroadcast } from 'UtilsPlayer';
import { pushIfExists } from 'UtilsTypescript';

export const RADIAL_PULSE_VFX_ID_COLOR = 'color';
export const RADIAL_PULSE_VFX_ID_RADIUS = 'radius_m';
export const RADIAL_PULSE_VFX_ID_LIFE = 'panner_life';

export const TRAIL_VFX_ID_COLOR = 'Color';
export const TRAIL_VFX_ID_LIFE = 'Life(Length)';

export class StatusEffectFeedbacks extends LocalClientPlayerAsset<typeof StatusEffectFeedbacks> {
    static propsDefinition = {
        feedback1: {type: PropTypes.Entity},
        feedback2: {type: PropTypes.Entity},
        feedback3: {type: PropTypes.Entity},
        feedback4: {type: PropTypes.Entity},
        feedback5: {type: PropTypes.Entity},
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'StatusEffectFeedbacks';

    override onPreStart() {
        this.getAllFeedbacks().forEach(feedbackEntity => this.sendLocalEvent(feedbackEntity, assignAsset, {expectedPreviousOwner: feedbackEntity.owner.get(), nextOwner: this.owner}));
    }

    override onStart() {
        // no-op
    }

    override onReturnFromClient() {
    }

    override onReturnToServer() {
        this.getAllFeedbacks().forEach(feedbackEntity => this.sendLocalEvent(feedbackEntity, assignAsset, {
            expectedPreviousOwner: feedbackEntity.owner.get(),
            nextOwner: this.world.getServerPlayer()
        }));
    }

    private getAllFeedbacks(): Entity[] {
        return [this.props.feedback1, this.props.feedback2, this.props.feedback3, this.props.feedback4, this.props.feedback5].filter(fb => !!fb) as Readonly<Entity>[];
    }
}

Component.register(StatusEffectFeedbacks);

export class StatusEffectFeedback<T = typeof StatusEffectFeedback> extends Component<typeof StatusEffectFeedback & T> implements IPlayerOwnedObj {
    static propsDefinition = {
        feedbackId: {type: PropTypes.Number, default: ConstsStatusEffect.StatusEffectFeedbackId.UNDEFINED},

        isAttached: {type: PropTypes.Boolean, default: true},

        activateVFX: {type: PropTypes.Entity},
        activateSFX_all: {type: PropTypes.Entity},
        activateSFX_player: {type: PropTypes.Entity},
        activateSFX_other: {type: PropTypes.Entity},

        activeLoopVFX: {type: PropTypes.Entity},
        activeLoopSFX_all: {type: PropTypes.Entity},
        activeLoopSFX_player: {type: PropTypes.Entity},
        activeLoopSFX_other: {type: PropTypes.Entity},

        activeLoop2VFX: {type: PropTypes.Entity},
        activeLoop2SFX_all: {type: PropTypes.Entity},
        activeLoop2SFX_player: {type: PropTypes.Entity},
        activeLoop2SFX_other: {type: PropTypes.Entity},

        primaryHandVFX: {type: PropTypes.Entity},
        secondaryHandVFX: {type: PropTypes.Entity},

        removeVFX: {type: PropTypes.Entity},
        removeSFX_all: {type: PropTypes.Entity},
        removeSFX_player: {type: PropTypes.Entity},
        removeSFX_other: {type: PropTypes.Entity},

        deactivateVFX: {type: PropTypes.Entity},
        deactivateSFX_all: {type: PropTypes.Entity},
        deactivateSFX_player: {type: PropTypes.Entity},
        deactivateSFX_other: {type: PropTypes.Entity},

        radialPulseVFX: {type: PropTypes.Entity},
        radialPulseSFX_all: {type: PropTypes.Entity},
        radialPulseSFX_player: {type: PropTypes.Entity},
        radialPulseSFX_other: {type: PropTypes.Entity},

        trailVFX1: {type: PropTypes.Entity},
        trailVFX2: {type: PropTypes.Entity},
        trailVFX3: {type: PropTypes.Entity},

        trailLaunchVFX: {type: PropTypes.Entity},
        trailLaunchSFX_all: {type: PropTypes.Entity},
        trailLaunchSFX_player: {type: PropTypes.Entity},
        trailLaunchSFX_other: {type: PropTypes.Entity},

        trailHitVFX: {type: PropTypes.Entity},
        trailHitSFX_all: {type: PropTypes.Entity},
        trailHitSFX_player: {type: PropTypes.Entity},
        trailHitSFX_other: {type: PropTypes.Entity}
    };

    static SECONDARY_HAND_VFX_OFFSET = new Vec3(-0.05, -0.03, -0.1);
    static PRIMARY_HAND_VFX_OFFSET = new Vec3(0.05, -0.03, -0.1);

    static FEEDBACK_START_ASYNC_DELAY = 0.1;

    owner!: Player;
    ownerIsPlayer: boolean = false;

    feedbackId: ConstsStatusEffect.StatusEffectFeedbackId = ConstsStatusEffect.StatusEffectFeedbackId.UNDEFINED;

    isActive: boolean = false;

    feedbackStartAsyncId = -1;

    // U2GMOD_START - Left hand vfx hack
    ownerDeviceType = PlayerDeviceType.VR;
    applyLeftHandXSHack: boolean = false;
    // U2GMOD_END

    activateFX!: GameFX;
    activeLoopFX!: GameFX;
    activeLoop2FX!: GameFX;
    removeFX!: GameFX;
    deactivateFX!: GameFX;

    radialPulseFX!: GameFX;

    trailLaunchFX!: GameFX;
    trailHitFX!: GameFX;

    gameFXs: GameFX[] = [];

    trailVFXs: Entity[] = [];
    trailHandlers: TrailHandler[] = [];
    currentTrailIndex = 0;

    preStart() {
        this.feedbackId = this.props.feedbackId as ConstsStatusEffect.StatusEffectFeedbackId;

        this.activateFX = {
            allVFX: this.props.activateVFX,
            allSFX: this.props.activateSFX_all,
            playerSFX: this.props.activateSFX_player,
            otherSFX: this.props.activateSFX_other
        };
        this.gameFXs.push(this.activateFX);

        this.activeLoopFX = {
            allVFX: this.props.activeLoopVFX,
            allSFX: this.props.activeLoopSFX_all,
            playerSFX: this.props.activeLoopSFX_player,
            otherSFX: this.props.activeLoopSFX_other
        };
        this.gameFXs.push(this.activeLoopFX);

        this.activeLoop2FX = {
            allVFX: this.props.activeLoop2VFX,
            allSFX: this.props.activeLoop2SFX_all,
            playerSFX: this.props.activeLoop2SFX_player,
            otherSFX: this.props.activeLoop2SFX_other
        };
        this.gameFXs.push(this.activeLoop2FX);

        this.removeFX = {
            allVFX: this.props.removeVFX,
            allSFX: this.props.removeSFX_all,
            playerSFX: this.props.removeSFX_player,
            otherSFX: this.props.removeSFX_other
        };
        this.gameFXs.push(this.removeFX);

        this.deactivateFX = {
            allVFX: this.props.deactivateVFX,
            allSFX: this.props.deactivateSFX_all,
            playerSFX: this.props.deactivateSFX_player,
            otherSFX: this.props.deactivateSFX_other
        };
        this.gameFXs.push(this.deactivateFX);

        this.radialPulseFX = {
            allVFX: this.props.radialPulseVFX,
            allSFX: this.props.radialPulseSFX_all,
            playerSFX: this.props.radialPulseSFX_player,
            otherSFX: this.props.radialPulseSFX_other
        };
        this.gameFXs.push(this.radialPulseFX);

        this.trailLaunchFX = {
            allVFX: this.props.trailLaunchVFX,
            allSFX: this.props.trailLaunchSFX_all,
            playerSFX: this.props.trailLaunchSFX_player,
            otherSFX: this.props.trailLaunchSFX_other
        };
        this.gameFXs.push(this.trailLaunchFX);

        this.trailHitFX = {
            allVFX: this.props.trailHitVFX,
            allSFX: this.props.trailHitSFX_all,
            playerSFX: this.props.trailHitSFX_player,
            otherSFX: this.props.trailHitSFX_other
        };
        this.gameFXs.push(this.trailHitFX);

        pushIfExists(this.trailVFXs, this.props.trailVFX1);
        pushIfExists(this.trailVFXs, this.props.trailVFX2);
        pushIfExists(this.trailVFXs, this.props.trailVFX3);

        this.trailVFXs.forEach((value) => {
            if (!value) return;
            this.trailHandlers.push(new TrailHandler(this, value, this.trailLaunchFX, this.trailHitFX));
        });

        this.setOwner(this.entity.owner.get());
        this.connectLocalEvent(this.entity, assignAsset, (data) => UtilsGameplay.setOwner(data.nextOwner, this.entity));

        if (this.ownerIsPlayer) {
            this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
        }

        this.connectNetworkEvents();
    }

    private connectNetworkEvents() {
        this.connectNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectApplied, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.shouldHandle(data.statusEffectId)) {
                this.activate();
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectRemoved, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.shouldHandle(data.statusEffectId)) {
                this.deactivate(true);
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.onPlayerStatusEffectCompleted, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.shouldHandle(data.statusEffectId)) {
                this.deactivate();
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.playStatusEffectRadialPulse, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.shouldHandle(data.statusEffectId)) {
                this.playRadialPulse(data.pos, data.duration, data.radius, data.color);
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.playStatusEffectTrail, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.shouldHandle(data.statusEffectId)) {
                this.playTrail(data.fromPos, data.toPos, data.color, data.duration);
            }
        });
    }

    start() {
    }

    shouldHandle(statusEffectId: StatusEffectId) {
        const data = ConstsStatusEffect.STATUS_EFFECT_DATA_REGISTRY.get(statusEffectId);
        if (data) {
            return data.feedbackIds.has(this.feedbackId);
        }

        return false;
    }

    setOwner(player: Player) {
        this.owner = player;
        this.ownerIsPlayer = this.owner.id != this.world.getServerPlayer().id;

        // U2GMOD - Left hand vfx hack
        this.ownerDeviceType = this.ownerIsPlayer ? player.deviceType.get() : PlayerDeviceType.VR;
        this.applyLeftHandXSHack = this.ownerDeviceType != PlayerDeviceType.VR;

        this.gameFXs.forEach((value) => setOwnerGameFX(value, this.owner));

        UtilsGameplay.setOwner(this.owner, this.props.primaryHandVFX);
        UtilsGameplay.setOwner(this.owner, this.props.secondaryHandVFX);

        this.trailVFXs.forEach((value) => UtilsGameplay.setOwner(this.owner, value));
    }

    activate() {
        this.isActive = true;

        if (this.props.isAttached) {
            UtilsGameplay.attachToPlayer(this.entity, this.owner, AttachablePlayerAnchor.Torso);
        }

        this.feedbackStartAsyncId = this.async.setTimeout(() => {
            if (this.feedbackId == ConstsStatusEffect.StatusEffectFeedbackId.SPEED_BUFF) {
                setVFXParameter(this.props.activeLoopVFX, TRAIL_VFX_ID_LIFE, 1.0);
            }

            playGameFX(this.activateFX, {player: this.owner});
            playGameFX(this.activeLoopFX, {player: this.owner});
            playGameFX(this.activeLoop2FX, {player: this.owner});

            // U2GMOD_START - Disable left hand effects on HWXS currently as the hand position is not correctly tracked

            if (!this.applyLeftHandXSHack) {
                playVFXForEveryone(this.props.secondaryHandVFX);
            }
            // U2GMOD_END

            playVFXForEveryone(this.props.primaryHandVFX);
        }, StatusEffectFeedback.FEEDBACK_START_ASYNC_DELAY * 1000);
    }

    update(deltaTime: number) {
        if (!this.ownerIsPlayer) {
            return;
        }

        this.updateTrailVFX(deltaTime);

        if (!this.isActive) {
            return;
        }

        if (this.props.primaryHandVFX) {
            this.props.primaryHandVFX.moveRelativeToPlayer(this.owner, PlayerBodyPartType.RightHand, StatusEffectFeedback.PRIMARY_HAND_VFX_OFFSET);
            this.props.primaryHandVFX.rotateRelativeToPlayer(this.owner, PlayerBodyPartType.RightHand, Quaternion.one);
        }
        if (this.props.secondaryHandVFX) {
            this.props.secondaryHandVFX.moveRelativeToPlayer(this.owner, PlayerBodyPartType.LeftHand, StatusEffectFeedback.SECONDARY_HAND_VFX_OFFSET);
            this.props.secondaryHandVFX.rotateRelativeToPlayer(this.owner, PlayerBodyPartType.LeftHand, Quaternion.one);
        }
    }

    deactivate(wasRemoved: boolean = false) {
        this.isActive = false;

        if (this.props.isAttached) {
            UtilsGameplay.detach(this.entity);
        }

        this.async.clearTimeout(this.feedbackStartAsyncId);

        if (this.feedbackId == ConstsStatusEffect.StatusEffectFeedbackId.SPEED_BUFF) {
            setVFXParameter(this.props.activeLoopVFX, TRAIL_VFX_ID_LIFE, 0);
        }

        if (this.ownerIsPlayer) {
            if (wasRemoved) {
                playGameFX(this.removeFX, {player: this.owner});
            } else {
                playGameFX(this.deactivateFX, {player: this.owner});
            }
        }

        stopGameFX(this.activateFX, this.owner, this);
        stopGameFX(this.activeLoopFX, this.owner, this);
        stopGameFX(this.activeLoop2FX, this.owner, this);

        stopVFXForEveryone(this.props.primaryHandVFX);
        stopVFXForEveryone(this.props.secondaryHandVFX);
    }


    // TODO: Make this general
    radialPulseLastPlayedTime = 0;

    playRadialPulse(position: Vec3, duration: number, radius: number, color: Color) {
        const time = Date.now();
        if (!UtilsGameplay.exists(this.props.radialPulseVFX) || time - this.radialPulseLastPlayedTime < 200) {
            return;
        }

        setVFXParameters(this.props.radialPulseVFX, [
            [RADIAL_PULSE_VFX_ID_COLOR, color],
            [RADIAL_PULSE_VFX_ID_RADIUS, radius],
            [RADIAL_PULSE_VFX_ID_LIFE, duration]
        ], () => {
            // Note that this playing the full GameFX, not just VFX
            playGameFXAt(this.radialPulseFX, position, {player: this.owner});

            this.async.setTimeout(() => stopGameFX(this.radialPulseFX, this.owner, this), duration * 1000);

            this.radialPulseLastPlayedTime = time;
        });
    }

    playTrail(fromPos: Vec3, toPos: Vec3, color: Color, duration: number) {
        if (this.trailHandlers.length == 0) {
            return;
        }

        const trailHandler = this.trailHandlers[this.currentTrailIndex];
        this.currentTrailIndex = (this.currentTrailIndex + 1) % this.trailVFXs.length;
        trailHandler.playTrail(fromPos, toPos, color, duration);

    }

    updateTrailVFX(deltaTime: number) {
        this.trailHandlers.forEach((value) => value.update(deltaTime));
    }
}

Component.register(StatusEffectFeedback);

export class TrailHandler {
    parent: StatusEffectFeedback;

    trailVFX: Entity;

    launchFX: GameFX;

    hitFX: GameFX;

    isActive = false;

    fromPos = Vec3.zero;
    toPos = Vec3.zero;

    color = Color.white;

    timer = 0;
    duration = 0;

    playAsyncId = -1;

    constructor(parent: StatusEffectFeedback, trailVFX: Entity, launchFX: GameFX, hitFX: GameFX) {
        this.parent = parent;

        this.trailVFX = trailVFX;

        this.launchFX = launchFX;

        this.hitFX = hitFX;
    }

    playTrail(fromPos: Vec3, toPos: Vec3, color: Color, duration: number) {
        this.fromPos = fromPos;
        this.toPos = toPos;

        this.color = color;

        this.timer = 0;
        this.duration = duration;


        if (this.isActive) {
            this.stopTrail();
        }

        this.parent.async.clearTimeout(this.playAsyncId);
        this.playAsyncId = this.parent.async.setTimeout(() => {
            this.isActive = true;
            playGameFXAt(this.launchFX, this.fromPos, {player: this.parent.owner});

            setVFXParametersAndPlay(this.trailVFX, {position: this.fromPos}, [
                {key: TRAIL_VFX_ID_COLOR, value: new ColorWithAlpha(color.r, color.g, color.b, 1)},
                {key: TRAIL_VFX_ID_LIFE, value: 1}
            ]);
        });
    }

    update(deltaTime: number) {
        if (!this.isActive || this.duration <= 0) {
            return;
        }

        this.timer += deltaTime;
        const t = UtilsMath.clamp01(this.timer / this.duration);
        UtilsGameplay.setPos(this.trailVFX, Vec3.lerp(this.fromPos, this.toPos, t));
        if (t >= 1.0) {
            playGameFXAt(this.hitFX, this.toPos, {player: this.parent.owner});
            this.stopTrail();
        }
    }

    stopTrail() {
        this.isActive = false;
        setVFXParameter(this.trailVFX, TRAIL_VFX_ID_LIFE, 0);
        stopVFXForEveryone(this.trailVFX);
    }
}
