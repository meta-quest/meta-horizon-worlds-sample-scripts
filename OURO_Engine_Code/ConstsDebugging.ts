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


import {Entity, LocalEvent, NetworkEvent, Player, World} from 'horizon/core';
import {isSourceWorld} from 'ConstsAssetSourceWorld';
import {EntityOrUndefined} from 'UtilsGameplay';
import {HomeMenuOverlayIds, HomeMenuPageIds} from 'ConstsUIPlayerHomeMenu';
import {AssetEx} from 'AssetEx';

const SPAWN_DEBUG_ASSET_IN_ARENA_WORLDS = false;

export function canSpawnDebugTools(world: World) {
    // If we're in OGF, allow debug tools always.
    if (isSourceWorld(world)) return true;

    return SPAWN_DEBUG_ASSET_IN_ARENA_WORLDS;
}

export const DEBUG_MOBILE_SHOW_FIRE_BUTTON = false;
export const debugSetManualFireButtonVisibility = new NetworkEvent<{visible: boolean}>('debugSetManualFireButtonVisibility');

export const DEBUG_UI_SHOW_LOCKOUT_TIME = 500;

export const DEBUG_DISABLE_AUTO_AIM = false;
export const DEBUG_DISABLE_AUTO_TRIGGER = false;

export const AUTO_AIM_DRAW_DEBUG_VISUAL = false;
export const AUTO_TRIGGER_DRAW_DEBUG_VISUAL = false;

export let DEBUG_DISABLE_GAME_ANNOUNCER = false;

export function debugDisableGameAnnouncer(disable: boolean) {
    DEBUG_DISABLE_GAME_ANNOUNCER = disable;
}

export const debugLogProjectileHitEvents = new NetworkEvent<{shouldLog: boolean}>('debugPrintProjectileHitEvents');
export const debugShowObstructedTargetPartsVisual = new NetworkEvent<{show: boolean}>('debugShowObstructedBodyPartLines');


export const PLAYER_HOME_MENU_DEBUG_AUTO_ADD_PLAYERS = false;
export let PLAYER_HOME_MENU_DEBUG_SHOW_PAGE_ID = HomeMenuPageIds.UNDEFINED;
export let PLAYER_HOME_MENU_DEBUG_SHOW_OVERLAY_ID = HomeMenuOverlayIds.UNDEFINED;

export let MEMORY_STRESS_TESTER_ENTITY: EntityOrUndefined;

export function setMemoryStressTesterEntity(entity: EntityOrUndefined) {
    MEMORY_STRESS_TESTER_ENTITY = entity;
}

export const MEMORY_STRESS_TESTER_ASSET = AssetEx.new('0');
export const runMemoryCapacityTest = new LocalEvent<{caller: Player}>('runMemoryCapacityTest');

export const debugShowNux = new LocalEvent<{}>('debugShowNux');
export const debugDismissNux = new LocalEvent<{}>('debugDismissNux');

// This const currently only works on the server to test performance of home menu with/without optimizations.
// To call on the client we would need to send a network event from the server and handle this, which we do not.
export let DEBUG_DISABLE_SERVER_UI_BINDING_OPTIMIZATIONS = false;

export function debugDisableServerUIBindingOptimization(disable: boolean) {
    DEBUG_DISABLE_SERVER_UI_BINDING_OPTIMIZATIONS = disable;
}

export let SHOULD_THROTTLE_UI_BINDING_UPDATES = true;

export function setShouldThrottleUiBindingUpdates(state: boolean) {
    SHOULD_THROTTLE_UI_BINDING_UPDATES = state;
}

export const DEBUG_VFX_LOGS_ENABLED = false;


export const DEBUG_PLAYER_INDEXES = new Map<number, number>();

export const debugShowAllLocalControlButtons = new NetworkEvent<{}>('debugShowAllLocalControlButtons');
export const debugShowLocalControlEntity = new NetworkEvent<{}>('debugShowAllLocalControlEntity');

export const requestLocalControlEntity = new NetworkEvent<{}>('requestLocalControlEntity');
export const sendLocalControlEntity = new NetworkEvent<{entity: Entity}>('sendLocalControlEntity');
