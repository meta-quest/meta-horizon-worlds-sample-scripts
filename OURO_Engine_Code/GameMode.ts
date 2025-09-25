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

import {GameModeConfig} from 'ConstsGameMode';
import {Game} from 'Game';
import {EventSubscription, Player} from 'horizon/core';
import {SpawnPointLocation, SpawnScheme} from 'Events';
import {waitUntil} from 'UtilsGameplay';
import {setLobbyPhaseComplete} from 'EventsCrossWorld';
import {GamePlayer} from 'GamePlayer';
import { logEx } from 'UtilsConsoleEx';

export abstract class GameModeFSMState<PhaseName extends any, Config extends GameModeConfig> {
    currentPhaseName: PhaseName | undefined;

    constructor(public config: Config) {
    }

    abstract getGamePlayers(): GamePlayer[]
}

export interface GameModeFSMPhase<PhaseName extends any, Config extends GameModeConfig, State extends GameModeFSMState<PhaseName, Config> = GameModeFSMState<PhaseName, Config>> {
    name: PhaseName;
    state: State;
    onEndDelaySeconds?: number; // This serves as a seam to show popups

    onStart(): void;

    onUpdate(deltaSeconds: number): void;

    isComplete(): boolean;

    onEnd(): void;

    getNextPhase(): PhaseName;

    clearEventSubscriptions(): void;

    addPlayer(gamePlayer: GamePlayer): void;

    removePlayer(gamePlayer: GamePlayer): void;

    onPlayerOutOfBounds(player: Player): void;

    teleportPlayer(player: Player, location: SpawnPointLocation, destIndex: number, scheme?: SpawnScheme, onComplete?: () => void): void;

    applyLocationSettingsToGamePlayer(gamePlayer: GamePlayer, location: SpawnPointLocation): void;
}

export class GameMode<PhaseName extends any = any, Config extends GameModeConfig = GameModeConfig, State extends GameModeFSMState<PhaseName, Config> = GameModeFSMState<PhaseName, Config>> {
    phaseMapping = new Map<PhaseName, GameModeFSMPhase<PhaseName, Config, State>>();
    phase?: GameModeFSMPhase<PhaseName, Config, State>;
    eventSubscriptions: EventSubscription[] = [];

    private phaseIsEnding = false;

    constructor(public game: Game, public state: State) {
    }

    onUpdate(deltaSeconds: number) {
        // This is kinda gnarly, short circuit if we're already ending via the async
        if (!this.phase) {
            return;
        }

        if (this.phaseIsEnding) {
            return;
        }

        this.phase.onUpdate(deltaSeconds);

        if (this.phase.isComplete()) {
            this.phaseIsEnding = true;
            logEx(`[END PHASE]: ${this.state.currentPhaseName}`);
            this.phase.onEnd();
            const next = this.phase.getNextPhase();

            if (this.phase.onEndDelaySeconds) {
                this.game.async.setTimeout(() => this.setPhase(next), this.phase.onEndDelaySeconds * 1000);
            } else {
                this.setPhase(next);
            }
        }
    }

    dispose() {
        if (this.phase) {
            this.phase.clearEventSubscriptions();
            GamePlayer.gamePlayersById.forEach((gp) => this.phase!.removePlayer(gp));
        }

        this.eventSubscriptions.forEach(subscription => subscription.disconnect());
        this.eventSubscriptions.length = 0;
    }

    async tryToStartGameForPlayer(player: Player) {
        const roundHasAlreadyStarted = this.state.currentPhaseName == 'ROUND';

        if (this.state.currentPhaseName == 'MATCH RESOLUTION') {
            await waitUntil(() => this.state.currentPhaseName != 'MATCH RESOLUTION');
        }
        const gp = GamePlayer.getGamePlayerOrThrow(player);
        this.phase!.addPlayer(gp);
        if (this.state.currentPhaseName == 'LOBBY') {
            // Start a match if needed - player might be the only person in the instance and we will want to start a match with bots, etc
            this.game.sendLocalBroadcastEvent(setLobbyPhaseComplete, {});
        }

        await waitUntil(() => this.state.currentPhaseName == 'ROUND');
        this.phase!.teleportPlayer(player, SpawnPointLocation.ARENA, 0, roundHasAlreadyStarted ? SpawnScheme.SAFETY_AND_TEAM_PROXIMITY : SpawnScheme.TEAM_AND_INDEX);
    }

    protected setPhase(name: PhaseName) {
        this.phase?.clearEventSubscriptions();

        this.phaseIsEnding = false;
        this.phase = this.phaseMapping.get(name);
        if (!this.phase) {
            throw new Error(`Missing phase ${name}.`);
        }
        this.phase.state.currentPhaseName = name;
        logEx(`[START PHASE]: ${name}`);
        this.phase.onStart();
    }
}
