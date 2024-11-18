// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { FloatingText } from 'FloatingText';
import { Color, Component, Entity, PropTypes, Vec3 } from 'horizon/core';

export class FloatingTextManager extends Behaviour<typeof FloatingTextManager> {
  static propsDefinition = {
    floatingTextAsset : {type: PropTypes.Asset, default: undefined},
    yPos : {type: PropTypes.Number, default: 2},
    floatSpeed : {type: PropTypes.Number, default: 0.5},
    rotationSpeed : {type: PropTypes.Number, default: 360},
    duration : {type: PropTypes.Number, default: 2.0},
    color : {type: PropTypes.Color, default: new Color(1, 1, 1)}
  }

  static instance : FloatingTextManager | undefined;

  Awake()
  {
    FloatingTextManager.instance = this;
  }

  public async createFloatingText(
    text: string,
    position: Vec3,
    color: Color = this.props.color)
  {
    if (this.props.floatingTextAsset === undefined)
      return;

    this.world.spawnAsset(this.props.floatingTextAsset, position).then((spawns : Entity[]) => {
      spawns.forEach((spawn : Entity) => {
        var floatingText = BehaviourFinder.GetBehaviour<FloatingText>(spawn);
        floatingText?.setText(text, this.props.floatSpeed, this.props.rotationSpeed, this.props.duration);
        position.y = this.props.yPos;
        spawn.position.set(position);
        spawn.color.set(color);
      })
    });
  }
}
Component.register(FloatingTextManager);
