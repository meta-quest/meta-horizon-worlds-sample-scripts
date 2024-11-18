// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Manages the local player control inputs, initializing them and managing ownership
 */
import * as hz from 'horizon/core';
import { Pool, } from 'GameUtils';
import { Events } from "Events";

export interface PlayerControllerManagerProps {
  doubleJumpAmount: number,
  boostJumpAmount: number,
  boostJumpAngle: number
}

export class PlayerControllerManager extends hz.Component<typeof PlayerControllerManager> {
  static propsDefinition = {
    doubleJumpAmount: { type: hz.PropTypes.Number, default: 5 },
    boostJumpAmount: { type: hz.PropTypes.Number, default: 12 },
    boostJumpAngle: { type: hz.PropTypes.Number, default: 90 }
  };

  private ctrlPool: Pool<hz.Entity> = new Pool<hz.Entity>();
  private playerCtrlMap: Map<number, hz.Entity> = new Map<number, hz.Entity>();

  private static s_instance: PlayerControllerManager
  public static getInstance(): PlayerControllerManager {
    return PlayerControllerManager.s_instance;
  }

  constructor() {
    super();
    if (PlayerControllerManager.s_instance === undefined) {
      PlayerControllerManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  preStart() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player: hz.Player) => {
      this.handleOnPlayerEnterWorld(player);
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitWorld, (player: hz.Player) => {
      this.handleOnPlayerExitWorld(player);
    });

    this.connectLocalBroadcastEvent(Events.onRegisterPlyrCtrl, (data) => { this.ctrlPool.addToPool(data.caller) })

    this.connectNetworkBroadcastEvent(
      Events.onGetPlyrCtrlData, (data) => {

        this.sendNetworkEvent(
          data.caller,
          Events.onSetPlyrCtrlData,
          {
            doubleJumpAmount: this.props.doubleJumpAmount,
            boostJumpAmount: this.props.boostJumpAmount,
            boostJumpAngle: this.props.boostJumpAngle,
          });
      }
    );
  }

  start() { };

  private handleOnPlayerExitWorld(player: hz.Player): void {
    const playerCtrl = this.playerCtrlMap.get(player.id);
    if (playerCtrl) {
      console.log(`${this.constructor.name} Removed Local Controller from ${player.name.get()}`);

      playerCtrl.owner.set(this.world.getServerPlayer());
      this.ctrlPool.addToPool(playerCtrl);
    }
    this.playerCtrlMap.delete(player.id);
  };

  private handleOnPlayerEnterWorld(player: hz.Player): void {
    const availableCtrl = this.ctrlPool.getNextAvailable();
    if (availableCtrl) {
      console.log(`${this.constructor.name} Attached Local Controller to ${player.name.get()}`);

      availableCtrl.owner.set(player);
      this.playerCtrlMap.set(player.id, availableCtrl);
    }
  };

}
hz.Component.register(PlayerControllerManager);
