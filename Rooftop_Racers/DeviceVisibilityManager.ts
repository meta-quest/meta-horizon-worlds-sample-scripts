
// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import * as hz from 'horizon/core';

type Props = {
  showOnVR:boolean,
  showOnDesktop:boolean,
  showOnMobile:boolean,
};

class VisiblePerPlatform extends hz.Component<Props> {
  static propsDefinition = {
    showOnVR:{type:hz.PropTypes.Boolean, default:false},
    showOnDesktop:{type:hz.PropTypes.Boolean, default:false},
    showOnMobile:{type:hz.PropTypes.Boolean, default:false},
  };

  private readonly visibleToList: hz.Player[] = [];

  preStart() {

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player:hz.Player) => {
      let canSee = false;

      const deviceType = player.deviceType.get();
      canSee ||= (this.props.showOnVR && deviceType == hz.PlayerDeviceType.VR);
      canSee ||= (this.props.showOnDesktop && deviceType == hz.PlayerDeviceType.Desktop);
      canSee ||= (this.props.showOnMobile && deviceType == hz.PlayerDeviceType.Mobile);

      if(canSee){
        this.visibleToList.push(player);
      }

      this.setVisibilityForPlayers(this.visibleToList)
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitWorld, (player:hz.Player) => {
      const indexToRemove = this.visibleToList.findIndex((p) => p.id == player.id);

      if(indexToRemove != -1){
        this.visibleToList.splice(indexToRemove, 1);
      }

    });
  }

  start() {}

  setVisibilityForPlayers(players: hz.Player[], visibleTo: boolean = true) {
    this.entity.setVisibilityForPlayers(players, visibleTo ? hz.PlayerVisibilityMode.VisibleTo : hz.PlayerVisibilityMode.HiddenFrom);
  }
}
hz.Component.register(VisiblePerPlatform);
