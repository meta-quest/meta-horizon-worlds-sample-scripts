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

import { GamePlayer } from 'GamePlayer';
import { Component, EventSubscription, Player, PropsFromDefinitions } from 'horizon/core';

export enum HintState {
    UNSEEN,
    SHOWING,
    SEEN,
}

export abstract class Hint<Props = {}> {
    state: HintState = HintState.UNSEEN;
    protected timerStartTime: number = 0;
    protected subscriptions: EventSubscription[] = [];

    constructor(protected seenId: string, protected hzObj: Component, protected virtualOwner: Player, protected props: PropsFromDefinitions<Props>, protected onHidden: () => void = () => {}) {
        this.onInitialize();
    }

    dispose() {
        if (this.state == HintState.SHOWING) {
            this.hide();
        }
        this.onDispose();
        this.subscriptions.forEach(subscription => subscription.disconnect());
    }

    update(deltaTimeSeconds: number) {
        this.onUpdate(deltaTimeSeconds);
    }

    shouldShow() {
        return this.state == HintState.UNSEEN && this.enoughTimeHasElapsed();
    }

    shouldHide() {
        return this.state == HintState.SHOWING;
    }

    shouldSkip() {
        return false;
    }

    show() {
        this.state = HintState.SHOWING;
        this.onShow();
    }

    hide() {
        this.state = HintState.SEEN;
        this.setSeen();
        this.onHide();
        this.onHidden();
    }

    skip() {
        this.state = HintState.SEEN;
        this.setSeen();
        this.onSkip();
    }

    startCountdown() {
        this.timerStartTime = Date.now();
    }

    protected onInitialize() {}

    protected onDispose() {}

    protected onUpdate(deltaTimeSeconds: number) {}

    protected abstract onShow(): void;

    protected abstract onHide(): void;

    protected onSkip() { }

    protected enoughTimeHasElapsed() {
        return Date.now() - this.timerStartTime > this.getTimeBeforeShowingHint();
    }

    protected getTimeBeforeShowingHint() {
        return 0;
    }

    protected setSeen() {
        GamePlayer.getGamePlayer(this.virtualOwner)?.persistentStorageService.seenState.setIsSeen(this.seenId, true);
    }
}

