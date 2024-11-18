// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Component, ParticleGizmo, PropTypes } from 'horizon/core';

export
class FogWall extends Behaviour<typeof FogWall> {
  static propsDefinition = {
    fogVfx1: {type: PropTypes.Entity},
    fogVfx2: {type: PropTypes.Entity},
    fogVfx3: {type: PropTypes.Entity},
  };

  public hide(){
    this.props.fogVfx1?.as(ParticleGizmo).stop();
    this.props.fogVfx2?.as(ParticleGizmo).stop();
    this.props.fogVfx3?.as(ParticleGizmo).stop();
  }

  public show(){
    this.props.fogVfx1?.as(ParticleGizmo).play();
    this.props.fogVfx2?.as(ParticleGizmo).play();
    this.props.fogVfx3?.as(ParticleGizmo).play();
  }
}
Component.register(FogWall);
