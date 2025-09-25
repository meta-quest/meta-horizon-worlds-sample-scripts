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

import { AnimationSequenceAssetsAndTimings } from 'ConstsAnimation';
import { AnimationId } from 'ConstsIdsAnimation';
import { playAnimationSequence, stopAllAnimationSequences } from 'EventsNetworked';
import { PlayAnimationOptions, PropTypes, StopAnimationOptions } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { clearAsyncTimeOut, waitForMilliseconds } from 'UtilsGameplay';

const DEFAULT_INTRO_OPTIONS: PlayAnimationOptions = {
    fadeInDuration: 0,
    fadeOutDuration: 0,
};

const DEFAULT_LOOP_OPTIONS: PlayAnimationOptions = {
    fadeInDuration: 0,
    looping: true,
};

const DEFAULT_STOP_OPTIONS: StopAnimationOptions = {
    fadeOutDuration: 0,
}

const PREWARM_INTRO_OPTIONS: PlayAnimationOptions = DEFAULT_INTRO_OPTIONS;
const PREWARM_LOOP_OPTIONS: PlayAnimationOptions = DEFAULT_LOOP_OPTIONS;
const PREWARM_STOP_OPTIONS: StopAnimationOptions = DEFAULT_STOP_OPTIONS;
const PREWARM_INTRO_DURATION = 20;
const PREWARM_LOOP_DURATION = 20;

export const PlayerAnimationControllerProps = {
    PAC_1PIntro: {type: PropTypes.Asset},
    PAC_1PLoop: {type: PropTypes.Asset},
    PAC_2PIntro: {type: PropTypes.Asset},
    PAC_2PLoop: {type: PropTypes.Asset},
    PAC_3PIntro: {type: PropTypes.Asset},
    PAC_3PLoop: {type: PropTypes.Asset},
    PAC_1PIntro_2h: {type: PropTypes.Asset},
    PAC_1PLoop_2h: {type: PropTypes.Asset},
    PAC_2PIntro_2h: {type: PropTypes.Asset},
    PAC_2PLoop_2h: {type: PropTypes.Asset},
    PAC_3PIntro_2h: {type: PropTypes.Asset},
    PAC_3PLoop_2h: {type: PropTypes.Asset},
    PAC_DeathF1_Intro: {type: PropTypes.Asset},
    PAC_DeathF1_Loop: {type: PropTypes.Asset},
    PAC_DeathB1_Intro: {type: PropTypes.Asset},
    PAC_DeathB1_Loop: {type: PropTypes.Asset},
    PAC_DeathR1_Intro: {type: PropTypes.Asset},
    PAC_DeathR1_Loop: {type: PropTypes.Asset},
    PAC_DeathL1_Intro: {type: PropTypes.Asset},
    PAC_DeathL1_Loop: {type: PropTypes.Asset},
    PAC_DeathF1_HS_Intro: {type: PropTypes.Asset},
    PAC_DeathF1_HS_Loop: {type: PropTypes.Asset},
    PAC_DeathB1_HS_Intro: {type: PropTypes.Asset},
    PAC_DeathB1_HS_Loop: {type: PropTypes.Asset},
    PAC_DeathR1_HS_Intro: {type: PropTypes.Asset},
    PAC_DeathR1_HS_Loop: {type: PropTypes.Asset},
    PAC_DeathL1_HS_Intro: {type: PropTypes.Asset},
    PAC_DeathL1_HS_Loop: {type: PropTypes.Asset},
}
type Props = typeof PlayerAnimationControllerProps;

export class PlayerAnimationController extends LocalPlayerComponent<Props> {
    private pendingAnimTimeoutId?: number;

    private animSequenceMap = new Map<AnimationId, AnimationSequenceAssetsAndTimings>();

    localPreStart() {
        this.hzObj.connectNetworkEvent(this.owner, playAnimationSequence, (data) => this.playAnimationSequence(data.sequence));
        this.hzObj.connectNetworkEvent(this.owner, stopAllAnimationSequences, (data) => this.stopAllAnimationSequences());
    }

    localStart() {
        // build the animation map from asset data
        this.animSequenceMap.set('first_place_pose', new AnimationSequenceAssetsAndTimings(this.props.PAC_1PIntro!, 1, this.props.PAC_1PLoop!));
        this.animSequenceMap.set('second_place_pose', new AnimationSequenceAssetsAndTimings(this.props.PAC_2PIntro!, 1, this.props.PAC_2PLoop!));
        this.animSequenceMap.set('third_place_pose', new AnimationSequenceAssetsAndTimings(this.props.PAC_3PIntro!, 1, this.props.PAC_3PLoop!));
        this.animSequenceMap.set('death_front', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathF1_Intro!, 1, this.props.PAC_DeathF1_Loop!));
        this.animSequenceMap.set('death_back', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathB1_Intro!, 1, this.props.PAC_DeathB1_Loop!));
        this.animSequenceMap.set('death_right', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathR1_Intro!, 1, this.props.PAC_DeathR1_Loop!));
        this.animSequenceMap.set('death_left', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathL1_Intro!, 1, this.props.PAC_DeathL1_Loop!));
        this.animSequenceMap.set('death_front_headshot', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathF1_HS_Intro!, 1, this.props.PAC_DeathF1_HS_Loop!));
        this.animSequenceMap.set('death_back_headshot', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathB1_HS_Intro!, 1, this.props.PAC_DeathB1_HS_Loop!));
        this.animSequenceMap.set('death_right_headshot', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathR1_HS_Intro!, 1, this.props.PAC_DeathR1_HS_Loop!));
        this.animSequenceMap.set('death_left_headshot', new AnimationSequenceAssetsAndTimings(this.props.PAC_DeathL1_HS_Intro!, 1, this.props.PAC_DeathL1_HS_Loop!));
        this.prewarmAnimationSequences();
    }

    localUpdate(deltaTimeSeconds: number) {
    }

    localDispose() {
    }

    private playAnimationSequence(sequenceId: AnimationId) {
        const sequenceData = this.animSequenceMap.get(sequenceId);
        if (sequenceData == undefined) {
            console.warn(`No sequence data defined for ${sequenceId}`);
            return;
        }

        // Play intro
        this.owner.playAvatarAnimation(sequenceData.introAsset, DEFAULT_INTRO_OPTIONS);

        // Queue loop
        clearAsyncTimeOut(this.hzObj, this.pendingAnimTimeoutId);
        this.pendingAnimTimeoutId = this.hzObj.async.setTimeout(() => {
            this.owner.playAvatarAnimation(sequenceData.loopAsset, DEFAULT_LOOP_OPTIONS);
        }, sequenceData.introDuration * 950);
    }

    private stopAllAnimationSequences() {
        clearAsyncTimeOut(this.hzObj, this.pendingAnimTimeoutId);
        this.owner.stopAvatarAnimation(DEFAULT_STOP_OPTIONS);
    }

    private async prewarmAnimationSequences() {
        const sequences = Array.from(this.animSequenceMap.values());
        for (const sequence of sequences) {
            this.owner.playAvatarAnimation(sequence.introAsset, PREWARM_INTRO_OPTIONS);
            await waitForMilliseconds(PREWARM_INTRO_DURATION);
            this.owner.playAvatarAnimation(sequence.loopAsset, PREWARM_LOOP_OPTIONS);
            await waitForMilliseconds(PREWARM_LOOP_DURATION);
        }
        this.owner.stopAvatarAnimation(PREWARM_STOP_OPTIONS);
    }
}
