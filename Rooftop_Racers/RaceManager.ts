// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * This manager is responsible for tracking the player progress around the race and the race UI
 */
import * as hz from 'horizon/core';

import { Curve, PlayerGameStatus, CurveVisualizer, GameState, msToMinutesAndSeconds } from 'GameUtils';
import { Events } from "Events";
import { MatchManager } from 'MatchManager';

type RaceParticipant = { player: hz.Player, lastKnownRaceTime: number, lastKnownRaceProgress: number, lastKnownPosition: hz.Vec3 };

export class RaceManager extends hz.Component<typeof RaceManager> {

  static propsDefinition = {
    startLineRaceUI: { type: hz.PropTypes.Entity },
    finishLineRaceUI: { type: hz.PropTypes.Entity },
    trackPointsParent: { type: hz.PropTypes.Entity },
    curveVisualizer: { type: hz.PropTypes.Entity },
  };

  private raceUpdateIntervalID: number = 0;

  private raceCurve!: Curve;
  private raceParticipants = new Map<number, RaceParticipant>();
  private raceWinners = new Set<RaceParticipant>();
  private matchTime = 0;

  private startLineRaceUI: hz.TextGizmo | null = null;
  private finishLineRaceUI: hz.TextGizmo | null = null;

  private readonly defaultRaceUIText = "";

  private static s_instance: RaceManager
  public static getInstance(): RaceManager {
    return RaceManager.s_instance;
  }

  constructor() {
    super();
    if (RaceManager.s_instance === undefined) {
      RaceManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  preStart() {
    this.startLineRaceUI = this.props.startLineRaceUI!.as(hz.TextGizmo)!;
    this.finishLineRaceUI = this.props.finishLineRaceUI!.as(hz.TextGizmo)!;

    this.connectLocalBroadcastEvent(Events.onPlayerReachedGoal,
      (data) => {
        this.playerFinishedRace(data.player);
      });

    this.connectLocalBroadcastEvent(Events.onPlayerLeftMatch, (data) => {
      this.handleOnPlayerLeftMatch(data.player);
    });

    this.connectLocalBroadcastEvent(Events.onGameStateChanged, (data) => {
      if (data.fromState === GameState.EndingMatch && data.toState === GameState.CompletedMatch) {
        this.handleOnMatchEnd();
      }
      else if (data.fromState === GameState.StartingMatch && data.toState === GameState.PlayingMatch) {
        this.handleOnMatchStart();
      }
    });

    this.connectLocalBroadcastEvent(
      hz.World.onUpdate,
      (data) => {
        //match started
        if (this.raceParticipants.size > 0) {
          this.matchTime += data.deltaTime;
        }
      }
    );

    this.connectNetworkBroadcastEvent(Events.onResetWorld, (data) => { this.reset() });

    this.raceCurve = this.initCurve(this.props.trackPointsParent!.children.get()!);
    this.handleUpdateRaceUI(this.defaultRaceUIText);
    this.reset();
  }

  start() {
    this.sendLocalBroadcastEvent(CurveVisualizer.SetCurve, { curve: this.raceCurve });
  }

  private handleOnMatchStart() {
    this.handleUpdateRaceUI(this.defaultRaceUIText);

    const distThresholdCheckProgress = 0.5;
    const players = MatchManager.getInstance().getPlayersWithStatus(PlayerGameStatus.Playing);

    for (let i = 0; i < players.length; i++) {
      this.raceParticipants.set(
        players[i].id,
        {
          player: players[i],
          lastKnownRaceTime: 0,
          lastKnownRaceProgress: 0,
          lastKnownPosition: hz.Vec3.zero
        });

    }
    //start to regularly calculate the race progress of the players
    this.raceUpdateIntervalID = this.async.setInterval(() => {
      this.updateAllRacerCurveProgress(distThresholdCheckProgress);

      //sort the players by their progress, descending curve progress order
      const racePositions = Array.from(this.raceParticipants.values()).sort((a, b) => {
        return b.lastKnownRaceProgress - a.lastKnownRaceProgress;
      });

      racePositions.forEach((entry, index) => {
        if (entry.player && !this.raceWinners.has(entry)) {
          this.sendNetworkEvent(entry.player,
            Events.onRacePosUpdate, {
            playerPos: (index + 1),
            totalRacers: this.raceParticipants.size,
            matchTime: this.matchTime
          });
        }
      });
    }, 500);
  }

  private updateAllRacerCurveProgress(distThresholdCheckProgress: number) {
    this.raceParticipants.forEach((participant) => {
      const plyr = participant.player;
      if (!plyr || this.raceWinners.has(participant)) { return; }
      const plyrPos = participant.player.position.get();

      //Player has appreciably moved since last position, update the process
      if (plyrPos.distanceSquared(participant.lastKnownPosition) > distThresholdCheckProgress) {
        participant.lastKnownRaceProgress = this.raceCurve.findClosestPointCurveProgress(plyrPos);
        participant.lastKnownRaceTime = this.matchTime;
        participant.lastKnownPosition = plyrPos;
      }
    });
  }

  private handleOnMatchEnd() {

    //Add the missing players to the roll call  as did not finish
    let rollCall = this.getWinnerRollCallString(Array.from(this.raceWinners.keys()));
    const raceParticipants = Array.from(this.raceParticipants.values());
    for(let rp of raceParticipants){

      if(!this.raceWinners.has(rp))
      {
        rollCall += `Did Not Finish\t${rp.player.name.get()}\t[${msToMinutesAndSeconds(rp.lastKnownRaceTime)}]\n`;
      }
    }
    this.handleUpdateRaceUI(rollCall);

    this.reset();
  }

  private handleOnPlayerLeftMatch(player: hz.Player): void {
    if (player) {
      const rp = this.raceParticipants.get(player.id);
      if (rp) {
        this.raceWinners.delete(rp);
        this.raceParticipants.delete(player.id);
      }
      console.log(`${this.constructor.name} Removed player ${player.name.get()}`);
    }
    else {
      console.warn(`${this.constructor.name} Removed null player`);
    }
  }

  private initCurve(chckObjs: hz.Entity[]): Curve {
    let points: hz.Vec3[] = [];
    chckObjs!.forEach((checkpoint) => {
      points.push(checkpoint.position.get());
    });

    return new Curve(points);
  }

  private handleUpdateRaceUI(text: string): void {
    this.startLineRaceUI!.text.set(text);
    this.finishLineRaceUI!.text.set(text);
  }

  private playerFinishedRace(player: hz.Player) {
    if (!player) { return; }

    const rp = this.raceParticipants.get(player.id);
    if (rp! && !this.raceWinners.has(rp)) {
      this.sendNetworkEvent(player, Events.onStopRacePosUpdates, {});

      this.raceWinners.add(rp);

      rp.lastKnownRaceProgress = 1;
      rp.lastKnownRaceTime = this.matchTime;

      this.handleUpdateRaceUI(
        this.getWinnerRollCallString(Array.from(this.raceWinners.keys()))
      );
    }
  }

  private getWinnerRollCallString(winningPlayers: Array<RaceParticipant>) {
    let rollCall = this.defaultRaceUIText;
    const winString = ["1st: ", "2nd: ", "3rd: ", "4th: ", "5th: ", "6th: ", "7th: ", "8th: "];

    const maxNumOfWinners = Math.min(winString.length, winningPlayers.length);
    for (let i = 0; i < maxNumOfWinners; i++) {
      const rp = winningPlayers[i];
      rollCall += `${winString[i]}\t${rp.player.name.get()}\t[${msToMinutesAndSeconds(rp.lastKnownRaceTime)}]\n`;
    }

    return rollCall;
  }

  private reset() {
    console.warn("RACE RESET");

    this.async.clearInterval(this.raceUpdateIntervalID);

    this.raceParticipants.forEach((data) => { this.sendNetworkEvent(data.player, Events.onStopRacePosUpdates, {}) });

    this.raceUpdateIntervalID = 0;
    this.raceParticipants.clear();
    this.raceWinners.clear();
    this.matchTime = 0;
  }

  dispose() { this.reset(); }
}

hz.Component.register(RaceManager);
