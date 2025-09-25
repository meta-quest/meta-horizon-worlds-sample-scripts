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

import * as ConstsAbility from 'ConstsAbility';
import { AbilitySlot } from 'ConstsAbility';
import { validAbilityId } from 'ConstsIdsAbility';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import * as EventData from 'EventData';
import * as EventsCore from 'EventsCore';
import * as EventsNetworked from 'EventsNetworked';
import * as libCam from 'horizon/camera';
import { AttachablePlayerAnchor, Entity, Player, PlayerBodyPartType, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import { GameFX, playGameFX, playVFXForEveryone, setOwnerGameFX, stopGameFX, stopVFXForEveryone } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { attachToPlayer, setOwner, setVisibilityForPlayers, setVisible } from 'UtilsGameplay';
import { IPlayerOwnedObj, playerObjShouldAcceptBroadcast } from 'UtilsPlayer';

export abstract class BasePlayerAbility<T = typeof BasePlayerAbility> extends LocalClientPlayerAsset<typeof BasePlayerAbility & T> implements IPlayerOwnedObj {
    static propsDefinition = {
        abilityId: {type: PropTypes.String, default: ''},

        headAttachedGroup: {type: PropTypes.Entity},
        torsoAlwaysAttached: {type: PropTypes.Boolean, default: false},

        primeVFX: {type: PropTypes.Entity},
        primeSFX_player: {type: PropTypes.Entity},
        primeSFX_other: {type: PropTypes.Entity},

        activateVFX: {type: PropTypes.Entity},
        activateVFX_player: {type: PropTypes.Entity},
        activateVFX_other: {type: PropTypes.Entity},
        activateSFX_player: {type: PropTypes.Entity},
        activateSFX_other: {type: PropTypes.Entity},

        activeLoopVFX: {type: PropTypes.Entity},
        activeLoopSFX_player: {type: PropTypes.Entity},
        activeLoopSFX_other: {type: PropTypes.Entity},

        primaryHandVFX: {type: PropTypes.Entity},
        secondaryHandVFX: {type: PropTypes.Entity},

        deactivateVFX: {type: PropTypes.Entity},
        deactivateSFX_player: {type: PropTypes.Entity},
        deactivateSFX_other: {type: PropTypes.Entity},

        stopActivationSFXOnDeactivation: {type: PropTypes.Boolean, default: true},
    };

    static PRIMARY_HAND_VFX_OFFSET = new Vec3(0, 0, -0.1);
    static SECONDARY_HAND_VFX_OFFSET = new Vec3(0, 0, -0.1);

    static FEEDBACK_START_ASYNC_DELAY = 0.1;

    isUsingRightHand: boolean = true;

    isPrimed = false;
    isActive = false;

    // U2GMOD_START
    camera: libCam.Camera | null = new libCam.Camera;
    // U2GMOD_END

    feedbackStartAsyncId = -1;
    handFeedbackStartAsyncId = -1;

    abilityData: ConstsAbility.AbilityData = ConstsAbility.ABILITY_DATA_DEFAULT;

    primeFX!: GameFX;
    activateFX!: GameFX;
    activeLoopFX!: GameFX;
    deactivateFX!: GameFX;

    gameFXs: GameFX[] = [];

    override onPreStart() {
        const data = ConstsAbility.ABILITY_DATA_REGISTRY.get(this.getAbilityId());
        if (data) {
            this.abilityData = data;
        } else {
            console.error('Missing ability data: ' + this.props.abilityId);
        }

        this.buildGameFXs();

        this.setOwner(this.owner);
        this.setFXVisibilities();

        UtilsGameplay.connectLocalEvent(this, this.entity, EventsCore.onPlayerObjSpawned, (data) => {
            UtilsGameplay.setOwner(data.player, this.entity);
        });

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => {
            if (this.ownerIsPlayer) {
                this.update(data.deltaTime);
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.primeAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.getAbilityId() == data.abilityId) {
                this.isUsingRightHand = data.isRight;
                this.prime();
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.activateAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && data.success && this.getAbilityId() == data.abilityId) {
                this.isUsingRightHand = data.isRight;
                this.activate(data.activationIndex);
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.deactivateAbility, (data) => {
            if (playerObjShouldAcceptBroadcast(this, data.player) && this.getAbilityId() == data.abilityId) {
                this.deactivate();
            }
        });
    }

    override onStart() {

    }

    override onReturnFromClient() {
        this.setOwner(this.world.getServerPlayer());
    }

    override onReturnToServer() {

    }

    setOwner(player: Player) {
        setOwner(player, this.props.headAttachedGroup);

        this.gameFXs.forEach((value) => setOwnerGameFX(value, player));
        UtilsGameplay.setOwner(player, this.props.primaryHandVFX);
        UtilsGameplay.setOwner(player, this.props.secondaryHandVFX);

        if (this.props.torsoAlwaysAttached) {
            UtilsGameplay.attachToPlayer(this.entity, player, AttachablePlayerAnchor.Torso);
        }
    }

    protected buildGameFXs() {
        this.primeFX = {
            allVFX: this.props.primeVFX,
            playerSFX: this.props.primeSFX_player,
            otherSFX: this.props.primeSFX_other,
        };
        this.gameFXs.push(this.primeFX);

        this.activateFX = {
            allVFX: this.props.activateVFX,
            playerVFX: this.props.activateVFX_player,
            othersVFX: this.props.activateVFX_other,
            playerSFX: this.props.activateSFX_player,
            otherSFX: this.props.activateSFX_other,
        };
        this.gameFXs.push(this.activateFX);

        this.activeLoopFX = {
            allVFX: this.props.activeLoopVFX,
            playerSFX: this.props.activeLoopSFX_player,
            otherSFX: this.props.activeLoopSFX_other,
        };
        this.gameFXs.push(this.activeLoopFX);

        this.deactivateFX = {
            allVFX: this.props.deactivateVFX,
            playerSFX: this.props.deactivateSFX_player,
            otherSFX: this.props.deactivateSFX_other,
        };
        this.gameFXs.push(this.deactivateFX);
    }

    protected setFXVisibilities() {
        if (!this.props.headAttachedGroup) {
            return;
        }

        setVisible(this.props.headAttachedGroup, this.ownerIsPlayer);

        if (this.ownerIsPlayer) {
            setVisibilityForPlayers(this.props.headAttachedGroup, [this.owner]);
            UtilsGameplay.setVisibilityForPlayersOnPlayerEnterWorld(this, this.props.headAttachedGroup, () => [this.owner]);
            UtilsGameplay.setVisibilityForPlayersOnCameraModeChanged(this, this.props.headAttachedGroup, this.owner, () => [this.owner]);

            attachToPlayer(this.props.headAttachedGroup, this.owner, AttachablePlayerAnchor.Head);
            UtilsGameplay.attachToPlayerOnCameraModeChanged(this, this.props.headAttachedGroup, this.owner, AttachablePlayerAnchor.Head);
        }
    }

    prime() {
        this.isPrimed = true;
        playGameFX(this.primeFX, {player: this.owner});
        // for child to implement
    }

    activate(activationIndex: number) {
        this.isActive = true;

        if (!this.props.torsoAlwaysAttached) {
            UtilsGameplay.attachToPlayer(this.entity, this.owner, AttachablePlayerAnchor.Torso);
        }

        this.feedbackStartAsyncId = this.async.setTimeout(() => {
            playGameFX(this.activateFX, {player: this.owner});
            playGameFX(this.activeLoopFX, {player: this.owner});
        }, BasePlayerAbility.FEEDBACK_START_ASYNC_DELAY * 1000);

        this.handFeedbackStartAsyncId = this.async.setTimeout(() => {
            playVFXForEveryone(this.props.primaryHandVFX);
            playVFXForEveryone(this.props.secondaryHandVFX);
        }, BasePlayerAbility.FEEDBACK_START_ASYNC_DELAY * 1000);

        // for child to implement
    }

    update(deltaTime: number) {
        if (!this.ownerIsPlayer || !this.isActive) {
            return;
        }

        if (this.props.primaryHandVFX) {
            this.props.primaryHandVFX.moveRelativeToPlayer(this.owner, this.isUsingRightHand ? PlayerBodyPartType.RightHand : PlayerBodyPartType.LeftHand, BasePlayerAbility.PRIMARY_HAND_VFX_OFFSET);
            this.props.primaryHandVFX.rotateRelativeToPlayer(this.owner, this.isUsingRightHand ? PlayerBodyPartType.RightHand : PlayerBodyPartType.LeftHand, Quaternion.i);
        }

        if (this.props.secondaryHandVFX) {
            this.props.secondaryHandVFX.moveRelativeToPlayer(this.owner, this.isUsingRightHand ? PlayerBodyPartType.LeftHand : PlayerBodyPartType.RightHand, BasePlayerAbility.SECONDARY_HAND_VFX_OFFSET);
            this.props.secondaryHandVFX.rotateRelativeToPlayer(this.owner, this.isUsingRightHand ? PlayerBodyPartType.LeftHand : PlayerBodyPartType.RightHand, Quaternion.i);
        }
    }

    deactivate() {
        if (!this.props.torsoAlwaysAttached) {
            UtilsGameplay.detach(this.entity);
        }

        this.async.clearTimeout(this.handFeedbackStartAsyncId);

        this.isPrimed = false;
        this.isActive = false;

        if (this.ownerIsPlayer) {
            playGameFX(this.deactivateFX, {player: this.owner});
        }

        if (this.props.stopActivationSFXOnDeactivation) {
            this.async.clearTimeout(this.feedbackStartAsyncId);
            stopGameFX(this.activateFX, this.owner, this);
        }
        stopGameFX(this.activeLoopFX, this.owner, this);

        stopVFXForEveryone(this.props.primaryHandVFX);
        stopVFXForEveryone(this.props.secondaryHandVFX);
        // for child to implement
    }

    getSourceData(): EventData.SourceData {
        return {
            ...EventData.SOURCE_DATA_DEFAULT,
            obj: this.owner,
            abilityId: this.getAbilityId(),
        };
    }

    protected applyStatusEffectToTarget(statusEffectId: StatusEffectId, target: Player | Entity, position?: Vec3, duration: number = -1) {
        UtilsGameplay.sendNetworkEvent(this, target, EventsNetworked.applyStatusEffect, {
            targetData: target,
            statusEffectId: statusEffectId,
            duration: duration,
            sourceData: {
                ...this.getSourceData(),
                pos: position ?? Vec3.zero,
            },
        });
    }

    protected removeStatusEffectFromTarget(statusEffectId: StatusEffectId, target: Entity | Player) {
        UtilsGameplay.sendNetworkEvent(this, target, EventsNetworked.removeStatusEffect, {
            targetData: target,
            statusEffectId: statusEffectId,
        });
    }

    protected getAbilityId() {
        return validAbilityId(this.props.abilityId);
    }

    protected abstract getSlot(): AbilitySlot;

    protected sendDeactivateAbilityRequestIfNeeded() {
        if (!this.isActive) {
            return;
        }
        this.sendNetworkBroadcastEvent(EventsNetworked.deactivateAbility, {
            player: this.owner,
            abilitySlot: this.getSlot(),
            abilityId: this.getAbilityId(),
        });
    }
}
