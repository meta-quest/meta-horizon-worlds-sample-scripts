// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueTask } from 'FtueTask';
import { AudioGizmo, Component, Player, PropTypes, DefaultPopupOptions, Vec3 } from 'horizon/core';

export class FtueTaskPopup extends FtueTask<typeof FtueTaskPopup> {
  static propsDefinition = {
    ...FtueTask.propsDefinition,
    displayText: {type: PropTypes.String},
    displayTime: {type: PropTypes.Number, default: 2},
    verticalPosition: {type: PropTypes.Number, default: 0},
    popupAppearSfx: {type: PropTypes.Entity},
  };

  onTaskStart(player: Player): void {
    let popupOptions = DefaultPopupOptions;
    popupOptions.position = new Vec3(0, this.props.verticalPosition, 0);
    // You can add more options here from props

    this.props.popupAppearSfx?.as(AudioGizmo).play();
    this.world.ui.showPopupForPlayer(player, this.props.displayText, this.props.displayTime,  );
    this.async.setTimeout(() => {
      this.complete(player);
    }, this.props.displayTime * 1000);
  }

  onTaskComplete(player: Player): void {
  }

}
Component.register(FtueTaskPopup);
