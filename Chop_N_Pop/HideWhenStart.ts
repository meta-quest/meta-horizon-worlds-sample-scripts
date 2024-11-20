// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { CodeBlockEvents, Component, Player, PropTypes, TextGizmo } from 'horizon/core';

class HideWhenStart extends Behaviour<typeof HideWhenStart> {
  static propsDefinition = {};

  Start() {
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerEnterWorld,
      (player: Player) => {
        this.entity.visible.set(false);
      },
    );
  }
}
Component.register(HideWhenStart);
