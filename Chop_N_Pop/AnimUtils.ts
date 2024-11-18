// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by SketeDavidson: https://horizon.meta.com/profile/10158917081718438

import { Component, Entity, Quaternion, TextGizmo, Vec3, World } from "horizon/core";

export type AnimationParams = {
  entity: Entity; // Entity to animate
  targetLocalPosition?: Vec3; // Optional target Vec3 local position
  targetLocalRotation?: Quaternion; // Optional target Quaternion local rotation
  durationMS: number; // Duration of the animation in milliseconds
};

/**
 * Represents a class that handles animations over time for a specific component.
 */
export class OverTimeLocal {
  constructor(private component: Component) {}

  /**
   * Starts an animation over time.
   * @param params - The animation parameters.
   * @returns A promise that resolves when the animation is done.
   * @throws An error if no entity is provided for the animation.
   */
  startAnimation(params: AnimationParams): Promise<void> {
    const { entity, targetLocalPosition, targetLocalRotation, durationMS } =
      params;
    if (!entity) {
      throw new Error("No entity provided for animation.");
    }

    const startLocalPosition = entity.transform.localPosition.get();
    const startLocalRotation = entity.transform.localRotation.get();
    let elapsedMS = 0;

    let animationDone = () => {};
    const promise = new Promise<void>((resolve) => {
      animationDone = resolve;
    });

    const onUpdateSubscription = this.component.connectLocalBroadcastEvent(
      World.onUpdate,
      ({ deltaTime }) => {
        elapsedMS += deltaTime * 1000;
        const fraction = Math.min(1, elapsedMS / durationMS);

        if (targetLocalPosition) {
          const interpolatedPosition = Vec3.lerp(
            startLocalPosition,
            targetLocalPosition,
            fraction
          );
          entity.transform.localPosition.set(interpolatedPosition);
        }

        if (targetLocalRotation) {
          const interpolatedRotation = Quaternion.slerp(
            startLocalRotation,
            targetLocalRotation,
            fraction
          );
          entity.transform.localRotation.set(interpolatedRotation);
        }

        if (fraction >= 1) {
          onUpdateSubscription.disconnect();
          animationDone();
        }
      }
    );

    return promise;
  }
}

export class OverTime {
  constructor(private readonly owner: Component) {}

  readonly moveTo = this.fn('position', 'to');
  readonly moveBy = this.fn('position', 'by');
  readonly rotateTo = this.fn('rotation', 'to');
  readonly rotateBy = this.fn('rotation', 'by');
  readonly scaleTo = this.fn('scale', 'to');
  readonly scaleBy = this.fn('scale', 'by');

  private fn<K extends keyof TransformTargets>(key: K, mode: 'to' | 'by') {
    return (
      entity: Entity,
      value: NonNullable<TransformTargets[K]>['value'],
      durationSec: number
    ) => {
      const endTime = Date.now() + durationSec * 1000;
      const entry = { value, mode, endTime, appliedFrac: 0 } as NonNullable<
        TransformTargets[K]
      >;
      return this.registerOverTimeAction<K>(entity, key, entry);
    };
  }

  private interpolations = new WeakMap<
    Entity,
    { targets: TransformTargets; unsubscribe: () => void }
  >();

  private registerOverTimeAction<K extends keyof TransformTargets>(
    entity: Entity,
    key: K,
    entry: NonNullable<TransformTargets[K]>
  ) {
    let data = this.interpolations.get(entity);
    if (!data) {
      data = {
        targets: {},
        unsubscribe: this.owner.connectLocalBroadcastEvent(
          World.onUpdate,
          ({ deltaTime }) => {
            this.tick(entity, deltaTime);
          }
        ).disconnect,
      };
      this.interpolations.set(entity, data);
    }
    data.targets[key] = entry;
  }

  private tick(entity: Entity, deltaTime: number) {
    const data = this.interpolations.get(entity);
    if (data) {
      const now = Date.now();

      for (const key of ['position', 'scale', 'rotation'] as const) {
        const entry = data.targets[key];
        if (entry) {
          const { value, endTime, mode, appliedFrac } = entry;
          const timeFrac = Math.min(1, (deltaTime * 1000) / (endTime - now));
          const current = entity[key].get();

          const dt = timeFrac * (1 - appliedFrac);
          entry.appliedFrac = Math.min(1, Math.max(0, appliedFrac + dt));

          if (key === 'rotation') {
            if (mode === 'to') {
              entity[key].set(
                Quaternion.slerp(
                  current as Quaternion,
                  value as Quaternion,
                  timeFrac
                )
              );
            } else {
              const step = Quaternion.slerp(
                Quaternion.one,
                value as Quaternion,
                dt
              );
              entity[key].set(step.mul(current as Quaternion));
            }
          } else {
            if (mode === 'to') {
              entity[key].set(
                Vec3.lerp(current as Vec3, value as Vec3, timeFrac)
              );
            } else {
              const step = (value as Vec3).mul(dt);
              entity[key].set((current as Vec3).add(step));
            }
          }

          if (timeFrac >= 1 || entry.appliedFrac >= 1) {
            delete data.targets[key];
          }
        }
      }

      if (Object.keys(data.targets).length === 0) {
        data.unsubscribe();
        this.interpolations.delete(entity);
      }
    }
  }
}

type TransformTarget<T> = {
  value: T;
  endTime: number;
  appliedFrac: number;
  mode: 'to' | 'by';
};

type TransformTargets = {
  position?: TransformTarget<Vec3>;
  scale?: TransformTarget<Vec3>;
  rotation?: TransformTarget<Quaternion>;
};

export class FadeEffect {
  private component: Component;
  private textElement: TextGizmo;
  private colors: string[];
  private interval: number;
  private fadeIndex: number;
  private fadeDirection: number;
  private fadeInterval: number | undefined;
  private num: number = 0;

  constructor(component: Component, textElement: TextGizmo, colors: string[], interval: number = 100) {
    this.component = component;
    this.textElement = textElement;
    this.colors = colors;
    this.interval = interval;
    this.fadeIndex = 0;
    this.fadeDirection = 1;
    this.fadeInterval = undefined;
  }

  start() {
    if (!this.fadeInterval) {
      this.fadeInterval = this.component.async.setInterval(() => {
        const currentColor = this.colors[this.fadeIndex];
        this.textElement?.as(TextGizmo)?.text.set(`<color=${currentColor}>${this.num}</color>`);

        this.fadeIndex += this.fadeDirection;

        // Reverse direction at the ends
        if (this.fadeIndex === this.colors.length - 1 || this.fadeIndex === 0) {
            this.fadeDirection *= -1;
        }
      }, this.interval); // Adjust the interval as needed for smooth fading
    }
  }

  stop() {
    if (this.fadeInterval) {
      this.component.async.clearInterval(this.fadeInterval);
      this.fadeInterval = undefined;
    }
  }
}
