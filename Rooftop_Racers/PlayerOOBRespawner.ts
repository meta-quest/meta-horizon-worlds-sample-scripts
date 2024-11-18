// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Simple script to register the spawner to the manager
 */
import { Events } from "Events";
import * as hz from 'horizon/core';

export class PlayerOOBRespawner extends hz.Component<typeof PlayerOOBRespawner> {
    start() {
        this.sendLocalBroadcastEvent(Events.onRegisterOOBRespawner, { caller: this.entity });
    }
}
hz.Component.register(PlayerOOBRespawner);
