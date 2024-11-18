// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Initializes the player local HUDs and passes information to each player about the state of the race
 */
import * as hz from "horizon/core";
import { Pool } from "GameUtils";
import { Events } from "Events";

export class HUDManager extends hz.Component {
  static propsDefinition = {};
  private HUDPool: Pool<hz.Entity> = new Pool<hz.Entity>();
  private playerHUDCtrlMap: Map<number, hz.Entity> = new Map<number, hz.Entity>();

  private static s_instance: HUDManager;
  public static getInstance(): HUDManager {
    return HUDManager.s_instance;
  }

  constructor() {
    super();
    if (HUDManager.s_instance === undefined) {
      HUDManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  preStart() {
    this.connectLocalBroadcastEvent(
      Events.onRegisterRaceHUD,
      (data) => {
        this.HUDPool.addToPool(data.caller);
      });

    this.connectCodeBlockEvent(
      this.entity,
      hz.CodeBlockEvents.OnPlayerEnterWorld,
      (player: hz.Player) => {
        this.handleOnPlayerEnterWorld(player);
      }
    );

    this.connectCodeBlockEvent(
      this.entity,
      hz.CodeBlockEvents.OnPlayerExitWorld,
      (player: hz.Player) => {
        this.handleOnPlayerExitWorld(player);
      }
    );

  }

  start() { }

  private handleOnPlayerExitWorld(player: hz.Player): void {
    const playerHC = this.playerHUDCtrlMap.get(player.id);
    if (playerHC) {
      playerHC.owner.set(this.world.getServerPlayer());
      this.HUDPool.addToPool(playerHC);
    }
    this.playerHUDCtrlMap.delete(player.id);
  }

  private handleOnPlayerEnterWorld(player: hz.Player): void {
    const availableHC = this.HUDPool.getNextAvailable();
    if (availableHC) {
      console.log(`${this.constructor.name} Attached HUD Local to ${player.name.get()}`);
      availableHC.owner.set(player);
      this.playerHUDCtrlMap.set(player.id, availableHC);
    }
  }

}
hz.Component.register(HUDManager);
