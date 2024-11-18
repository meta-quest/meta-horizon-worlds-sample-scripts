// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { AttachableEntity, AttachablePlayerAnchor, Component, Player} from 'horizon/core';

export class PlayerHUD extends Behaviour<typeof PlayerHUD> {
  static propsDefinition = {};

  static instance: PlayerHUD;

  Start() {
    PlayerHUD.instance = this;
  }

  public AttachHUD(player: Player) {
    this.entity.owner.set(player);
    console.log('Attaching HUD to player: ' + this.entity.owner.get().name.get());
    var attachableHUD = this.entity.as(AttachableEntity);
    console.log('attachableHUD: ' + attachableHUD);
    attachableHUD?.detach();
    attachableHUD?.attachToPlayer(this.entity.owner.get(), AttachablePlayerAnchor.Head);
  }
}
Component.register(PlayerHUD);
