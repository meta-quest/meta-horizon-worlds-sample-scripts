// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Events, WaveManagerNetworkEvents } from 'Events';
import { Component, Vec3 } from 'horizon/core';
import { PlayerManager } from 'PlayerManager';

/** This script must be added to a game object in order to run */
class GameManager extends Behaviour<typeof GameManager> {
  static propsDefinition = {};

  timerID: number = 0;
  countdownTimeInMS: number = 3000;

  Awake() {
    this.connectNetworkBroadcastEvent(WaveManagerNetworkEvents.FightEnded, () => {
      this.handleGameOver();
    });
  }

  /* Displays a 3 second count down to all players */
  handleGameOver() {
    if (this.timerID === 0) {
      this.world.ui.showPopupForEveryone(`Game Over! \n Teleporting back to Lobby`, 3, {position : new Vec3(0, -0.25, 0)});
      this.timerID = this.async.setTimeout(() => {
        this.sendNetworkBroadcastEvent(Events.gameReset, {});
        PlayerManager.instance.resetAllPlayers();
        this.async.clearTimeout(this.timerID);
        this.timerID = 0;
      }, 3000);
    }
  }
}
Component.register(GameManager);
