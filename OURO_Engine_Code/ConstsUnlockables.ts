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

import { CurrencyId } from 'ConstsCurrencies';
import { EntitlementId, registerEntitlementId } from 'ConstsEntitlements';

export type UnlockableData = {
    // If true, the player will only see the unlockable if they currently own it.
    // This is useful when, for example, setting up a limited-time skin that
    // you want to hide after the limited time has passed.
    isHiddenWhenUnowned?: boolean,

    // The entitlements required for a player to acquire an unlockable.
    // The player must have ALL required entitlements to acquire.
    requiredEntitlements?: EntitlementId[],

    // The currencies required for a player to acquire (purchase) an unlockable.
    // The player must spend ALL currencies to acquire.
    requiredCurrencies?: Map<CurrencyId, number>,

    // If the player has these entitlements, they own the unlockable.
    // The player must have ALL ownership entitlements to own.
    // On a standard acquire, the player is granted all ownership entitlements.
    ownershipEntitlements?: EntitlementId[],
}

export function registerUnlockableDataEntitlementIds(unlockData: UnlockableData) {
    registerEntitlementIds(unlockData.requiredEntitlements);
    registerEntitlementIds(unlockData.ownershipEntitlements);
    registerSeenIds(unlockData.ownershipEntitlements);
}

export function registerEntitlementIds(ids?: string[]) {
    ids?.forEach((id) => registerEntitlementId(id));
}

export function registerSeenIds(ids?: string[]) {
    ids?.forEach((id) => registerEntitlementId(id));
}
