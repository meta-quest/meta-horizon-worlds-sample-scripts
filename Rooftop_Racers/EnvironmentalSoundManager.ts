// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Controls the playing of sounds that are heard by all players throughout the world, based on the game state.
 * Examples include the countdown to race start.
 */
import * as hz from 'horizon/core';
import { GameState, Pool } from 'GameUtils';
import { Events } from "Events";

export class EnvironmentalSoundManager extends hz.Component<typeof EnvironmentalSoundManager> {
  static propsDefinition = {
    LobbyBGAudio: { type: hz.PropTypes.Entity },
    LobbyReadyUpBGAudio: { type: hz.PropTypes.Entity },
    RaceBGAudio: { type: hz.PropTypes.Entity },

    countdown10VO: { type: hz.PropTypes.Entity },
    countdown3VO: { type: hz.PropTypes.Entity },
    countdown2VO: { type: hz.PropTypes.Entity },
    countdown1VO: { type: hz.PropTypes.Entity },

    matchStartedVO: { type: hz.PropTypes.Entity }, //plays when transiting from StartingMatch to PlayingMatch
    matchEndingVO: { type: hz.PropTypes.Entity },  //plays when transiting from PlayingMatch to EndingMatch (firstPlayer has reached)
    matchEndedVO: { type: hz.PropTypes.Entity },   //plays when transiting from EndingMatch to CompletedMatch
  };

  private static s_instance: EnvironmentalSoundManager
  public static getInstance(): EnvironmentalSoundManager {
    return EnvironmentalSoundManager.s_instance;
  }

  constructor() {
    super();
    if (EnvironmentalSoundManager.s_instance === undefined) {
      EnvironmentalSoundManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  LobbyBGAudio: hz.AudioGizmo | null = null;
  LobbyReadyUpBGAudio: hz.AudioGizmo | null = null;
  RaceBGAudio: hz.AudioGizmo | null = null;

  countdown1VO: hz.AudioGizmo | null = null;
  countdown2VO: hz.AudioGizmo | null = null;
  countdown3VO: hz.AudioGizmo | null = null;
  countdown10VO: hz.AudioGizmo | null = null;

  matchStartedVO: hz.AudioGizmo | null = null;
  matchEndedVO: hz.AudioGizmo | null = null;

  matchEndingVO: hz.AudioGizmo | null = null;

  readonly BGMAudioOptions: hz.AudioOptions = { fade: 2 };
  readonly VOAudioOptions: hz.AudioOptions = { fade: 0 };

  preStart() {
    this.LobbyBGAudio = this.props.LobbyBGAudio?.as(hz.AudioGizmo) ?? null;
    this.LobbyReadyUpBGAudio = this.props.LobbyReadyUpBGAudio?.as(hz.AudioGizmo) ?? null;
    this.RaceBGAudio = this.props.RaceBGAudio?.as(hz.AudioGizmo) ?? null;

    this.countdown10VO = this.props.countdown10VO?.as(hz.AudioGizmo) ?? null;
    this.countdown3VO = this.props.countdown3VO?.as(hz.AudioGizmo) ?? null;
    this.countdown2VO = this.props.countdown2VO?.as(hz.AudioGizmo) ?? null;
    this.countdown1VO = this.props.countdown1VO?.as(hz.AudioGizmo) ?? null;

    this.matchStartedVO = this.props.matchStartedVO?.as(hz.AudioGizmo) ?? null;
    this.matchEndingVO = this.props.matchEndingVO?.as(hz.AudioGizmo) ?? null;
    this.matchEndedVO = this.props.matchEndedVO?.as(hz.AudioGizmo) ?? null;

    this.LobbyBGAudio?.play(this.BGMAudioOptions);
    this.connectLocalBroadcastEvent(Events.onGameStateChanged, (data) => {

      if (data.fromState === GameState.ReadyForMatch && data.toState === GameState.StartingMatch) {
        this.RaceBGAudio?.stop(this.BGMAudioOptions);
        this.LobbyReadyUpBGAudio?.play(this.BGMAudioOptions);
        this.LobbyBGAudio?.stop(this.BGMAudioOptions);

      }
      else if (data.fromState === GameState.StartingMatch && data.toState === GameState.PlayingMatch) {

        this.RaceBGAudio?.play(this.BGMAudioOptions);
        this.LobbyReadyUpBGAudio?.stop(this.BGMAudioOptions);
        this.LobbyBGAudio?.stop(this.BGMAudioOptions);

        this.matchStartedVO?.play(this.VOAudioOptions);

      }
      else if (data.toState === GameState.ReadyForMatch) {
        this.RaceBGAudio?.stop(this.BGMAudioOptions);
        this.LobbyReadyUpBGAudio?.stop(this.BGMAudioOptions);
        this.LobbyBGAudio?.play(this.BGMAudioOptions);

      } else if (data.toState === GameState.EndingMatch) {
        this.matchEndingVO?.play(this.VOAudioOptions);

      } else if (data.toState === GameState.CompletedMatch) {
        this.matchEndedVO?.play(this.VOAudioOptions);

      }
    });

    this.connectLocalBroadcastEvent(Events.onGameStartTimeLeft, (data) => {
      const timeLeftMS = data.timeLeftMS;
      if (timeLeftMS <= 3500 && timeLeftMS > 2500) {
        this.countdown3VO?.play(this.VOAudioOptions);
      }
      else if (timeLeftMS <= 2500 && timeLeftMS > 1500) {
        this.countdown2VO?.play(this.VOAudioOptions);
      }
      else if (timeLeftMS <= 1500) {
        this.countdown1VO?.play(this.VOAudioOptions);
      }
    });

    this.connectLocalBroadcastEvent(Events.onGameEndTimeLeft, (data) => {
      const timeLeftMS = data.timeLeftMS;
      if (timeLeftMS <= 10500 && timeLeftMS > 9500) {
        this.countdown10VO?.play(this.VOAudioOptions);
      }
      else
        if (timeLeftMS <= 3500 && timeLeftMS > 2500) {
          this.countdown3VO?.play(this.VOAudioOptions);
        }
        else if (timeLeftMS <= 2500 && timeLeftMS > 1500) {
          this.countdown2VO?.play(this.VOAudioOptions);
        }
        else if (timeLeftMS <= 1500) {
          this.countdown1VO?.play(this.VOAudioOptions);
        }
    });
  }

  start() {
  }
}

hz.Component.register(EnvironmentalSoundManager);
