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

import { BaseHzComponent } from 'BaseHzComponent';
import { Component, PropTypes } from 'horizon/core';

export const WEAK_POINT_TAG = 'weakPoint';

export class BaseWeakPoint extends BaseHzComponent<typeof BaseWeakPoint> {
    static propsDefinition = {
        ...BaseHzComponent.propsDefinition,
        tags: {type: PropTypes.String, default: WEAK_POINT_TAG},
        id: {type: PropTypes.Number, default: 0},
    };

    override start() {
        super.start();
    }
}

Component.register(BaseWeakPoint);
