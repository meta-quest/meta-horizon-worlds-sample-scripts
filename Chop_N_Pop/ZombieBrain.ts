// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { AudioGizmo, Component, Entity, Player, PropTypes, Vec3 } from "horizon/core";
import { LootSystem } from "LootSystem";
import { NpcAgent, NpcAnimation, NpcMovementSpeed } from "NpcAgent";
import { PlayerManager } from "PlayerManager";
import { NextStateEdges, StateCallbackConfig, StateCallbacks, StateConfigRecord, StateMachine } from "StateMachine";

enum ZombieState{
  Idle = "Idle",
  AcquireTarget = "AcquireTarget",
  Pointing = "Pointing",
  Taunting = "Taunting",
  Walking = "Walking",
  Running = "Running",
  Attacking = "Attacking",
  Hit = "Hit",
  Dead = "Dead",
}

class ZombieBrain extends NpcAgent<typeof ZombieBrain> {
  static propsDefinition = {
    ...NpcAgent.propsDefinition,
    groanProbability: {type: PropTypes.Number, default: 10},
    groan1: {type: PropTypes.Entity},
    groan2: {type: PropTypes.Entity},
    groan3: {type: PropTypes.Entity},
    groan4: {type: PropTypes.Entity},
    attackSfx: {type: PropTypes.Entity},
    attackHitSfx: {type: PropTypes.Entity},
    hitSfx: {type: PropTypes.Entity},
    deathSfx: {type: PropTypes.Entity},
  };

  players: Player[] = [];
  hitPoints: number = 1;
  targetPlayer: Player | undefined = undefined;
  startLocation!: Vec3;
  groans: Entity[] = [];

  // START State Machine Config *********************************************
  zombieConfig:StateConfigRecord[] = [
    new StateConfigRecord(
      ZombieState.Idle,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => this.animate(NpcAnimation.Idle)),
      ],
      [
        new NextStateEdges(() =>  this.stateMachine!.timer >= 1, [[ZombieState.AcquireTarget, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      ZombieState.AcquireTarget,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => this.acquireTarget())
      ],
      [
        new NextStateEdges(() => this.targetPlayer !== undefined, [
          [ZombieState.Taunting, 0.1],
          [ZombieState.Running, 0.1],
          [ZombieState.Walking, 0.8]]),
          new NextStateEdges(() => true, [[ZombieState.Idle, 1.0]])
      ]
    ),

    new StateConfigRecord(
      ZombieState.Taunting,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.animate(NpcAnimation.Taunt);
        }),
      ],
      [
        new NextStateEdges(() => this.stateMachine!.timer >= 2.0, [[ZombieState.Running, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      ZombieState.Walking,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.setMovementSpeed(NpcMovementSpeed.Walk);
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  (deltaTime: number) => this.updateWalkAndRunStates(deltaTime))
      ]
    ),

    new StateConfigRecord(
      ZombieState.Running,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.setMovementSpeed(NpcMovementSpeed.Run);
        }),
        new StateCallbackConfig(StateCallbacks.OnUpdate,  (deltaTime: number) => this.updateWalkAndRunStates(deltaTime))
      ]
    ),

    new StateConfigRecord(
      ZombieState.Attacking,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.animate(NpcAnimation.Attack);
          this.props.attackSfx?.as(AudioGizmo)?.play();
          this.async.setTimeout(() => this.resolveAttackOnPlayer(this.targetPlayer!), this.config.attackLandDelay);
        })
      ],
      [
        new NextStateEdges(() => this.stateMachine!.timer >= this.config.attacksPerSecond, [[ZombieState.AcquireTarget, 1.0]]),
      ]
    ),

    new StateConfigRecord(
      ZombieState.Hit,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          if (this.hitPoints > 1) {
            this.props.hitSfx?.as(AudioGizmo)?.play();
            this.animate(NpcAnimation.Hit);
          }
        })
      ],
      [
        new NextStateEdges(() => this.hitPoints <= 0, [[ZombieState.Dead, 1.0]]),
        new NextStateEdges(() => this.stateMachine!.timer >= this.config.hitStaggerSeconds, [
          [ZombieState.AcquireTarget, 1.0],
        ])
      ]
    ),

    new StateConfigRecord(
      ZombieState.Dead,
      [
        new StateCallbackConfig(StateCallbacks.OnEnter,  () => {
          this.props.deathSfx?.as(AudioGizmo)?.play();
          if (this.config.lootTable != undefined){
            LootSystem.instance?.dropLoot(this.config.lootTable, this.entity.position.get(), this.entity.rotation.get());
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
    this.stateMachine = new StateMachine(Object.values(ZombieState), this.zombieConfig);
    this.stateMachine.changeState(ZombieState.Idle);

    // Group groans for easy access
    if (this.props.groan1 != undefined)
      this.groans.push(this.props.groan1);
    if (this.props.groan2 != undefined)
      this.groans.push(this.props.groan2);
    if (this.props.groan3 != undefined)
      this.groans.push(this.props.groan3);
    if (this.props.groan4 != undefined)
      this.groans.push(this.props.groan4);

    this.groanMaybe();
  }

  override OnEntityCollision(itemHit: Entity, position: Vec3, normal: Vec3, velocity: Vec3)
  {
    console.log("Zombie hit by " + itemHit.name.get());
  }

  private groanMaybe()
  {
    if (this.isDead)
      return;

    if (Math.random() < this.props.groanProbability) {
      this.playRandomGroan();
    }

    this.async.setTimeout(this.groanMaybe.bind(this), Math.random() * 5000);
  }

  override npcHit(hitPos: Vec3, hitNormal: Vec3, damage : number) {
    if (this.isDead)
      return

    this.hitPoints -= damage;
    super.npcHit(hitPos, hitNormal, damage);
    this.stateMachine?.changeState(ZombieState.Hit);
  }

  private playRandomGroan() {
    if (this.groans.length > 0)
      this.groans[Math.floor(Math.random() * this.groans.length)].as(AudioGizmo).play();
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
    if (currentState != ZombieState.Running && currentState != ZombieState.Walking)
      return;

    if (this.targetPlayer === undefined) {
      this.stateMachine?.changeState(ZombieState.Idle);
    } else {
      this.goToTarget(this.targetPlayer.position.get());
      if (this.targetPlayer.position.get().distanceSquared(this.entity.position.get()) < Math.pow(this.config.maxAttackDistance, 2)) {
        this.stateMachine?.changeState(ZombieState.Attacking);
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

    }
  }
}
Component.register(ZombieBrain);
