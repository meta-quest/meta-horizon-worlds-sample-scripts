// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { CodeBlockEvents, Component, NetworkEvent, Player } from 'horizon/core';
import { FtueChapter } from 'FtueChapter';


export class FtueManager extends Component<typeof FtueManager> {
  static propsDefinition = {};

  static ChapterCompleteEvent = new NetworkEvent<{player: Player, chapterId: string}>('ftueChapterComplete');
  static TaskCompleteEvent = new NetworkEvent<{player: Player, taskId: string}>('ftueTaskComplete');

  private ftueChapters: Map<string, FtueChapter>;
  private player: Player | undefined;

  constructor() {
    super();
    this.ftueChapters = new Map<string, FtueChapter>();
    this.player = undefined;
  }

  preStart() {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, this.onPlayerEnterWorld.bind(this));
  }

  start() {}

  private onPlayerEnterWorld(player: Player)
  {
    console.log("FtueManager: onPlayerEnterWorld");
    this.player = player;

    // NOTE - EXAMPLE!! PLease remove this for your own project.
    this.startChapter(player, "TheOne");
    // ---------------------------------------------------------
  }

  public addChapter(chapter: FtueChapter) {
    this.ftueChapters.set(chapter.getChapterId(), chapter);
  }

  public startChapter(player: Player, chapterId: string) {
    if (!this.player) {
      console.error("FtueManager: startChapter - player not set");
      return;
    }

    if (!this.ftueChapters.has(chapterId)) {
      console.error("FtueManager: startChapter - chapter not found: ", chapterId);
      return;
    }

    console.log("FtueManager: startChapter - id: ", chapterId);
    this.ftueChapters.get(chapterId)!.startChapter(this.player);
  }

  public completeTask(player: Player, taskId: string) {
    console.log("FtueManager: completeTask - id: ", taskId);
    this.sendNetworkBroadcastEvent(FtueManager.TaskCompleteEvent, {player: player, taskId: taskId});
  }

  public completeChapter(player: Player, chapterId: string) {
    console.log("FtueManager: completeChapter - id: ", chapterId);
    this.sendNetworkBroadcastEvent(FtueManager.ChapterCompleteEvent, {player: player, chapterId: chapterId});
  }

}
Component.register(FtueManager);
