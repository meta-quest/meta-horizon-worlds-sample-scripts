// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Events } from "Events";
import { AudioGizmo, Component, Entity, Player, PropTypes, Vec3 } from "horizon/core";
import { LootSystem } from "LootSystem";
import { NpcAgent, NpcAnimation, NpcMovementSpeed } from "NpcAgent";
import { PlayerManager } from "PlayerManager";
import { NextStateEdges, StateCallbackConfig, StateCallbacks, StateConfigRecord, StateMachine } from "StateMachine";

enum SkeletonState{
  Idle = "Idle",
  AcquireTarget = "AcquireTarget",
  Taunting = "Taunting",
  Walking = "Walking",
  Running = "Running",
  Attacking = "Attacking",
  Hit = "Hit",
  Dead = "Dead"
}

class SkeletonBrain extends NpcAgent<typeof SkeletonBrain> {
  static propsDefinition = {
    ...NpcAgent.propsDefinition,
    tauntSfx : {type: PropTypes.Entity},
    attackSfx : {type: PropTypes.Entity},
    attackHitSfx: {type: PropTypes.Entity},
    hitSfx: {type: PropTypes.Entity},
    deathSfx : {type: PropTypes.Entity},
  };

  players: Player[] = [];
  hitPoints: number = 1;
  targetPlayer: Player | undefined = undefined;
  startLocation!: Vec3;

  // START State Machine Config *********************************************
  skeletonConfig:StateConfigRecord[] = [
    new StateConfigRecord(
      SkeletonState.Idle,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => this.animate(NpcAnimation.Idle)),
      ],
      [
        new NextStateEdges(() =>  this.stateMachine!.timer >= 1, [[SkeletonState.AcquireTarget, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      SkeletonState.AcquireTarget,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => this.acquireTarget())
      ],
      [
        new NextStateEdges(() => this.targetPlayer !== undefined, [
          [SkeletonState.Taunting, 0.1],
          [SkeletonState.Running, 0.1],
          [SkeletonState.Walking, 0.8]]),
          new NextStateEdges(() => true, [[SkeletonState.Idle, 1.0]])
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Taunting,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.props.tauntSfx?.as(AudioGizmo)?.play();
          this.animate(NpcAnimation.Taunt);
        }),
      ],
      [
        new NextStateEdges(() => this.stateMachine!.timer >= 2.0, [[SkeletonState.Running, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Walking,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.setMovementSpeed(NpcMovementSpeed.Walk);
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  (deltaTime: number) => this.updateWalkAndRunStates(deltaTime))
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Running,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.setMovementSpeed(NpcMovementSpeed.Run);
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  (deltaTime: number) => this.updateWalkAndRunStates(deltaTime))
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Attacking,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.animate(NpcAnimation.Attack);
          this.props.attackSfx?.as(AudioGizmo)?.play();
          this.async.setTimeout(() => this.resolveAttackOnPlayer(this.targetPlayer!), this.config.attackLandDelay);
        }),
      ],
      [
        new NextStateEdges(() => this.stateMachine!.timer >= 1 / this.config.attacksPerSecond, [[SkeletonState.AcquireTarget, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Hit,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          if (this.hitPoints > 1) {
            this.props.hitSfx?.as(AudioGizmo)?.play();
            this.animate(NpcAnimation.Hit);
          }
        })
      ],
      [
        new NextStateEdges(() => this.hitPoints <= 0, [[SkeletonState.Dead, 1.0]]),
        new NextStateEdges(() => this.stateMachine!.timer >= this.config.hitStaggerSeconds, [
          [SkeletonState.AcquireTarget, 1.0],
        ])
      ]
    ),

    new StateConfigRecord(
      SkeletonState.Dead,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          if (this.config.lootTable != undefined){
            LootSystem.instance?.dropLoot(this.config.lootTable, this.entity.position.get(), this.entity.rotation.get());
            this.props.deathSfx?.as(AudioGizmo)?.play();
            this.animate(NpcAnimation.Death);
            this.async.setTimeout(() => {
              this.world.deleteAsset(this.entity)
            }, 5000);
          }
        })
      ]
    ),
  ];
  // END State Machine Config ***********************************************

  Start() {
    super.Start();

    this.hitPoints = this.config.minHp + Math.floor((this.config.maxHp - this.config.minHp) * Math.random());
    this.startLocation = this.entity.position.get();
    this.stateMachine = new StateMachine(Object.values(SkeletonState), this.skeletonConfig);
    this.stateMachine.changeState(SkeletonState.Idle);
  }

  override OnEntityCollision(itemHit: Entity, position: Vec3, normal: Vec3, velocity: Vec3)
  {
    console.log("Skeleton hit by " + itemHit.name.get());
  }

  override npcHit(hitPos: Vec3, hitNormal: Vec3, damage : number) {
    if (this.isDead)
      return

    this.hitPoints -= damage;
    super.npcHit(hitPos, hitNormal, damage);
    this.stateMachine?.changeState(SkeletonState.Hit);
  }

  private acquireTarget() {
    let closestDistanceSq = Math.pow(this.config.maxVisionDistance, 2);
    const monsterPosition = this.entity.position.get();
    this.world.getPlayers().forEach((player) => {
      const playerPosition = player.position.get();
      const distanceSq = monsterPosition.distanceSquared(playerPosition);
      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        this.targetPlayer = player;
        return;
      }
    });
  }

  private updateWalkAndRunStates(deltaTime: number) {
    var currentState = this.stateMachine?.currentState?.name;
    if (currentState != SkeletonState.Running && currentState != SkeletonState.Walking)
      return;

    if (this.targetPlayer === undefined) {
      this.stateMachine?.changeState(SkeletonState.Idle);
    } else {
      this.goToTarget(this.targetPlayer.position.get());
      if (this.targetPlayer.position.get().distanceSquared(this.entity.position.get()) < Math.pow(this.config.maxAttackDistance, 2)) {
        this.stateMachine?.changeState(SkeletonState.Attacking);
      }
    }
  }

  private resolveAttackOnPlayer(player: Player) {
    // If the player is still in range after the attack delay, apply damage
    if(player.position.get().distanceSquared(this.entity.position.get()) < Math.pow(this.config.maxAttachReach, 2))
    {
      var damage = this.config.minAttackDamage + Math.floor((this.config.maxAttackDamage - this.config.minAttackDamage) * Math.random());
      this.props.attackHitSfx?.as(AudioGizmo)?.play();

      PlayerManager.instance.hitPlayer(player, damage, this.entity.position.get());

      this.sendNetworkEvent(player, Events.playerHit, {player: player, damage: damage, damageOrigin: this.entity.position.get()})
    }
  }
}
Component.register(SkeletonBrain);
