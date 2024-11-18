// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by SketeDavidson: https://horizon.meta.com/profile/10158917081718438

import { Component, HapticSharpness, HapticStrength, Player, PlayerHand } from "horizon/core";

export enum HapticHand
{
  Left = -1,
  Both = 0,
  Right = 1,
}

export enum HapticType
{
  reload = "reload",
  pickup = "pickup",
  empty = "empty",
  damage = "damage",
  death = "death",
  healthAdded = "healthAdded",
  playerHit = "playerHit",
  hitObject = "hitObject",
  hitPlayerBody = "hitPlayerBody",
  hitPlayerHead = "hitPlayerHead",
  gunShot = "gunShot",
}

type HapticStage = {
  duration: number;
  strength: HapticStrength;
  sharpness: HapticSharpness;
  delayToNext: number;
};

// Define haptic feedback for different hit scenarios

// Hit Object
const simulateHitObject: HapticStage[] = [
  { duration: 50, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 30 },
  { duration: 30, strength: HapticStrength.VeryLight, sharpness: HapticSharpness.Soft, delayToNext: 20 },
  { duration: 30, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 0 },
];

// Hit Player's Body
const simulateHitPlayerBody: HapticStage[] = [
  { duration: 60, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 40 },
  { duration: 40, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 30 },
  { duration: 50, strength: HapticStrength.Medium, sharpness: HapticSharpness.Sharp, delayToNext: 0 },
];

// Hit Player's Head
const simulateHitPlayerHead: HapticStage[] = [
  { duration: 80, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 50 },
  { duration: 60, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 40 },
  { duration: 70, strength: HapticStrength.Strong, sharpness: HapticSharpness.Coarse, delayToNext: 0 },
];

const simulateWeaponReload: HapticStage[] = [
  { duration: 100, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 150 },
  { duration: 150, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 100 },
  { duration: 100, strength: HapticStrength.Light, sharpness: HapticSharpness.Sharp, delayToNext: 100 },
];

const simulatePickupWeapon: HapticStage[] = [
  { duration: 30, strength: HapticStrength.Light, sharpness: HapticSharpness.Sharp, delayToNext: 50 },
  { duration: 40, strength: HapticStrength.Medium, sharpness: HapticSharpness.Sharp, delayToNext: 75 },
  { duration: 60, strength: HapticStrength.Strong, sharpness: HapticSharpness.Coarse, delayToNext: 75 },
];

const simulateShootingEmpty: HapticStage[] = [
  { duration: 30, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 50 },
  { duration: 50, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 75 },
  { duration: 100, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 0 },
];

const simulateDamage: HapticStage[] = [
  { duration: 60, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 80 },
  { duration: 100, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 90 },
  { duration: 60, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 0 },
];

const simulateDeath: HapticStage[] = [
  { duration: 300, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 150 },
  { duration: 400, strength: HapticStrength.Strong, sharpness: HapticSharpness.Coarse, delayToNext: 200 },
  { duration: 300, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 0 },
];

const simulateHealthAdded: HapticStage[] = [
  { duration: 50, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 60 },
  { duration: 50, strength: HapticStrength.Light, sharpness: HapticSharpness.Soft, delayToNext: 50 },
  { duration: 50, strength: HapticStrength.VeryLight, sharpness: HapticSharpness.Soft, delayToNext: 0 },
];

const simulatePlayerHit: HapticStage[] = [
  { duration: 30, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 40 },
  { duration: 20, strength: HapticStrength.Medium, sharpness: HapticSharpness.Coarse, delayToNext: 30 },
  { duration: 30, strength: HapticStrength.Medium, sharpness: HapticSharpness.Sharp, delayToNext: 0 },
];

const gunShot : HapticStage[] = [
  { duration: 40, strength: HapticStrength.Strong, sharpness: HapticSharpness.Sharp, delayToNext: 10 },
  { duration: 30, strength: HapticStrength.Strong, sharpness: HapticSharpness.Coarse, delayToNext: 0 },
  { duration: 20, strength: HapticStrength.Medium, sharpness: HapticSharpness.Sharp, delayToNext: 0 },
];

export const hapticConfig = new Map<string, HapticStage[]>([
  ["reload", simulateWeaponReload],
  ["pickup", simulatePickupWeapon],
  ["empty", simulateShootingEmpty],
  ["damage", simulateDamage],
  ["death", simulateDeath],
  ["healthAdded", simulateHealthAdded],
  ["playerHit", simulatePlayerHit],
  ["hitObject", simulateHitObject],
  ["hitPlayerBody", simulateHitPlayerBody],
  ["hitPlayerHead", simulateHitPlayerHead],
  ["gunShot", gunShot],
]);

export class HapticFeedback
{
  public static playPattern(player: Player, pattern: HapticType, hand: HapticHand, component: Component) {
    if (hand <= HapticHand.Both){
      this.playPatternStage(hapticConfig.get(pattern)!, 0, player.leftHand, component);
    }
    if (hand >= HapticHand.Both){
      this.playPatternStage(hapticConfig.get(pattern)!, 0, player.rightHand, component);
    }
  }

  private static playPatternStage(pattern: HapticStage[], index : number, hand: PlayerHand, component: Component)
  {
    if (index < pattern.length) {
      const { duration, strength, sharpness, delayToNext } = pattern[index];
      hand.playHaptics(duration, strength, sharpness);
      component.async.setTimeout(() => this.playPatternStage(pattern, index + 1, hand, component), delayToNext);
    }
  }
}
