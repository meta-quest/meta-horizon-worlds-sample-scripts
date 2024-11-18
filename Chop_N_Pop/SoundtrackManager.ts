// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Events, WaveManagerNetworkEvents } from 'Events';
import { AudioGizmo, Component, Player, PropTypes } from 'horizon/core';

export enum SountrackStates {
  Lobby,
  Battle,
  Boss,
  End,
}

export enum SountrackOneOffs {
  Death,
}

export class SoundtrackManager extends Behaviour<typeof SoundtrackManager> {
  static propsDefinition = {
    lobbyMusic: {type: PropTypes.Entity},
    battleMusic: {type: PropTypes.Entity},
    bossMusic: {type: PropTypes.Entity},
    endMusic: {type: PropTypes.Entity},
    deathStinger: {type: PropTypes.Entity},
  };

  private stateTracks = new Map<SountrackStates, AudioGizmo | null>();
  private oneOffTracks = new Map<SountrackOneOffs, AudioGizmo | null>();
  private currentTrack: AudioGizmo | null = null;

  Start() {
    if (this.props.lobbyMusic) {
      this.stateTracks.set(SountrackStates.Lobby, this.props.lobbyMusic.as(AudioGizmo));
    }
    if (this.props.battleMusic) {
      this.stateTracks.set(SountrackStates.Battle, this.props.battleMusic.as(AudioGizmo));
    }
    if (this.props.bossMusic) {
      this.stateTracks.set(SountrackStates.Boss, this.props.bossMusic.as(AudioGizmo));
    }
    if (this.props.endMusic) {
      this.stateTracks.set(SountrackStates.End, this.props.endMusic.as(AudioGizmo));
    }

    if (this.props.deathStinger) {
      this.oneOffTracks.set(SountrackOneOffs.Death, this.props.deathStinger.as(AudioGizmo));
    }

    this.playMusicState(SountrackStates.Lobby);
    this.registerEventListeners();
  }

  private registerEventListeners() {
    this.connectNetworkBroadcastEvent(WaveManagerNetworkEvents.FightStarted, (data) => {
      this.playMusicState(SountrackStates.Battle);
    });
    this.connectNetworkBroadcastEvent(WaveManagerNetworkEvents.StartingWave, (data : {waveGroupName: string, waveNumber : number}) => {
      if (data.waveNumber == 3) {
        this.playMusicState(SountrackStates.Boss);
      }
    });

    this.connectNetworkBroadcastEvent(WaveManagerNetworkEvents.FightEnded, (data) => {
      this.playMusicState(SountrackStates.End);
      this.async.setTimeout(() => {
        this.playMusicState(SountrackStates.Lobby);
      }, 3500);
    });

    // Player died
    this.connectNetworkBroadcastEvent(Events.playerDeath, (data : {player : Player}) => {
      this.playOneOff(SountrackOneOffs.Death);
    });
  }

  private playMusicState(state: SountrackStates) {
    this.currentTrack?.stop();

    if (this.stateTracks.has(state)) {
      const audio = this.stateTracks.get(state);
      if (audio) {
        audio.play();
        this.currentTrack = audio;
      }
    }
  }

  private playOneOff(oneOff: SountrackOneOffs) {
    if (this.oneOffTracks.has(oneOff)) {
      const audio = this.oneOffTracks.get(oneOff);
      if (audio) {
        audio.play();
      }
    }
  }

}
Component.register(SoundtrackManager);
