// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<<Advanced>>>

import { StateConfigRecord, StateCallbacks, StateCallbackConfig, StateTimer, NextStateEdges } from "StateMachine";

export enum GameMode{
  Ready = "Ready",
  Start = "Start",
  GameOver = "GameOver",
}

// Configure your state machine here
export class GameModesConfig{
  static stateConfigName:string = "GameModes";
  static states:StateConfigRecord[] = [
    new StateConfigRecord(
      GameMode.Ready,
      [
        // Callbacks
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {}),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  () => {}),
        new StateCallbackConfig(StateCallbacks.OnExit,  () => {}),
      ],
      [
        // Conditional state transitions
        // new NextStateEdges( <Condition>, [[<NextState>, <Odds [0.0-1.0]>>], [<NextState>, <Odds [0.0-1.0]>>], ...]),
        // to have transition after a certain time (in seconds)
        // new NextStateEdges( () => StateTimer.time.get(GameModesConfig.stateConfigName)! > <TimeInSeconds>, [[GameMode.Start, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      GameMode.Start,
      [
        // Callbacks
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          console.log("GameMode.Start OnEnter");
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  () => {}),
        new StateCallbackConfig(StateCallbacks.OnExit,  () => {}),
      ],
      [
        // Conditional state transitions
        new NextStateEdges( () => StateTimer.time.get(GameModesConfig.stateConfigName)! > 5, [[GameMode.GameOver, 1.0]])
      ]
    ),

    new StateConfigRecord(
      GameMode.GameOver,
      [
        // Callbacks
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          console.log("GameMode.GameOver OnEnter");
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  () => {}),
        new StateCallbackConfig(StateCallbacks.OnExit,  () => {}),
      ],
      [
        // Conditional state transitions
      ]
    ),
  ]
}
