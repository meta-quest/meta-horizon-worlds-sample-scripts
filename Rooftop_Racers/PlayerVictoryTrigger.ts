// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Extended class for setting Player victory state info
 */
import * as hz from 'horizon/core';
import { Events } from "Events";
import { PlayerFireEventOnTriggerBase } from 'PlayerEventTriggerBase';

class PlayerVictoryTrigger extends PlayerFireEventOnTriggerBase<typeof PlayerVictoryTrigger> {

  static propsDefinition = {
    particle1: { type: hz.PropTypes.Entity },
    particle2: { type: hz.PropTypes.Entity },
  };

  protected onEntityEnterTrigger(_enteredBy: hz.Entity): void { }
  protected onEntityExitTrigger(_exitedBy: hz.Entity): void { }
  protected onPlayerExitTrigger(_exitedBy: hz.Player): void { }

  protected onPlayerEnterTrigger(enteredBy: hz.Player): void {
    console.warn('Player entered victory trigger', enteredBy.name.get());
    this.sendLocalBroadcastEvent(Events.onPlayerReachedGoal, { player: enteredBy });
    if (this.props.particle1 && this.props.particle2) {
      this.props.particle1.as(hz.ParticleGizmo)?.play();
      this.props.particle2.as(hz.ParticleGizmo)?.play();
    }
  }
}
hz.Component.register(PlayerVictoryTrigger);
