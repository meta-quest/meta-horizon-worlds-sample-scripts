// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Controls the overall game state of the world, listening to events occurring and transiting the game state accordingly
 */
import * as hz from 'horizon/core';
import { Events } from "Events";
import { timedIntervalActionFunction, GameState, PlayerGameStatus } from 'GameUtils';
import { MatchManager } from 'MatchManager';

export class GameManager extends hz.Component<typeof GameManager> {

  static propsDefinition = {
    startLineGameStateUI: { type: hz.PropTypes.Entity },
    finishLineGameStateUI: { type: hz.PropTypes.Entity },

    timeToMatchStartMS: { type: hz.PropTypes.Number, default: 3000 },
    timeToMatchEndMS: { type: hz.PropTypes.Number, default: 3000 },
    timeNewMatchReadyMS: { type: hz.PropTypes.Number, default: 3000 },

    minTimeToShowStartPopupsMS: { type: hz.PropTypes.Number, default: 3000 },
    minTimeToShowEndPopupsMS: { type: hz.PropTypes.Number, default: 10000 },

    playersNeededForMatch: { type: hz.PropTypes.Number, default: 1 },
  };

  private currentGameState = GameState.ReadyForMatch;
  private startMatchTimerID = 0;
  private endMatchTimerID = 0;
  private newMatchTimerID = 0;

  private startLineGameStateUI: hz.TextGizmo | null = null;
  private finishLineGameStateUI: hz.TextGizmo | null = null;

  static s_instance: GameManager

  constructor() {
    super();
    if (GameManager.s_instance === undefined) {
      GameManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  preStart() {
    this.currentGameState = GameState.ReadyForMatch;
    this.startLineGameStateUI = this.props.startLineGameStateUI!.as(hz.TextGizmo)!;
    this.finishLineGameStateUI = this.props.finishLineGameStateUI!.as(hz.TextGizmo)!;

    this.connectLocalBroadcastEvent(Events.onPlayerJoinedStandby,
      () => {
        const totalPlayerStandby = MatchManager.getInstance().getPlayersWithStatus(PlayerGameStatus.Standby).length;
        if (totalPlayerStandby >= this.props.playersNeededForMatch) {
          this.transitFromReadyToStarting();
        }
      });


    //If players leave the match and are in standby, if there are too little players to start the match, we need to transit to ready
    this.connectLocalBroadcastEvent(Events.onPlayerLeftStandby,
      () => {
        const totalPlayerInStandby = MatchManager.getInstance().getPlayersWithStatus(PlayerGameStatus.Standby).length;
        if (totalPlayerInStandby < this.props.playersNeededForMatch) {

          if (this.currentGameState === GameState.StartingMatch) {
            this.transitFromStartingToReady();
          }
          else {
            console.error("invalid state to transition from");
          }
        }
      });

    //handle the case where there the last player leaves the world
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitWorld, (player: hz.Player) => {

      if (this.world.getPlayers().length === 0) {
        this.sendNetworkBroadcastEvent(Events.onResetWorld, {});
        console.warn("All players left, resetting world");
      }

      this.reset();
    });

    this.connectLocalBroadcastEvent(Events.onPlayerReachedGoal,
      () => {
        this.transitFromPlayingToEnding();
      });
  }

  start() { }

  private transitGameState(fromState: GameState, toState: GameState) {

    if (fromState === toState) {
      console.warn(`Trying to transit to the same state ${GameState[fromState]}, skipping`)
      return false;
    }
    else if (fromState !== this.currentGameState) {
      console.warn(`Trying to transit from ${GameState[fromState]} when Current state is ${GameState[this.currentGameState]} `)
      return false;
    }
    else {
      console.log(`transiting from ${GameState[fromState]} to ${GameState[toState]}`)
      this.currentGameState = toState;
      this.sendLocalBroadcastEvent(Events.onGameStateChanged, { fromState, toState });
      return true;
    }
  }

  private transitFromStartingToReady(): void {
    const transited = this.transitGameState(GameState.StartingMatch, GameState.ReadyForMatch);
    if (!transited) return;

    this.reset();
  }

  private transitFromCompletedToReady(): void {
    const transited = this.transitGameState(GameState.CompletedMatch, GameState.ReadyForMatch);
    if (!transited) return;

    this.reset();
  }

  private transitFromReadyToStarting(): void {
    const transited = this.transitGameState(GameState.ReadyForMatch, GameState.StartingMatch);
    if (!transited) return;

    this.startMatchTimerID = timedIntervalActionFunction(this.props.timeToMatchStartMS, this,
      (timerMS) => {
        const infoStr = `Match Starting in ${timerMS / 1000}!`;
        this.updateGameStateUI(infoStr);
        this.sendLocalBroadcastEvent(Events.onGameStartTimeLeft, { timeLeftMS: timerMS });
        if (timerMS < this.props.minTimeToShowStartPopupsMS) {
          this.world.ui.showPopupForEveryone(infoStr, 1);
        }
      },
      this.transitFromStartingToPlaying.bind(this)
    );
  }

  private transitFromStartingToPlaying(): void {
    const transited = this.transitGameState(GameState.StartingMatch, GameState.PlayingMatch);
    if (!transited) return;

    this.updateGameStateUI(`Game On!`);
  }

  private transitFromPlayingToEnding(): void {
    const transited = this.transitGameState(GameState.PlayingMatch, GameState.EndingMatch);

    if (!transited) return;

    this.endMatchTimerID = timedIntervalActionFunction(this.props.timeToMatchEndMS, this,
      (timerMS) => {
        const infoStr = `Match Ending in ${timerMS / 1000}!`;
        this.updateGameStateUI(infoStr);
        if (timerMS < this.props.minTimeToShowEndPopupsMS) {
          this.world.ui.showPopupForEveryone(infoStr, 1);
        }

        this.sendLocalBroadcastEvent(Events.onGameEndTimeLeft, { timeLeftMS: timerMS });
      },
      this.transitFromEndingToCompleted.bind(this)
    );
  }

  private transitFromEndingToCompleted(): void {
    const transited = this.transitGameState(GameState.EndingMatch, GameState.CompletedMatch);
    if (!transited) return;

    //now transit from Completed to Ready
    this.newMatchTimerID = timedIntervalActionFunction(this.props.timeNewMatchReadyMS, this,
      (timerMS) => {
        const infoStr = `New Match Available in  ${timerMS / 1000}!`;
        this.updateGameStateUI(infoStr);
        this.world.ui.showPopupForEveryone(infoStr, this.props.timeNewMatchReadyMS / 1000);

      },
      this.transitFromCompletedToReady.bind(this)
    );
  }

  private updateGameStateUI(text: string): void {
    this.startLineGameStateUI?.text.set(text);
    this.finishLineGameStateUI?.text.set(text);
  }

  private reset() {
    this.currentGameState = GameState.ReadyForMatch;
    this.updateGameStateUI('Ready');
    this.async.clearInterval(this.startMatchTimerID);
    this.async.clearInterval(this.endMatchTimerID);
    this.async.clearInterval(this.newMatchTimerID);
  }

  dispose() { this.reset(); }
}

hz.Component.register(GameManager);
