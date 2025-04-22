// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueTask } from 'FtueTask';
import { Component, NetworkEvent, Player, PropTypes} from 'horizon/core';

export class FtueTaskNetworkEvent extends FtueTask<typeof FtueTaskNetworkEvent> {
  static propsDefinition = {
    ...FtueTask.propsDefinition,
    eventName: { type: PropTypes.String },
  };

  onTaskStart(player: Player): void {
    this.connectNetworkEvent(this.entity, new NetworkEvent(this.props.eventName), () => {
      this.complete(player);
    });
  }

  onTaskComplete(player: Player): void {
  }
}
Component.register(FtueTaskNetworkEvent);
