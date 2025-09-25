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
import { ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import { isSourceWorld } from 'ConstsAssetSourceWorld';
import { debugDismissNux, debugShowNux } from 'ConstsDebugging';
import { AbilityId } from 'ConstsIdsAbility';
import { ALL_HINT_IDS, HintId, isValidHintId } from 'ConstsIdsNuxHints';
import { onPlayerAbilityEquipped, onPlayerEnterGame } from 'Events';
import { nuxCompleted, nuxTrackLocalClient } from 'EventsNetworked';
import { Game } from 'Game';
import { GamePlayer } from 'GamePlayer';
import { Component, EventSubscription, Player, World } from 'horizon/core';
import { MetricTypes } from 'horizon/in_world_analytics';
import { ServerAnalyticsService } from 'PlatformServices';
import { ServerPlayerAsset } from 'PlayerAsset';
import { AbilityHint } from 'PlayerConditionalNuxAbilityHint';
import { AimHint } from 'PlayerConditionalNuxAimHint';
import { Hint, HintState } from 'PlayerConditionalNuxHints';
import { MoveHint } from 'PlayerConditionalNuxMoveHint';
import { RotateHint } from 'PlayerConditionalNuxRotateHint';
import { SwapHint } from 'PlayerConditionalNuxSwapHint';
import { WelcomeVideoHint, WelcomeVideoHintProps } from 'PlayerConditionalNuxWelcomeVideoHint';
import { isServerPlayer } from 'UtilsGameplay';

const DEBUG_ALWAYS_SHOW_NUX = false;

// Hints displayed as part of the intro sequence
const INTRO_HINT_ORDER: readonly HintId[] = [
    'nux_video',
    'nux_move',
    'nux_rotate',
    'nux_aim',
    'nux_ability',
    'nux_swap',
] as const;

export class PlayerConditionalNux extends ServerPlayerAsset<typeof PlayerConditionalNux> {
    static propsDefinition = {
        ...WelcomeVideoHintProps,
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'PlayerConditionalNux';

    private subscriptions: EventSubscription[] = [];
    private debugSubscriptions: EventSubscription[] = [];

    private allHints = new Map<HintId, Hint>();
    private currentlyVisibleHint?: Hint;
    private hintQueue: HintId[] = [];

    private isActive = false;

    public static playerHasSeenNuxVideo(gamePlayer: GamePlayer) {
        return gamePlayer.persistentStorageService.seenState.isSeen('nux_video');
    }

    override onPreStart() {
    }

    override onStart() {
    }

    override onAssignVirtualOwner() {
        this.debugSubscriptions.push(
            this.connectLocalEvent(this.virtualOwner, debugShowNux, data => this.startNux()),
            this.connectLocalEvent(this.virtualOwner, debugDismissNux, data => this.disableNux()),
        );
        this.subscriptions.push(
            this.connectLocalBroadcastEvent(onPlayerEnterGame, data => this.onPlayerEnterGame(data.gamePlayer)),
            this.connectLocalBroadcastEvent(onPlayerAbilityEquipped, data => this.onAbilityEquipped(data.player, data.abilityId)),
            this.connectLocalBroadcastEvent(World.onUpdate, data => this.onUpdate(data.deltaTime)),
        );
    }

    override onUnassignVirtualOwner() {
        this.allHints.forEach(hint => hint.dispose());
        this.allHints = new Map<HintId, Hint>();
        this.currentlyVisibleHint = undefined;
        this.hintQueue.length = 0;
        this.isActive = false;
        this.subscriptions.forEach(subscription => subscription.disconnect());
        this.subscriptions = [];
        this.debugSubscriptions.forEach(subscription => subscription.disconnect());
        this.debugSubscriptions = [];
    }

    private onPlayerEnterGame(gp: GamePlayer) {
        if (gp.owner != this.virtualOwner) {
            return;
        }
        this.startNuxIfNeeded(gp.owner);
    }

    private startNuxIfNeeded(player: Player) {
        if (isSourceWorld(this.world)) {
            return;
        }

        if (Game.playerNeedsToSeeNux(player)) {
            this.startNux();
            return;
        }

        if (!this.allHintsHaveBeenSeenOrSkipped()) {
            this.createHints();
            this.sendNetworkEvent(this.virtualOwner, nuxTrackLocalClient, {});
            this.isActive = true;
            return;
        }

        this.disableNux();
    }

    private startNux() {
        GamePlayer.getGamePlayer(this.virtualOwner)?.persistentStorageService.playerData.setNuxStarted();
        this.setInitialSeenStates();
        this.createHints();
        this.sendNetworkEvent(this.virtualOwner, nuxTrackLocalClient, {});
        this.isActive = true;
    }

    private setInitialSeenStates() {
        const gp = GamePlayer.getGamePlayerOrThrow(this.virtualOwner);
        gp.persistentStorageService.seenState.setIsSeenForAll(ALL_HINT_IDS, false);
    }

    private createHints() {
        this.allHints = new Map<HintId, Hint>();
        this.createHintIfNotSeen('nux_video', () => new WelcomeVideoHint('nux_video', this, this.virtualOwner, this.props, this.onWelcomeVideoWatched.bind(this)));
        this.createHintIfNotSeen('nux_move', () => new MoveHint('nux_move', this, this.virtualOwner, this.props));
        this.createHintIfNotSeen('nux_rotate', () => new RotateHint('nux_rotate', this, this.virtualOwner, this.props));
        this.createHintIfNotSeen('nux_aim', () => new AimHint('nux_aim', this, this.virtualOwner, this.props));
        this.createHintIfNotSeen('nux_ability', () => new AbilityHint('nux_ability', this, this.virtualOwner, this.props));
        this.createHintIfNotSeen('nux_swap', () => new SwapHint('nux_swap', this, this.virtualOwner, this.props));
        INTRO_HINT_ORDER.forEach(hintId => this.enqueueHintIfAble(hintId));
    }

    private createHintIfNotSeen(hintId: HintId, ctor: () => Hint) {
        if (GamePlayer.getGamePlayerOrThrow(this.virtualOwner).persistentStorageService.seenState.isSeen(hintId)) {
            return;
        }
        this.allHints.set(hintId, ctor());
    }

    private removeAllHints() {
        this.allHints.forEach(hint => hint.dispose());
        this.allHints.clear();
    }

    private enqueueHintIfAble(hintId: HintId) {
        if (!this.allHints.has(hintId) || this.hintQueue.includes(hintId)) {
            return;
        }
        this.hintQueue.push(hintId);
    }

    private dequeueHintIfAble(): Hint | undefined {
        const hintId = this.hintQueue.shift();
        return hintId ? this.allHints.get(hintId) : undefined;
    }

    onUpdate(deltaTimeSeconds: number) {
        if (!this.isActive) {
            return;
        }
        this.allHints.forEach(hint => hint.update(deltaTimeSeconds));
        this.showOrHideIntroHintsAsNeeded();
    }

    private showOrHideIntroHintsAsNeeded() {
        switch (this.currentlyVisibleHint?.state) {
            case HintState.SHOWING:
                // Hint is showing, wait for it to finish
                if (this.currentlyVisibleHint?.shouldHide()) {
                    this.currentlyVisibleHint.hide();
                    this.currentlyVisibleHint.dispose();
                }
                return;
            case HintState.UNSEEN:
                // Hint hasn't been shown, wait for it to start or skip it altogether
                if (this.currentlyVisibleHint?.shouldShow())
                    this.currentlyVisibleHint.show();
                else if (this.currentlyVisibleHint?.shouldSkip())
                    this.currentlyVisibleHint.skip();
                return;
            case HintState.SEEN: // Fallthrough
            default:
                // Move on to the next hint
                this.currentlyVisibleHint = this.getNextUnseenIntroHint();
                if (!this.currentlyVisibleHint) {
                    // Shutdown nux - all intro hints have been shown
                    this.markIntroNuxComplete();
                    this.disableNuxIfAllHintsHaveBeenSeen();
                } else {
                    this.currentlyVisibleHint.startCountdown();
                }
                break;
            case undefined:
                this.currentlyVisibleHint = this.getNextUnseenIntroHint();
                if (this.currentlyVisibleHint) {
                    this.currentlyVisibleHint.startCountdown();
                }
        }
    }

    private getNextUnseenIntroHint(): Hint | undefined {
        return this.dequeueHintIfAble();
    }

    private markIntroNuxComplete() {
        ServerAnalyticsService().getPlayerAnalytics(this.virtualOwner).nuxIntroCompletedMetricEvent();
    }

    private onWelcomeVideoWatched() {
        this.tryToStartGame();
    }

    private tryToStartGame() {
        Game.instance.gameMode.tryToStartGameForPlayer(this.virtualOwner)
            .catch(error => console.error(`Unable to start game for ${this.virtualOwner.name.get()}, reason: ${error}`));
    }

    private allHintsHaveBeenSeenOrSkipped() {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);
        return ALL_HINT_IDS.every(id => gp?.persistentStorageService.seenState.isSeen(id));
    }

    private onHoldAndReleaseSeen() {
        this.disableNuxIfAllHintsHaveBeenSeen();
    }

    private disableNuxIfAllHintsHaveBeenSeen() {
        if (!this.allHintsHaveBeenSeenOrSkipped()) {
            return;
        }

        this.disableNux();
    }

    private disableNux() {
        this.subscriptions.forEach(subscription => subscription.disconnect());
        this.removeAllHints();
        this.currentlyVisibleHint = undefined;
        this.isActive = false;
        if (!isServerPlayer(this.virtualOwner, this.world)) {
            this.sendNetworkEvent(this.virtualOwner, nuxCompleted, {});
        }
    }

    private onAbilityEquipped(player: Player, abilityId: AbilityId) {
        if (player != this.virtualOwner) return;
        const conditionalHintId = ABILITY_DATA_REGISTRY.get(abilityId)?.nuxConditionalText;
        if (!conditionalHintId || !isValidHintId(conditionalHintId)) return;
        this.enqueueHintIfAble(conditionalHintId as HintId);
    }
}

Component.register(PlayerConditionalNux);
