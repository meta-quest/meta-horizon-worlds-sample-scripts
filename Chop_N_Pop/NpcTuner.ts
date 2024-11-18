// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from "Behaviour";
import { Component, PropTypes } from "horizon/core";
import { NpcConfigStore } from "NpcConfigStore";

export class NpcTuner extends Behaviour<typeof NpcTuner>
{
  static propsDefinition = {
    // General
    npcType: {type: PropTypes.String, default: "default"},

    // Movement
    maxVisionDistance: {type: PropTypes.Number, default: 7},
    walkSpeed: { type: PropTypes.Number, default: 1.0 },
    runSpeed: { type: PropTypes.Number, default: 0.0 },

    // Attack
    maxAttackDistance: {type: PropTypes.Number, default: 5},
    maxAttachReach: {type: PropTypes.Number, default: 5},
    attackLandDelay: {type: PropTypes.Number, default: 1000},
    minAttackDamage: {type: PropTypes.Number, default: 1},
    maxAttackDamage: {type: PropTypes.Number, default: 1},
    attacksPerSecond: {type: PropTypes.Number, default: 1},

    // HP & Damage
    minHp : { type: PropTypes.Number, default: 5 },
    maxHp: { type: PropTypes.Number, default: 5 },
    minBulletDamage: { type: PropTypes.Number, default: 1 },
    maxBulletDamage: { type: PropTypes.Number, default: 1 },
    minAxeDamage: { type: PropTypes.Number, default: 2 },
    maxAxeDamage: { type: PropTypes.Number, default: 2 },
    hitStaggerSeconds: { type: PropTypes.Number, default: 1 },

    // Knockback
    knockbackMinDamage: { type: PropTypes.Number, default: 2 },
    knockbackMultiplier: { type: PropTypes.Number, default: 2 },

    // Loot
    lootTable: {type: PropTypes.Entity}
  };

  Start() {
    NpcConfigStore.instance.addNpcConfig(this.props.npcType, this);
  }
}
Component.register(NpcTuner);
