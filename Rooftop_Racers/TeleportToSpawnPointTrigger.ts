// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Extended class that teleports the entering player to a specific spawn point
 */
import * as hz from 'horizon/core';
import { PlayerFireEventOnTriggerBase } from 'PlayerEventTriggerBase';

class TeleportToSpawnPointTrigger extends PlayerFireEventOnTriggerBase<typeof TeleportToSpawnPointTrigger>{

  static propsDefinition = {
    spawnPoint: { type: hz.PropTypes.Entity }
  };

  protected onEntityEnterTrigger(_enteredBy: hz.Entity): void { }
  protected onEntityExitTrigger(_exitedBy: hz.Entity): void { }
  protected onPlayerExitTrigger(_exitedBy: hz.Player): void { }

  protected onPlayerEnterTrigger(enteredBy: hz.Player): void {
    console.warn(`teleported ${enteredBy.name.get()} to ${this.props.spawnPoint!.name.get()}`);
    this.props.spawnPoint!.as(hz.SpawnPointGizmo)!.teleportPlayer(enteredBy);
  }

}
hz.Component.register(TeleportToSpawnPointTrigger);
