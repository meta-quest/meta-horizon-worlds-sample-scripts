// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Game-wide enums and constants. Advanced curve functions and their visualizer
 */

import * as hz from "horizon/core";

export enum GameState {
  "ReadyForMatch",    // Default, nothing is going on, we can start a match
  "StartingMatch",    //A match has been started by players
  "PlayingMatch",     //A match is ongoing
  "EndingMatch",      //A match is ending
  "CompletedMatch",   //A match has just been completed
}

export enum PlayerGameStatus {
  "Lobby",
  "Standby",
  "Playing",
}

// Pool Class
export class Pool<T> {
  all: T[] = [];
  available: T[] = [];
  active: T[] = [];

  hasAvailable(): boolean {
    return this.available.length > 0;
  }
  hasActive(): boolean {
    return this.active.length > 0;
  }

  isAvailable(t: T): boolean {
    return this.available.includes(t);
  }

  getNextAvailable(): T | null {
    if (this.hasAvailable()) {
      const available = this.available.shift()!;
      if (!this.active.includes(available)) {
        this.active.push(available);
      }
      return available;
    } else {
      return null;
    }
  }

  getRandomAvailable(): T | null {
    if (this.hasAvailable()) {
      const rand = Math.floor(Math.random() * this.available.length);
      const available = this.available.splice(rand, 1)[0]!;
      if (!this.active.includes(available)) {
        this.active.push(available);
      }
      return available;
    } else {
      return null;
    }
  }

  getRandomActive(): T | null {
    if (this.hasActive()) {
      const rand = Math.floor(Math.random() * this.active.length);
      const active = this.active.splice(rand, 1)[0]!;
      return active;
    } else {
      return null;
    }
  }

  addToPool(t: T): void {
    if (!this.all.includes(t)) {
      this.all.push(t);
    }

    if (!this.available.includes(t)) {
      this.available.push(t);
    }

    if (this.active.includes(t)) {
      this.active.splice(this.active.indexOf(t), 1);
    }
  }

  removeFromPool(t: T): void {
    if (this.active.includes(t)) {
      this.active.splice(this.active.indexOf(t), 1);
    }

    if (this.available.includes(t)) {
      this.available.splice(this.available.indexOf(t), 1);
    }

    if (this.all.includes(t)) {
      this.all.splice(this.all.indexOf(t), 1);
    }
  }

  resetAvailability(): void {
    this.available = this.all.slice();
  }
}

export function msToMinutesAndSeconds(time: number): string {
  const baseTime = Math.floor(time);
  let minutes = Math.floor(baseTime / 60);
  let seconds = baseTime % 60;
  let ms = time % 1;
  seconds = seconds === 60 ? 0 : seconds;
  return `${(minutes < 10 ? '0' : '') + minutes} : ${(seconds < 10 ? '0' : '') + seconds.toFixed(0)} : ${ms.toFixed(2).substring(2)}`;
}

export function timedIntervalActionFunction(
  timerMS: number,
  component: hz.Component,
  onTickAction: (timerMS: number) => void, // Function to be run during the timer tick
  onEndAction: () => void // Function to be run at the end of the timer
): number {
  let timerID = component.async.setInterval(() => {
    if (timerMS > 0) {
      onTickAction(timerMS); // Call the onTick function
      timerMS -= 1000;
    } else {
      if (timerID !== undefined) {
        onEndAction();
        component.async.clearInterval(timerID);
      }
    }
  }, 1000);

  return timerID;
}

export class Curve {

  //not ideal as the array itself can still be changed
  private _controlPoints: hz.Vec3[] = [];
  public get controlPoints(): hz.Vec3[] {
    return this._controlPoints;
  }
  private set controlPoints(value: hz.Vec3[]) {
    this._controlPoints = value;
  }

  constructor(controlPoints: hz.Vec3[]) {
    this.controlPoints = controlPoints;
  }

  interpolate(t: number): hz.Vec3 {
    const n = this.controlPoints.length - 1;
    const index = Math.floor(t * n);
    const t0 = index > 0 ? index / n : 0;
    const t1 = (index + 1) / n;
    //console.log("index:", index);

    const p0 = this.controlPoints[Math.max(0, index > 1 ? index - 1 : 0)];
    const p0a =
      index > 1
        ? this.controlPoints[index - 1]
        : this.controlPoints[0].add(
          this.controlPoints[0].sub(this.controlPoints[1])
        ); //deal with negative index, should project missing control points instead
    const p1 = this.controlPoints[index];
    const p2 =
      this.controlPoints[
      Math.min(n, index < n ? index + 1 : this.controlPoints.length - 1)
      ]; //deal with out of bounds index, should project missing control points instead
    const p2a =
      index + 1 < n ? this.controlPoints[index + 1] : this.controlPoints[n]; //deal with negative index, should project missing control points instead
    const p3 =
      this.controlPoints[
      Math.min(n, index < n - 1 ? index + 2 : this.controlPoints.length - 1)
      ];
    const p3a =
      index + 2 < n ? this.controlPoints[index + 2] : this.controlPoints[n];
    /*: this.controlPoints[n].add(
            this.controlPoints[n].sub(this.controlPoints[n - 1])
          ); //deal with negative index, should project missing control points instead*/

    const tNormalized = (t - t0) / (t1 - t0);

    return this.interpolateCatmullRom(p0a, p1, p2a, p3, tNormalized);
  }


  //0.0 to 1.0
  findClosestPointCurveProgress(target: hz.Vec3): number {
    const f = (t: number) => {
      const point = this.interpolate(t);
      return this.calculateDistance(target, point);
    };
    const tMin = this.goldenSectionSearch(f, 0, 1, 1e-4); // adjust tolarence value as needed, smaller values increases precision and runtime cost
    return tMin;
  }

  private interpolateCatmullRom(
    //uses a Catmull-Rom algorithm for the spline
    p0: hz.Vec3,
    p1: hz.Vec3,
    p2: hz.Vec3,
    p3: hz.Vec3,
    t: number
  ): hz.Vec3 {
    const t2 = t * t;
    const t3 = t2 * t;

    const v0 = (p2.x - p0.x) * 0.5;
    const v1 = (p3.x - p1.x) * 0.5;
    const a = 2 * p1.x - 2 * p2.x + v0 + v1;
    const b = -3 * p1.x + 3 * p2.x - 2 * v0 - v1;
    const c = v0;
    const d = p1.x;

    const x = a * t3 + b * t2 + c * t + d;

    const v0y = (p2.y - p0.y) * 0.5;
    const v1y = (p3.y - p1.y) * 0.5;
    const ay = 2 * p1.y - 2 * p2.y + v0y + v1y;
    const by = -3 * p1.y + 3 * p2.y - 2 * v0y - v1y;
    const cy = v0y;
    const dy = p1.y;

    const y = ay * t3 + by * t2 + cy * t + dy;

    const v0z = (p2.z - p0.z) * 0.5;
    const v1z = (p3.z - p1.z) * 0.5;
    const az = 2 * p1.z - 2 * p2.z + v0z + v1z;
    const bz = -3 * p1.z + 3 * p2.z - 2 * v0z - v1z;
    const cz = v0z;
    const dz = p1.z;

    const z = az * t3 + bz * t2 + cz * t + dz;

    return new hz.Vec3(x, y, z);
  }

  //Golden Section search is statistically a little more efficient than a binary seive when trying to find a number using an over/under check
  private goldenSectionSearch(
    f: (x: number) => number,
    a: number,
    b: number,
    tol: number
  ): number {
    const gr = 1.6180339887498948482; //Aproximation of phi to avoid the classic (1+sqrt(5))/2 being called thousands of times
    let c = b - (b - a) / gr;
    let d = a + (b - a) / gr;
    while (Math.abs(b - a) > tol) {
      if (f(c) < f(d)) {
        b = d;
        d = c;
        c = b - (b - a) / gr;
      } else {
        a = c;
        c = d;
        d = a + (b - a) / gr;
      }
    }
    return (b + a) / 2;
  }

  private calculateDistance(point1: hz.Vec3, point2: hz.Vec3): number {
    return point1.sub(point2).magnitudeSquared(); //using squared to avoid unnecessary sqrt call, don't need the actual distance, just the smallest
  }
}

export class CurveVisualizer extends hz.Component<typeof CurveVisualizer> {
  // define the inputs available in the property panel in the UI as well as default values
  static propsDefinition = {
    showPath: { type: hz.PropTypes.Boolean },
    trailRenderer: { type: hz.PropTypes.Entity },
  };

  public static SetCurve = new hz.LocalEvent<{ curve: Curve }>("SetCurve");
  public static StartDrawingCurve = new hz.LocalEvent("StartDrawingCurve");
  public static StopDrawingCurve = new hz.LocalEvent("StopDrawingCurve");

  private splineProgress: number = 0;
  private curve!: Curve;
  private showPath: boolean = false;

  preStart() {
    this.showPath = this.props.showPath;

    this.connectLocalBroadcastEvent(
      CurveVisualizer.SetCurve,
      (data) => {
        this.curve = data.curve;
      });

    this.connectLocalBroadcastEvent(
      CurveVisualizer.StartDrawingCurve,
      () => {
        this.showPath = true;
        this.entity.as(hz.TrailGizmo)!.play();
      });

    this.connectLocalBroadcastEvent(
      CurveVisualizer.StopDrawingCurve,
      () => {
        this.showPath = false;
        this.entity.as(hz.TrailGizmo)!.stop();
      });

    //For drawing the curve
    this.connectLocalBroadcastEvent(
      hz.World.onUpdate,
      (data) => {

        if (this.showPath && this.curve && this.props.trailRenderer) {
          this.splineProgress = this.drawTrackWithProgress(
            this.props.trailRenderer!,
            this.splineProgress,
            data.deltaTime,
            this.curve);
        }
      });
  }

  start() { }

  private drawTrackWithProgress(trailRenderer: hz.Entity, splineProgress: number, deltaTime: number, curve: Curve) {
    splineProgress = (splineProgress + deltaTime * 0.1) % 1;

    // Edit mode visuals
    const interpolatedPoint = curve.interpolate(splineProgress);
    trailRenderer.position.set(interpolatedPoint); // this currently moves self, might want to split the debug visuals from the script container

    return splineProgress;
  }
}
hz.Component.register(CurveVisualizer);
