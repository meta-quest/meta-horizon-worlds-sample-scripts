// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <Beginner>

import { Singleton } from "Singleton";
import { StateMachine } from "StateMachine";
import { GameMode, GameModesConfig } from "GameModes";
import { Component, PropTypes } from "horizon/core";
import { EntityTransformer, generateGuid } from "Utils";

export class GameManager extends Singleton<typeof GameManager> {
  static propsDefinition = {
  };

  // Singleton instance of the GameManager
  static instance: GameManager;

  private gameModeStateMachine: StateMachine;
  private updateSubs: Map<string, (timeDelta: number) => void>;

  constructor() {
    super();
    this.gameModeStateMachine = new StateMachine(Object.values(GameMode), GameModesConfig.states, GameModesConfig.stateConfigName, true);
    this.updateSubs = new Map<string, (timeDelta: number) => void>();
  }

  public Awake() {
    this.gameModeStateMachine.changeState(GameMode.Ready);
  }

  protected override Update(timeDelta: number) {
    this.gameModeStateMachine.update(timeDelta);
    EntityTransformer.update(timeDelta);
    this.updateSubs.forEach((updateFunc: (timeDelta: number) => void, key: string,) => {
      updateFunc(timeDelta);
    });
  }

  public subscribeToUpdates(update: (timeDelta: number) => void): string {
    const id = generateGuid();
    this.updateSubs.set(id, update);
    return id;
  }

  public unsubscribeFromUpdates(id: string) {
    this.updateSubs.delete(id);
  }

  public OnStateTimer(time: number) {
    return this.gameModeStateMachine.timer > time;
  }
}
Component.register(GameManager);
