// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { CodeBlockEvents, Component, Player, PropTypes, TextGizmo } from 'horizon/core';

class Intro extends Behaviour<typeof Intro> {
  static propsDefinition = {
    tombWritingSpots : {type : PropTypes.Entity}
  };

  private writingSpots : Array<TextGizmo> = [];
  private names : Set<string> = new Set<string>();

  Awake(){
    this.props.tombWritingSpots?.children.get()?.forEach((entity) => {
      if (entity as TextGizmo)
      {
        this.writingSpots.push(entity.as(TextGizmo));
      }
    });
  }

  Start() {
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnPlayerEnterWorld,
      (player: Player) => {
        var playerName = player.name.get();

        // Handle multiple join messages (?)
        if (this.names.has(playerName))
          return;

        this.names.add(playerName);

        var epitaph = "Here lies\n" + playerName + "\n?? - Today";
        if (this.writingSpots.length > 0)
        {
          var spot = this.writingSpots.pop();
          spot?.text.set(epitaph);
        }
      },
    );
  }
}
Component.register(Intro);
