// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from "Behaviour";
import { Events } from "Events";
import { FloatingTextManager } from "FloatingTextManager";
import { Color, Component, Player, PropTypes, Vec3 } from "horizon/core";
import { INavMesh, NavMeshAgent } from "horizon/navmesh";
import { AssetBundleGizmo, AssetBundleInstanceReference } from "horizon/unity_asset_bundles";
import { NpcConfigStore } from "NpcConfigStore";
import { StateMachine } from "StateMachine";

export enum NpcAnimation
{
  Idle = "Idle",
  Attack = "Attack",
  Hit = "Hit",
  Death = "Death",
  Wave = "EmoteWave",
  Celebration = "EmoteCelebration",
  Taunt = "EmoteTaunt",
  Yes = "EmoteYes",
  No = "EmoteNo",
  Point = "EmotePoint",
}

export enum NpcMovementSpeed
{
  Walk,
  Run
}

export interface INpcAgent{
  isDead: boolean;
}

export class NpcAgent<T> extends Behaviour<typeof NpcAgent & T> implements INpcAgent{
  // Editable Properties
  static propsDefinition = {
    agentFPS: { type: PropTypes.Number, default: 4 },
    headHeight: { type: PropTypes.Number, default: 1.8 },
    collider: { type: PropTypes.Entity },
    configName: { type: PropTypes.String, default: "default" }
  };

  private assetRef?: AssetBundleInstanceReference;
  private navMesh?: INavMesh | null = null;
  private navAgent?: NavMeshAgent | null = null;
  private frameTimer: number = 0.0;

  // Nav mesh navigation coordinates
  private nextTarget?: Vec3 | undefined;
  private lastKnownGood?: Vec3 | undefined;
  private currentLookAt: Vec3 = new Vec3(0, 0, 0);

  private animMoving: boolean = false;
  private animSpeed: number = 0.0;

  isDead: boolean = false;

  protected stateMachine: StateMachine | null = null;
  protected config : any = null;

  Start() {
    this.assetRef = this.entity.as(AssetBundleGizmo)?.getRoot();
    this.resetAllAnimationParameters();

    this.config = NpcConfigStore.instance.getNpcConfig(this.props.configName);
    if (this.config === undefined) {
      console.error("NpcAgent::Start() Attempted to load config for undefined config name: " + this.props.configName);
    }

    this.navAgent = this.entity.as(NavMeshAgent)!;
    this.navAgent.maxSpeed.set(this.config.runSpeed);

    // Get the navmesh reference so we can use it later
    this.navAgent.getNavMesh().then(mesh => {this.navMesh = mesh!;});

    // The starting position is a good position to fallback to
    this.lastKnownGood = this.entity.position.get();

    this.connectNetworkEvent(this.props.collider!, Events.projectileHit,this.bulletHit.bind(this));
    this.connectNetworkEvent(this.entity, Events.projectileHit,this.bulletHit.bind(this));
    this.connectNetworkEvent(this.props.collider!, Events.axeHit,this.axeHit.bind(this));
    this.connectNetworkEvent(this.entity, Events.axeHit,this.axeHit.bind(this));
  }

  Update(deltaTime: number) {
    this.frameTimer += deltaTime;

    // Update animation every frame
    this.updateSpeedAnimationParameters(deltaTime);
    this.updateLookAtAnimationParameters(deltaTime);

    // Only update destination at FPS rate
    if (this.frameTimer >= 1.0 / this.props.agentFPS) {
      if (this.nextTarget != undefined) {
        var targetPos = this.navMesh?.getNearestPoint(this.nextTarget, 100)
        this.lastKnownGood = targetPos ?? this.lastKnownGood;
        this.navAgent!.destination.set(targetPos || this.entity.position.get());
      }
      this.frameTimer -= 1.0 / this.props.agentFPS;
    }

    // Update the state machine
    this.stateMachine?.update(deltaTime);
  }


  // public functionality
  setMovementSpeed(speed: NpcMovementSpeed) {
    switch(speed){
      case NpcMovementSpeed.Walk:
        this.navAgent?.maxSpeed.set(this.config.walkSpeed);
        break;
      case NpcMovementSpeed.Run:
        this.navAgent?.maxSpeed.set(this.config.runSpeed);
        break;
    }
  }

  goToTarget(target: Vec3) {
    if (this.isDead)
      return;

    this.navAgent?.isImmobile.set(false);
    this.nextTarget = target;
  }

  animate(animation : NpcAnimation){
    if (this.isDead)
      return;

    switch(animation){
      case NpcAnimation.Idle:
        this.navAgent?.isImmobile.set(true);
        this.nextTarget = this.entity.position.get();
        break;
      case NpcAnimation.Death:
        this.assetRef?.setAnimationParameterBool("Death", true);
        this.navAgent?.isImmobile.set(true);
        this.nextTarget = undefined;
        this.isDead = true;
        this.props.collider?.collidable.set(false);
        break;
      case NpcAnimation.Hit:
        this.assetRef?.setAnimationParameterTrigger("Hit");
        break;
      case NpcAnimation.Attack:
        this.navAgent?.isImmobile.set(true);
        this.assetRef?.setAnimationParameterTrigger("Attack");
        break;
      default:
        this.assetRef?.setAnimationParameterTrigger(animation);
    }
  }

  private bulletHit(data :{ hitPos: Vec3, hitNormal: Vec3, fromPlayer: Player}){
    var bulletDamage = this.config.minBulletDamage + Math.floor((this.config.maxBulletDamage - this.config.minBulletDamage) * Math.random());

    this.npcHit(data.hitPos, data.hitNormal, bulletDamage);
    this.sendNetworkBroadcastEvent(Events.playerScoredHit, {player : data.fromPlayer, entity: this.entity});
  }

  private axeHit(data :{ hitPos: Vec3, hitNormal: Vec3, fromPlayer: Player}){
    var axeDamage = this.config.minAxeDamage + Math.floor((this.config.maxAxeDamage - this.config.minAxeDamage) * Math.random());

    this.npcHit(data.hitPos, data.hitNormal, axeDamage);
    this.sendNetworkBroadcastEvent(Events.playerScoredHit, {player : data.fromPlayer, entity: this.entity});
  }

  protected npcHit(hitPos: Vec3, hitNormal: Vec3, damage: number) {
    if (this.isDead)
      return

    FloatingTextManager.instance?.createFloatingText(damage.toString(), hitPos, Color.red);

    if (damage >= this.config.knockbackMinDamage)
    {
      // Push the NPC back opposite to the direction of the hit
      var hitDirection = hitNormal.mul(-1);
      hitDirection.y = 0;
      hitDirection.normalize();

      var startPosition = this.entity.position.get();

      var moveInterval = this.async.setInterval(() => {
        if (this.entity.position.get().sub(startPosition).magnitude() > damage * this.config.knockbackMultiplier)
        {
          this.async.clearInterval(moveInterval);
        }
        else
        {
          this.entity.position.set(this.entity.position.get().add(hitDirection));
        }
      }, 10);
    }
  }

  // Private methods
  private resetAllAnimationParameters(){
    if (this.assetRef === undefined || this.assetRef === null) {
      console.warn("NpcAgent::resetAllAnimationParameters() Attempted to reset all animation triggers on an undefined assetRef");
    }
    // Can also use this.assetRef?.resetAnimationParameterTrigger("Death"); but we're specifying values here so that they can be easily overriden for default state
    this.assetRef?.setAnimationParameterBool("Death", false);
    this.assetRef?.setAnimationParameterBool("Moving", false);
    this.assetRef?.setAnimationParameterBool("Falling", false);
    this.assetRef?.setAnimationParameterFloat("LookX", 0);
    this.assetRef?.setAnimationParameterFloat("LookY", 0);
    this.assetRef?.setAnimationParameterFloat("Speed", 0);
    this.assetRef?.setAnimationParameterFloat("RotateSpeed", 0);
    this.assetRef?.setAnimationParameterFloat("Random", 0);
  }

  private updateSpeedAnimationParameters(deltaTime: number) {
    var speed = this.navAgent?.currentSpeed.get() || 0.0;

    var speedAnimationValue = this.calculateSpeedAnimationValue(speed);
    speedAnimationValue = (speedAnimationValue + this.animSpeed) * 0.5;
    if (speedAnimationValue <= 0.1) {
      speedAnimationValue = 0.0;
    }

    if (speedAnimationValue != this.animSpeed) {
      this.animSpeed = speedAnimationValue;
      this.assetRef?.setAnimationParameterFloat("Speed", speedAnimationValue);
    }

    var movingAnimationValue = speedAnimationValue > 0.0;
    if (movingAnimationValue != this.animMoving) {
      this.animMoving = movingAnimationValue;
      this.assetRef?.setAnimationParameterBool("Moving", movingAnimationValue);
    }
  }

  private calculateSpeedAnimationValue(speed: number) {
    // Animation value is between 0 and 1 for walking, and between 1 and 4 for running.

    // 0-1 for walking
    var animSpeed = Math.min(speed / this.config.walkSpeed, 1);

    // Add run portion
    return animSpeed + Math.max(3 * (speed - this.config.walkSpeed) / (this.config.runSpeed - this.config.walkSpeed), 0);
  }

  private updateLookAtAnimationParameters(deltaTime: number) {
    if (this.nextTarget == undefined)
      return;

    var targetLookAt = this.currentLookAt;

    // Head position
    const headPosition = this.entity.position.get();
    headPosition.y += this.props.headHeight;

    // Vector from head to look at position
    const delta = this.nextTarget.sub(headPosition);

    // Make sure the head is not overstretching the neck (180 degrees forward range)
    const dotForward = Vec3.dot(this.entity.forward.get(), delta);
    if (dotForward > 0) {
      // Calculate the look at vector in the head's local space
      const dotRight = Vec3.dot(this.entity.right.get(), delta);
      const dotUp = Vec3.dot(this.entity.up.get(), delta);
      targetLookAt = new Vec3(Math.atan2(dotRight, dotForward), Math.atan2(dotUp, dotForward), 0);
      // bring the values between -1 and 1
      targetLookAt.divInPlace(Math.PI * 2) ;
    }

    if (this.currentLookAt != targetLookAt) {
      this.currentLookAt = targetLookAt;
    }

    this.assetRef?.setAnimationParameterFloat("LookX", this.currentLookAt.x);
    this.assetRef?.setAnimationParameterFloat("LookY", this.currentLookAt.y);
  }
}
Component.register(NpcAgent);
