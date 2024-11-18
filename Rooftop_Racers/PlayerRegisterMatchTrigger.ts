// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Extended class for new lobby players to join or leave a match
 */
import * as hz from 'horizon/core';
import { Events } from "Events";
import { PlayerFireEventOnTriggerBase } from 'PlayerEventTriggerBase';

class PlayerRegisterMatchTrigger extends PlayerFireEventOnTriggerBase<typeof PlayerRegisterMatchTrigger> {
  protected onEntityEnterTrigger(_enteredBy: hz.Entity): void { }
  protected onEntityExitTrigger(_exitedBy: hz.Entity): void { }

  // We do not make the player deregister from standby as we want to reduce trolling from players leaving and entering the zone
  // also encourages more race starts
  protected onPlayerExitTrigger(exitedBy: hz.Player): void {
    this.sendLocalBroadcastEvent(Events.onDeregisterPlayerForMatch, { player: exitedBy });
  }

  protected onPlayerEnterTrigger(enteredBy: hz.Player): void {
    this.sendLocalBroadcastEvent(Events.onRegisterPlayerForMatch, { player: enteredBy });
  }
}
hz.Component.register(PlayerRegisterMatchTrigger);
