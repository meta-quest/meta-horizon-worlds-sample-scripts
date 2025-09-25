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

export function validId<T extends string>(arrayName: string, allValues: readonly string[], value: string): T {
    if (!allValues.includes(value as T)) {
        throw new Error(`Invalid ID: ${value}. Add to ${arrayName} array`);
    }

    return value as T;
}

export function isValidId(arrayName: string, allValues: readonly string[], value: string) {
    try {
        validId(arrayName, allValues, value);
        return true;
    } catch (e) {
        return false;
    }
}
