// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by OURO Interactive
//------------------------------------
//
//                   @
//                   @@@@
//                    @@@@@
//             @@@      @@@@@
//           @@@@@@      @@@@@
//          @@@@@         @@@@@@
//        @@@@@              @@@@@
//         @@@@@@           @@@@@
//           @@@@@         @@@@@
//             @@@@@@   @@@@@
//               @@@@@ @@@@@
//                 @@OURO@@
//                   @@@
//
//------------------------------------

import { DebugDraw } from 'DebugDraw';
import { onDebugDrawInitialized } from 'Events';
import { Component, PropTypes } from 'horizon/core';
import { logEx } from 'UtilsConsoleEx';
import { getFirstAncestorOfTypedScript, isServer, setOwner, toStringSafe } from 'UtilsGameplay';

abstract class DebugDrawComponent extends Component<typeof DebugDrawComponent> {
    abstract doObjRegistrationFunc(manager: DebugDraw): void;

    static propsDefinition = {
        localOnly: {type: PropTypes.Boolean, default: false},
    };

    preStart() {
        if (!this.props.localOnly || this.props.localOnly && !isServer(this.world)) return;

        this.connectNetworkBroadcastEvent(onDebugDrawInitialized, () => {
            this.setOwnershipToManagersLocalPlayer();
        });
    }

    start() {
        if (isServer(this.world) && this.props.localOnly) return;
        this.registerToManager();
    }

    private getManager() {
        return getFirstAncestorOfTypedScript(this.entity, DebugDraw);
    }

    private setOwnershipToManagersLocalPlayer() {
        const localPlayer = this.getManager()?.entity.owner.get();
        if (!localPlayer) return;

        setOwner(localPlayer, this.entity);
    }

    private registerToManager() {
        const manager = this.getManager();
        if (!manager) {
            const message = `${toStringSafe(this.entity)} could not find ${DebugDraw.name} so it was not registered.`;
            logEx(message);
            throw new Error(message);
        }

        this.doObjRegistrationFunc(manager);
    }
}

export class DebugDrawLine extends DebugDrawComponent {
    doObjRegistrationFunc(manager: DebugDraw) {
        manager.registerLine(this.entity);
    }
}

Component.register(DebugDrawLine);


export class DebugDrawCone extends DebugDrawComponent {
    doObjRegistrationFunc(manager: DebugDraw) {
        manager.registerCone(this.entity);
    }
}

Component.register(DebugDrawCone);

export class DebugDrawSphere extends DebugDrawComponent {
    doObjRegistrationFunc(manager: DebugDraw) {
        manager.registerSphere(this.entity);
    }
}

Component.register(DebugDrawSphere);

export class DebugDrawCircle extends DebugDrawComponent {
    doObjRegistrationFunc(manager: DebugDraw) {
        manager.registerCircle(this.entity);
    }
}

Component.register(DebugDrawCircle);
