// Copyright (c) Meta Platforms, Inc. and affiliates.
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Events } from 'Events';
import { AttachableEntity, AttachablePlayerAnchor, Color, Component, EventSubscription, Player, PlayerVisibilityMode, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { IAllocatable, ObjectPool } from 'ObjectPool';
import { PlayerManager } from 'PlayerManager';
import { AmmoHud, HealthHud, UiComponentsRegistry } from 'UiComponents';

// Handle anything that needs to be done locally for a player
class PlayerProxy extends Behaviour<typeof PlayerProxy> implements IAllocatable{
  static propsDefinition = {
    ammoUI: {type: PropTypes.Entity},
    lowAmmoThreshold: { type: PropTypes.Number, default: 5 },
    hpUI: {type: PropTypes.Entity},
    lowHpThreshold: { type: PropTypes.Number, default: 15 },
    lowResourceColor: { type: PropTypes.Color, default: new Color(0.7, 0.1, 0.1) },
    superHealthColor: { type: PropTypes.Color, default: new Color(0.3, 0.3, 1.0) },
    parentPool : {type: PropTypes.Entity},
  };

  private owner!: Player;
  private uiUpdateSub: EventSubscription | null = null;
  private ammoUi : AmmoHud | undefined = undefined;
  private hpUi : HealthHud | undefined = undefined;

  Awake() {
    if (this.owner === this.world.getServerPlayer()) {
      this.entity.visible.set(false);
      this.entity.as(AttachableEntity)?.detach();
    }
  }

  Start() {
    this.addSelfToPool();
  }

  onUpdateHud(data :{ammo : number, hp: number}){
    var ammoColor = data.ammo <= this.props.lowAmmoThreshold ? this.props.lowResourceColor : Color.white;
    var hpColor =
      data.hp > PlayerManager.instance.props.playerMaxHp ? this.props.superHealthColor :
      data.hp <= this.props.lowHpThreshold ? this.props.lowResourceColor :
      Color.white;

    this.ammoUi?.updateAmmo(data.ammo, ammoColor);
    this.hpUi?.updateHealth(data.hp, hpColor);
  }

  public onAllocate(position : Vec3, rotation : Quaternion, player : Player) {
    this.ammoUi = UiComponentsRegistry.GetComponent<AmmoHud>(this.props.ammoUI);
    this.hpUi = UiComponentsRegistry.GetComponent<HealthHud>(this.props.hpUI);

    const attachableEnt = this.entity.as(AttachableEntity);
    attachableEnt?.detach();
    attachableEnt?.visible.set(true);
    attachableEnt?.setVisibilityForPlayers([player], PlayerVisibilityMode.VisibleTo);
    attachableEnt?.attachToPlayer(player, AttachablePlayerAnchor.Head);
    this.uiUpdateSub = this.connectNetworkEvent(player, Events.playerDataUpdate, this.onUpdateHud.bind(this));
  }

  public onFree() {
    console.log("Freeing local player");
    this.entity.visible.set(false);

    // disconnect from all events
    this.uiUpdateSub?.disconnect();

    // reset subscriptions
    this.uiUpdateSub = null;

  }

  private addSelfToPool() {
    var pool = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.parentPool);
    pool?.addEntity(this.entity);
  }

}
Component.register(PlayerProxy);
