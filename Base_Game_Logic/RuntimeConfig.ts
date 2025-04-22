// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<<Advanced>>>

import { Behaviour } from "Behaviour";
import { Component, Entity, PropTypes } from "horizon/core";
import { RuntimeConfigStore } from "RuntimeConfigStore";

// Derive from this class to create a config that will call "apply"
// [See Chop 'n' Pop Template for usage example]
export class RuntimeConfig extends Behaviour<typeof RuntimeConfig> {
    static propsDefinition = {
        asset: { type: PropTypes.Asset },
    };

    public BStart(){
        if (!this.props.asset) {
            throw new Error("Config not linked to an asset");
        }
        RuntimeConfigStore.getInstance().addRuntimeConfig(this.props.asset, this);

    }

    public apply(assetEntity: Entity): void { };
}
Component.register(RuntimeConfig);
