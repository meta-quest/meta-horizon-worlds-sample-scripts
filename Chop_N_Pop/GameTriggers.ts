// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { EnemyWaveManager } from 'EnemyWaveManager';
import { Events, WaveManagerNetworkEvents } from 'Events';
import { FogWall } from 'FogWall';
import { CodeBlockEvents, Component, Player, PropTypes } from 'horizon/core';
import { PlayerManager } from 'PlayerManager';

class StartCombat extends Behaviour<typeof StartCombat> {
  static propsDefinition = {
    waveManager: {type: PropTypes.Entity},
    fogWall: {type: PropTypes.Entity},
  };

  start() {
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerEnterTrigger,
      (player: Player) => {
        var managerName = (BehaviourFinder.GetBehaviour(this.props.waveManager!) as EnemyWaveManager).name;
        this.sendNetworkEvent(this.props.waveManager!, WaveManagerNetworkEvents.StartWaveGroup, {waveGroupName: managerName});
        PlayerManager.instance.gamePlayers.moveToMatch(player);
        BehaviourFinder.GetBehaviour<FogWall>(this.props.fogWall)?.hide();
      }
    );

    this.connectNetworkBroadcastEvent(Events.gameReset, (data) => {
      BehaviourFinder.GetBehaviour<FogWall>(this.props.fogWall)?.show();
    });
  }
}
Component.register(StartCombat);
