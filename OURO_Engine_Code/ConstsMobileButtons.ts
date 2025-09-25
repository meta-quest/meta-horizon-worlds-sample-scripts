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

import { TextureImageAssetEx } from 'AssetEx';
import { ButtonId } from 'ConstsIdsUI';
import { ButtonIconStyle, ButtonStyleOptions, BUTTON_STYLE_OPTIONS_DEFAULT, PLACEHOLDER_ICON, TEXT_STYLE_DEFAULT } from 'ConstsUI';
import { BUTTON_POSITION_RELOAD } from 'ConstsUIMobilePositions';
import * as ui from 'horizon/ui';

export const MOBILE_BUTTON_COOLDOWN_FILL_IMAGE_TEXTURE = TextureImageAssetEx.new('0');

export const MOBILE_BUTTON_SIZE_DEFAULT = 74;
export const MOBILE_BUTTON_SIZE_JUMP = 118;
export const MOBILE_BUTTON_SIZE_ABILITIES = 90 * 1.15;

export const RELOAD_BUTTON_ICON = TextureImageAssetEx.new('0');
export const SWAP_BUTTON_ICON = TextureImageAssetEx.new('0');
export const JUMP_BUTTON_ICON = TextureImageAssetEx.new('0');
export const FIRE_BUTTON_ICON = TextureImageAssetEx.new('0');
export const AMMO_BUTTON_AMMO_ICON = TextureImageAssetEx.new('0');

export const DEFAULT_JUMP_BUTTON_BACKGROUND_TEXTURE = TextureImageAssetEx.new('0');

export const MOBILE_ABILITY_COOLDOWN_MASK_STYLE: ui.ViewStyle = {
    zIndex: 1,
    opacity: 0.5,
}

export const MOBILE_BUTTON_STYLE_ICON: ButtonIconStyle = {
    icon: PLACEHOLDER_ICON,
    style: {
        position: 'relative',
        height: '100%%',
        width: '100%%',
        alignSelf: 'center',
        alignItems: 'center',
        opacity: 0.9,
        justifyContent: 'center',
    },
    iconContainerStyle: {},
    stateColors: {
        color: 'rgba(255,255,255)',
        disabledColor: 'rgb(170,170,170)',
        selectedColor: BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors.selectedColor,
    },
};
export const MOBILE_BUTTON_STYLE: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        borderRadius: 100,
        width: MOBILE_BUTTON_SIZE_DEFAULT,
        height: MOBILE_BUTTON_SIZE_DEFAULT,
        position: 'absolute',
    },
    buttonStateColors: {
        color: 'rgba(50,50,50,0.8)',
        hoverColor: 'rgba(217, 217, 217, 0.8)',
        pressColor: 'rgba(174, 174, 174, 0.8)',

        disabledColor: 'rgba(81,81,81,0.8)',
        disabledHoverColor: 'rgba(138,138,138,0.8)',
        disabledPressColor: 'rgba(138,138,138,0.8)',

        selectedColor: 'rgba(217, 217, 217, 0.8)',
        selectedHoverColor: 'rgba(217, 217, 217, 0.8)',
        selectedPressColor: 'rgba(227,227,227,0.8)',
    },
    iconData: MOBILE_BUTTON_STYLE_ICON,
};

export const RELOAD_BUTTON_CONTAINER_STYLE: ui.ViewStyle = {
    position: 'absolute',
    right: BUTTON_POSITION_RELOAD.x,
    bottom: BUTTON_POSITION_RELOAD.y,

    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignContent: 'flex-end',
};

export const AMMO_DISPLAY_STYLE: ui.ViewStyle = {
    width: 70,
    height: 70,
    flexDirection: 'column',
    alignSelf: 'center',
    alignContent: 'center',
    position: 'absolute',
    zIndex: 1,
};

export const AMMO_DISPLAY_CURRENT_AMMO_TEXT_STYLE: ui.TextStyle = {
    ...TEXT_STYLE_DEFAULT,
    fontSize: 30,
    textAlign: 'center',
    textAlignVertical: 'top',
    height: '100%',
    width: '100%',
    position: 'absolute',
    transform: [{skewX: '-10'}],
};

export const AMMO_DISPLAY_RESERVE_AMMO_TEXT_STYLE: ui.TextStyle = {
    ...TEXT_STYLE_DEFAULT,
    fontSize: 15,
    textAlign: 'center',
    textAlignVertical: 'bottom',
    height: '100%',
    paddingBottom: 4,
    position: 'absolute',
    transform: [{skewX: '-10'}],
};

export const RELOAD_BUTTON_STYLE: ui.ViewStyle = {
    ...MOBILE_BUTTON_STYLE.buttonStyle,
    margin: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
};

// Control Schemes

export enum HUDControlSchemeType {
    LOBBY,
    ROUND,
    PODIUM,
    DEATH_POINTS,
    DEATH_ELIMINATION,
    WELCOME_VIDEO,
    HUD,
    HUD_OVERLAY,
}

export type HUDControlScheme = {
    priority: number,
    buttons: ButtonId[],
};

export const ALL_CONTROL_SCHEMES = new Map<HUDControlSchemeType, HUDControlScheme>([
    [HUDControlSchemeType.LOBBY, {
        priority: 10,
        buttons: [
            'jump',
            'abilityUtility'
        ],
    }],
    [HUDControlSchemeType.ROUND, {
        priority: 10,
        buttons: [
            'jump',
            'reload',
            'abilityPrimary',
            'abilityUtility',
            'swap',
        ],
    }],
    [HUDControlSchemeType.PODIUM, {
        priority: 50,
        buttons: [],
    }],
    [HUDControlSchemeType.DEATH_POINTS, {
        priority: 20,
        buttons: [],
    }],
    [HUDControlSchemeType.DEATH_ELIMINATION, {
        priority: 25,
        buttons: ['nextFollowTarget'],
    }],
    [HUDControlSchemeType.WELCOME_VIDEO, {
        priority: 100,
        buttons: [],
    }],
    [HUDControlSchemeType.HUD, {
        priority: 80,
        buttons: [],
    }],
    [HUDControlSchemeType.HUD_OVERLAY, {
        priority: 85,
        buttons: [],
    }]
]);
