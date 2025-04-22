// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueManager } from 'FtueManager';
import { FtueTask, FtueTaskUI, IFtueTask } from 'FtueTask';
import { Component, Player, PropTypes } from 'horizon/core';

export class FtueChapter extends Component<typeof FtueChapter> {
  static propsDefinition = {
    chapterId: {type: PropTypes.String},
    ftueManager: {type: PropTypes.Entity},
    testArray: {type: PropTypes.EntityArray},
  };

  private tasks : Map<string, any>;
  private taskNames: Array<string>;
  private playerIndices: Map<Player, number>;
  private ftueManager: FtueManager | undefined;

  constructor() {
    super();
    this.tasks = new Map<string, any>();
    this.taskNames = [];
    this.playerIndices = new Map<Player, number>();
  }

  start() {
    console.log('FtueChapter started');
    if (this.props.ftueManager)
    {
      this.ftueManager = this.props.ftueManager.getComponents(FtueManager)[0];
      this.ftueManager.addChapter(this);
    }

    // Get the task order based on children order in the editor
    let nameSet = new Set<string>();
    this.entity.children.get().forEach((child) => {
      let taskName = child.name.get();

      if (nameSet.has(taskName))
      {
        console.error("start(): Task name already taken: ", taskName);
        return;
      }

      nameSet.add(taskName);
      this.taskNames.push(taskName);
    });
  }

  public getChapterId() {
    return this.props.chapterId;
  }

  public addTask(task: FtueTask<any> | FtueTaskUI<any>) {
    let taskName = task.entity.name.get();
    if (this.tasks.has(taskName))
    {
      console.error("addTask(): Task name already taken: ", taskName);
      return;
    }

    this.tasks.set(taskName, task);
  }

  public startChapter(player: Player) {
    this.playerIndices.set(player, -1);
    this.nextTask(player);
  }

  public completeTask(player: Player, taskId: string) {
    this.ftueManager!.completeTask(player, taskId);
    this.nextTask(player);
  }

  private nextTask(player: Player) {
    // Invalid
    if (!this.playerIndices.has(player)) {
      return
    }

    let taskIndex = this.playerIndices.get(player)! + 1

    // Finished last task, complete chapter
    if (taskIndex >= this.taskNames.length)
    {
      this.ftueManager!.completeChapter(player, this.props.chapterId);
      this.playerIndices.delete(player);
      return;
    }

    this.playerIndices.set(player, taskIndex);
    (this.tasks.get(this.taskNames[taskIndex])! as IFtueTask).startTask(player);
  }

  public forceCompleteChapter(player : Player) {
    this.ftueManager!.completeChapter(player, this.props.chapterId);
    this.playerIndices.delete(player);
  }
}
Component.register(FtueChapter);
