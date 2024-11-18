// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Base class that provides functionality that fires on players and entities entering and/or exiting triggers
 */
import * as hz from 'horizon/core';

export abstract class PlayerFireEventOnTriggerBase<TProps> extends hz.Component<TProps> {
  private onEntityEnterTriggerEvent: hz.EventSubscription | null = null;
  private onEntityExitTriggerEvent: hz.EventSubscription | null = null;
  private onPlayerEnterTriggerEvent: hz.EventSubscription | null = null;
  private onPlayerExitTriggerEvent: hz.EventSubscription | null = null;

  preStart() {
    this.onEntityEnterTriggerEvent = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnEntityEnterTrigger, this.onEntityEnterTrigger.bind(this));
    this.onEntityExitTriggerEvent = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnEntityExitTrigger, this.onEntityExitTrigger.bind(this));
    this.onPlayerEnterTriggerEvent = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterTrigger, this.onPlayerEnterTrigger.bind(this));
    this.onPlayerExitTriggerEvent = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitTrigger, this.onPlayerExitTrigger.bind(this));
  }

  start() { }

  dispose() {
    this.onEntityEnterTriggerEvent?.disconnect();
    this.onEntityEnterTriggerEvent = null;

    this.onEntityExitTriggerEvent?.disconnect();
    this.onEntityExitTriggerEvent = null;

    this.onPlayerEnterTriggerEvent?.disconnect();
    this.onPlayerEnterTriggerEvent = null;

    this.onPlayerExitTriggerEvent?.disconnect();
    this.onPlayerExitTriggerEvent = null;
  }

  protected abstract onEntityEnterTrigger(enteredBy: hz.Entity): void;

  protected abstract onEntityExitTrigger(exitedBy: hz.Entity): void;

  protected abstract onPlayerEnterTrigger(enteredBy: hz.Player): void;

  protected abstract onPlayerExitTrigger(exitedBy: hz.Player): void;
}
