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


import { AnimationId } from 'ConstsIdsAnimation';
import { EndOfMatchOptions, onPodiumAFKTimeout, onVictorySequenceEnded, playerFinishedVictorySequence, playVictorySequence, setPlayerInputIsBlocked, showLoginPromptIfNeeded, SpawnPointLocation, SpawnScheme } from 'Events';
import { addCameraOverride, clearCameraStack, playAnimationSequence, removeCameraOverride, stopAllAnimationSequences } from 'EventsNetworked';
import { Game } from 'Game';
import { GamePlayer } from 'GamePlayer';
import { Component, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { ServerMusicService } from 'PlatformServices';
import { PodiumCameraTarget } from 'PodiumCameraTarget';
import { logEx } from 'UtilsConsoleEx';
import { GameFX, playGameFX } from 'UtilsFX';
import { clearAsyncTimeOut, setVisibilityForPlayers, toStringSafe, waitForMilliseconds } from 'UtilsGameplay';
import { PerPlayerValues } from 'UtilsUI';

// start with some delay to account for screen black during teleportation
const START_ANIMATION_TIME_MS = 500;

// Minimum camera transition duration to avoid events arriving out of order
const MINIMUM_CAMERA_TRANSITION_DURATION_MS = 10;

// Kick players out of the podium area after this many seconds
const AFK_TELEPORT_TIMEOUT_SECONDS = 60;

// Degrees per second of rotation
const BACKGROUND_ROTATION_PER_SEC = Quaternion.fromEuler(new Vec3(0, 1, 0));

export class PodiumManager extends Component<typeof PodiumManager> {
    static propsDefinition = {
        startingPodiumTarget: {type: PropTypes.Entity},
        debugShowAllAnims: {type: PropTypes.Boolean},
        debugShowMannequins: {type: PropTypes.Boolean},
        debugMannequins: {type: PropTypes.Entity},
        bgContainer: {type: PropTypes.Entity},
        background: {type: PropTypes.Entity},
        backgroundRed: {type: PropTypes.Entity},
        celebrationVFX: {type: PropTypes.Entity},
        celebrationSFX: {type: PropTypes.Entity},
    };

    private startingTarget?: PodiumCameraTarget;
    private endingTarget?: PodiumCameraTarget;
    private afkTimeouts = new PerPlayerValues<number | undefined>(undefined);
    private celebrationFX!: GameFX;

    preStart() {
        this.connectLocalBroadcastEvent(playVictorySequence, data => this.playSequence(data.podium, data.crowd, data.showRedBG));
        this.connectLocalBroadcastEvent(playerFinishedVictorySequence, data => this.onPlayerFinishedVictorySequence(data.endOfMatchOption, data.player)
            .catch(error => console.error(`Error during victory sequence for ${data.player} (${data.endOfMatchOption}), reason: ${error}`)));
        this.celebrationFX = {
            allVFX: this.props.celebrationVFX,
            allSFX: this.props.celebrationSFX,
        }
    }

    start() {
        this.props.debugMannequins?.visible.set(this.props.debugShowMannequins);
        this.props.startingPodiumTarget?.getComponents(PodiumCameraTarget).forEach((comp) => {
            this.startingTarget = comp;
        });
        if (this.startingTarget == undefined) {
            throw new Error('The podium manager is missing a starting target.');
        }
        this.async.setTimeout(() => this.initializeCameraTargetsAndBuildCameraTargetDAG());
        if (this.props.bgContainer != undefined) {
            this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
        }
    }

    update(deltaTime: number): void {
        const rotationPerFrame = Quaternion.slerp(Quaternion.one, BACKGROUND_ROTATION_PER_SEC, deltaTime);
        this.props.bgContainer!.rotation.set(this.props.bgContainer!.rotation.get().mul(rotationPerFrame));
    }

    /** Build a Directed Acyclic Graph (DAG) of Camera Targets, initializing the targets as we go. */
    private initializeCameraTargetsAndBuildCameraTargetDAG() {
        // Track backlinks to detect loops and print useful logs if a loop is detected
        const linkedFrom = new Map<PodiumCameraTarget, string>();

        // Build the DAG
        let current = this.startingTarget;
        let previous = undefined;
        while (current != undefined) {
            if (linkedFrom.has(current)) {
                console.error(`Loop detected in celebration podium scene. ${current.entity.name.get()} is linked to by both ${linkedFrom.get(current)} and ${previous!.entity.name.get()}`);
                // break the loop for safety
                previous!.next = undefined;
                return;
            }

            // Initialize the node, which sets its .next and .priority properties
            current.initCameraTarget();

            linkedFrom.set(current, previous?.entity.name.get() ?? 'Podium Manager');
            previous = current;
            this.endingTarget = current;
            current = current.next;
        }
    }

    private playSequence(podiumPlayers: GamePlayer[], crowdPlayers: GamePlayer[], showRedBG: boolean) {
        this.showAndHideBG(podiumPlayers, crowdPlayers, showRedBG);
        const allPlayers = [...podiumPlayers, ...crowdPlayers];
        allPlayers.forEach(gp => this.runCelebrationSequence(gp, podiumPlayers, crowdPlayers));
        this.async.setTimeout(() => playGameFX(this.celebrationFX), START_ANIMATION_TIME_MS);
        this.async.setTimeout(() => this.sendLocalBroadcastEvent(onVictorySequenceEnded, {}), this.getTotalSequenceDuration(podiumPlayers.length) * 1000);
    }

    async runCelebrationSequence(gp: GamePlayer, podiumPlayers: GamePlayer[], crowdPlayers: GamePlayer[]) {
        if (gp.isDisposed) return;

        const ranking = podiumPlayers.indexOf(gp);
        if (ranking > -1) {
            this.teleportPlayerToPodium(gp.owner, ranking);
        } else {
            this.teleportPlayerToCrowd(gp.owner);
        }
        this.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {player: gp.owner, isBlocked: true});

        gp.shouldTeleportOnRoundStart = false;

        // wait for teleport and camera transition
        await waitForMilliseconds(START_ANIMATION_TIME_MS);
        if (gp.isDisposed) return;

        let current = this.startingTarget;
        while (current != undefined) {
            if (this.props.debugShowAllAnims || current.props.ranking <= podiumPlayers.length) {
                this.sendAnimationEventsIfNeeded(gp, current, ranking);
                await this.sendCameraTransitions(gp, current);
                if (gp.isDisposed) return;
            }
            current = current.next;
        }
        this.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {player: gp.owner, isBlocked: false});

        this.setAFKTeleportTimer(gp);
    }

    private sendAnimationEventsIfNeeded(gp: GamePlayer, target: PodiumCameraTarget, ranking: number) {
        // We subtract 1 so designer don't have to think in 0-index, ie 1st place can be ranking 1, 2nd place 2, 3rd is 3.
        if (ranking == target.props.ranking - 1 && target.props.optAnimId.length > 0) {
            this.playAvatarAnimationSequence(gp, target.props.optAnimId as AnimationId);
        }
    }

    private async sendCameraTransitions(gp: GamePlayer, target: PodiumCameraTarget) {
        this.sendNetworkEvent(gp.owner, addCameraOverride, target.getAnimSettings());
        await waitForMilliseconds(Math.max(target.getTotalAnimationDuration() * 1000, MINIMUM_CAMERA_TRANSITION_DURATION_MS));
        if (target != this.endingTarget) {
            // The final camera setting is removed when the player closes their progression HUD
            this.async.setTimeout(() => {
                if (gp.isDisposed) return;
                this.sendNetworkEvent(gp.owner, removeCameraOverride, target.getAnimSettings())
            }, 100);
        }
    }

    private setAFKTeleportTimer(gp: GamePlayer) {
        clearAsyncTimeOut(this, this.afkTimeouts.get(gp.owner));
        const timeOut = this.async.setTimeout(() => {
            if (!gp.isDisposed) {
                this.onPlayerFinishedVictorySequence(EndOfMatchOptions.RETURN_TO_LOBBY, gp.owner)
                    .catch(error => console.error(`Error during victory sequence for ${gp.owner}, reason: ${error}`));

                this.sendLocalBroadcastEvent(onPodiumAFKTimeout, {player:gp.owner});
            }
        }, AFK_TELEPORT_TIMEOUT_SECONDS * 1000);
        this.afkTimeouts.set(timeOut, gp.owner);
    }

    private getTotalSequenceDuration(highestRank: number) {
        let duration = START_ANIMATION_TIME_MS / 1000;
        let current = this.startingTarget;
        while (current != undefined) {
            if (this.props.debugShowAllAnims || current.props.ranking <= highestRank) {
                duration += current.getTotalAnimationDuration();
            }
            current = current.next;
        }
        return duration;
    }

    private teleportPlayerToPodium(player: Player, destIndex: number) {
        this.teleportPlayer(player, destIndex, SpawnPointLocation.PODIUM, SpawnScheme.VICTORY_CONDITIONS);
    }

    private teleportPlayerToCrowd(player: Player) {
        this.teleportPlayer(player, -1, SpawnPointLocation.CROWD, SpawnScheme.VICTORY_CONDITIONS);
    }

    private teleportPlayerToLobby(player: Player) {
        this.teleportPlayer(player, -1, SpawnPointLocation.LOBBY);
    }

    private teleportPlayer(player: Player, destIndex: number, spawnPoint: SpawnPointLocation, spawnScheme?: SpawnScheme) {
        Game.instance.gameMode?.phase?.teleportPlayer(player, spawnPoint, destIndex, spawnScheme);
    }

    private playAvatarAnimationSequence(gp: GamePlayer, sequenceId: AnimationId) {
        this.sendNetworkEvent(gp.owner, playAnimationSequence, {sequence: sequenceId});
    }

    private async onPlayerFinishedVictorySequence(endOfMatchOption:EndOfMatchOptions, player: Player) {
        clearAsyncTimeOut(this, this.afkTimeouts.get(player));
        this.afkTimeouts.set(undefined, player);
        GamePlayer.getGamePlayerOrThrow(player).shouldTeleportOnRoundStart = true;
        this.sendNetworkEvent(player, stopAllAnimationSequences, {});
        this.async.setTimeout(() => {
            this.sendNetworkEvent(player, clearCameraStack, {});
            this.sendNetworkEvent(player, removeCameraOverride, this.endingTarget!.getAnimSettings());
        }, 150);

        ServerMusicService().stopPodiumMusicFor(player);
        this.handleEndOfMatchOption(endOfMatchOption, player);
    }

    private handleEndOfMatchOption(endOfMatchOption:EndOfMatchOptions, player:Player) {
        const isEliminationGame = Game.instance.isGameMode('ELIMINATION');
        if(isEliminationGame) {
            this.teleportPlayerToLobby(player);
            switch(endOfMatchOption) {
                case EndOfMatchOptions.JOIN_NEW_GAME:
                    break;
                default:
                    break;
            }
        } else {
            switch(endOfMatchOption) {
                case EndOfMatchOptions.JOIN_NEW_GAME:
                    Game.instance.gameMode.tryToStartGameForPlayer(player)
                        .catch(error => logEx(`Unable to add ${toStringSafe(player)} to game, reason: ${error}`, 'error'));
                    break
                default:
                    this.teleportPlayerToLobby(player);
                    this.sendLocalBroadcastEvent(showLoginPromptIfNeeded, {player: player});
                    break;
            }
        }

    }

    private showAndHideBG(winners: GamePlayer[], losers: GamePlayer[], showRedBG: boolean) {
        this.props.background?.resetVisibilityForPlayers();
        this.props.backgroundRed?.resetVisibilityForPlayers();
        if (showRedBG) {
            this.props.backgroundRed?.visible.set(true);
            setVisibilityForPlayers(this.props.background, winners.map(gp => gp.owner));
            setVisibilityForPlayers(this.props.backgroundRed, losers.map(gp => gp.owner));
        } else {
            this.props.backgroundRed?.visible.set(false);
        }
    }
}
