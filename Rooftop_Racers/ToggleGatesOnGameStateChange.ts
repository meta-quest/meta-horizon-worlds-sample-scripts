// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Works with gamestate to specifically control the gates to the start of a Match
 */
import { GameState } from 'GameUtils';
import { Events } from "Events";
import * as hz from 'horizon/core';

class ToggleGatesOnGameStateChange extends hz.Component<typeof ToggleGatesOnGameStateChange> {

  static propsDefinition = {
    //in the future, when there is an entity array, we can use that, but for now,
    //we hard code all the barriers access and use the parent objects if needed
    enterGate1: { type: hz.PropTypes.Entity },
    enterGate2: { type: hz.PropTypes.Entity },

    exitGate1: { type: hz.PropTypes.Entity },
    exitGate2: { type: hz.PropTypes.Entity },
  };

  preStart() {

    this.prepareStartAreaForRace();

    this.connectLocalBroadcastEvent(
      Events.onGameStateChanged,
      (data) => {
        if (data.fromState === GameState.StartingMatch && data.toState === GameState.PlayingMatch) {
          this.closeStartAreaForMatch();
        }
        else if (data.toState === GameState.CompletedMatch || data.toState === GameState.ReadyForMatch) {
          this.prepareStartAreaForRace();
        }
      });
  }

  start() { }

  private closeStartAreaForMatch() {
    this.setBarrierActive(true, this.props.enterGate1);
    this.setBarrierActive(true, this.props.enterGate2);

    this.setBarrierActive(false, this.props.exitGate1);
    this.setBarrierActive(false, this.props.exitGate2);
  }

  private prepareStartAreaForRace() {
    this.setBarrierActive(false, this.props.enterGate1);
    this.setBarrierActive(false, this.props.enterGate2);

    this.setBarrierActive(true, this.props.exitGate1);
    this.setBarrierActive(true, this.props.exitGate2);
  }

  private setBarrierActive(isActivated: boolean, barrierEntity: hz.Entity | undefined) {
    barrierEntity?.collidable.set(isActivated);

    //we animated the barrier if it has an animation, otherwise we just show/hide it
    const animEnt = barrierEntity?.as(hz.AnimatedEntity);
    if (animEnt) {
      if (isActivated) {
        animEnt.stop();
      }
      else {
        animEnt.play();
      }
    }
    else {
      barrierEntity?.visible.set(isActivated);
    }
  }

  dispose() { }

}
hz.Component.register(ToggleGatesOnGameStateChange);
