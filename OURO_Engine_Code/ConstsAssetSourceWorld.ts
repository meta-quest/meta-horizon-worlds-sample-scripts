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

import {World} from 'horizon/core';

export const SOURCE_WORLD_ID = BigInt('0');
export const SOURCE_WORLD_REGEX = RegExp('.*This World(.*)');

export function isSourceWorld(world: World): boolean {
    return world.id.get() == SOURCE_WORLD_ID || (!!world.name.get().match(SOURCE_WORLD_REGEX));
}
