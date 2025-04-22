// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueTask, FtueTaskUI } from 'FtueTask';
import { Component, Entity, Player, PropTypes} from 'horizon/core';

export class FtueTaskSpawnSubtask extends FtueTask<typeof FtueTaskSpawnSubtask> {
  static propsDefinition = {
    ...FtueTask.propsDefinition,
    taskAsset: {type: PropTypes.Asset},
  };

  private subtaskMap: Map<Player, Entity> = new Map<Player, Entity>();

  onTaskStart(player: Player): void {
    if (!this.props.taskAsset) {
      return;
    }

    this.world.spawnAsset(this.props.taskAsset, player.position.get()).then((entities) => {
      // Should be only one entity
      if (entities.length !== 1) {
        console.error('FtueTaskSpawnSubtask: Expected 1 entity, got ' + entities.length);
      }

      entities.forEach((entity) => {
        this.subtaskMap.set(player, entity);

        // Get Components doesn't support interfaces so we do both
        let taskComponent = entity.getComponents(FtueTask<any>)[0] ?
          entity.getComponents(FtueTask<any>)[0] :
          entity.getComponents(FtueTaskUI<any>)[0];

        if (taskComponent) {
          taskComponent.setParentTask(this);
          taskComponent.startTask(player);
        }
      });
    });
  }

  onTaskComplete(player: Player): void {
    this.world.deleteAsset(this.subtaskMap.get(player)!);
    this.subtaskMap.delete(player);
  }
}
Component.register(FtueTaskSpawnSubtask);
