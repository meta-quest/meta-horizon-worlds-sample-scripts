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


export const WEAPON_ENTITLEMENT_IDS: readonly string[] = [
    'WEAPON_SAMPLE',
] as const;

export const ABILITY_ENTITLEMENT_IDS: readonly string[] = [
    'ABILITY_SAMPLE',
] as const;

export const GADGET_ENTITLEMENT_IDS: readonly string[] = [
    'ABILITY_GADGET_SAMPLE',
] as const;

export const HAS_POP1_ACCOUNT = 'has_pop1_account';
export const ALL_ENTITLEMENT_IDS: EntitlementId[] = [
    HAS_POP1_ACCOUNT,
    ...WEAPON_ENTITLEMENT_IDS,
    ...ABILITY_ENTITLEMENT_IDS,
    ...GADGET_ENTITLEMENT_IDS,
];
export type EntitlementId = string;
const ALL_ENTITLEMENT_IDS_SET: Set<string> = new Set(ALL_ENTITLEMENT_IDS);

export function registerEntitlementId(value: string) {
    if (!ALL_ENTITLEMENT_IDS_SET.has(value)) {
        ALL_ENTITLEMENT_IDS.push(value);
        ALL_ENTITLEMENT_IDS_SET.add(value);
    }
}

export function validEntitlementId(value: string): EntitlementId {
    if (!ALL_ENTITLEMENT_IDS_SET.has(value)) {
        throw new Error(`Invalid ID: ${value}. Add to ALL_ENTITLEMENT_IDS set`);
    }

    return value;
}
