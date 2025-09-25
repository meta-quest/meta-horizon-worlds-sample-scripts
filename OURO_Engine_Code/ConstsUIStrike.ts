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

import {ImageStyle, TextStyle, ViewStyle} from 'horizon/ui';
import {BUTTON_STYLE_OPTIONS_DEFAULT, ButtonStyleOptions, IMAGE_STYLE_DEFAULT, TEXT_STYLE_DEFAULT} from 'ConstsUI';
import {StatId} from 'ConstsIdsStat';
import {TextureImageAssetEx} from 'AssetEx';
import {Color, Entity} from 'horizon/core';

/** -----------------------------------------------------  COLORS ----------------------------------------------------- */
export const UI_COLOR_OFF_WHITE = '#EDEDED';

/** -----------------------------------------------------  GENERAL IMAGE ASSETS ----------------------------------------------------- */
export const UI_ICON_TIMER = TextureImageAssetEx.new('0');
export const UI_ICON_CHECK = TextureImageAssetEx.new('0');
export const UI_PLACEHOLDER_WEAPON_IMAGE = TextureImageAssetEx.new('0');
export const UI_PLACEHOLDER_PLAYER_HEAD_SHOT_IMAGE = TextureImageAssetEx.new('0');
export const UI_ICON_CLOSE_X = TextureImageAssetEx.new('0');

export const UI_ICON_WHITE_X = TextureImageAssetEx.new('0');
export const UI_ICON_WHITE_X_PADDED =  TextureImageAssetEx.new('0');

export const UI_ICON_NOTIFICATION_BADGE = TextureImageAssetEx.new('0');
export const NOTIFICATION_ICON_SIZE = 24;

/** -----------------------------------------------------  TEXT ----------------------------------------------------- */
export const MAX_NAME_CHARACTERS = 12;

export const UI_TEXT_ITALIC_SKEW = -10;
export const UI_FONT_FAMILY = 'Kallisto';

export const UI_TEXT_DEFAULT: TextStyle = {
    ...TEXT_STYLE_DEFAULT,
    color: UI_COLOR_OFF_WHITE,
    fontFamily: UI_FONT_FAMILY,
    fontSize: 24,
};

export const UI_TEXT_DEFAULT_ITALIC: TextStyle = {
    ...UI_TEXT_DEFAULT,
    transform: [
        {skewX: `${UI_TEXT_ITALIC_SKEW}deg`},
    ],
};

export const UI_PLAYER_NAME_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    fontSize: 32,
    fontWeight: 'bold',

};

/** -----------------------------------------------------  PLAYER BANNER ----------------------------------------------------- */
export const UI_LOADOUT_ICON_PLACEHOLDER = TextureImageAssetEx.new('0');

export const UI_OUTER_PADDING = 15;
export const UI_LOADOUT_GRID_SPACING = 8;

export const UI_MY_BANNER_BG_COLOR = '#FFFFFF';
export const UI_MY_BANNER_TEXT_COLOR = 'black';

export const UI_OTHER_BANNER_BG_COLOR = 'black';
export const UI_OTHER_BANNER_TEXT_COLOR = '#FFFFFF';

export const UI_EMPTY_BANNER_BG_COLOR = '#686868';
export const UI_EMPTY_BANNER_PLACEHOLDER_TEXT = 'Empty';
export const UI_EMPTY_BANNER_PLACEHOLDER_RANK_TEXT = 'Waiting for player...';
export const UI_EMPTY_CONTENT_COLOR = '#414141';

export const UI_JOIN_LEAVE_BUTTON_HEIGHT = 100;

export const UI_LOADOUT_WIDGET_HEIGHT = 80;

export const UI_RANK_TEXT: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    color: UI_OTHER_BANNER_TEXT_COLOR,
    textAlign: 'center',
    width: '100%',
    fontSize: 20,
    marginTop: -2,
    marginVertical: UI_LOADOUT_GRID_SPACING,
};

export const UI_STATS_TEXT: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    fontSize: 20,
    textAlignVertical: 'center',
};
export const UI_STATS_HEIGHT = 30;
export const UI_STATS_PADDING_HORIZONTAL = 30;

export const UI_PLAYER_BANNER_HEIGHT = 800;
export const UI_PLAYER_BANNER_WIDTH = 350;

export const UI_PLAYER_BANNER_DISPLAYED_STATS: StatId[] = [
    'damage_dealt',
    'eliminations',
    'projectiles_accuracy',
];

export const UI_PLAYER_BANNER_INFO_SECTION_POS_DEFAULT = UI_PLAYER_BANNER_HEIGHT * 0.67;
export const UI_PLAYER_BANNER_INFO_SECTION_POS_STATS_REVEAL = UI_PLAYER_BANNER_INFO_SECTION_POS_DEFAULT - (UI_PLAYER_BANNER_DISPLAYED_STATS.length * (UI_STATS_HEIGHT)) - UI_OUTER_PADDING;
export const UI_STATS_REVEAL_DELAY_SECONDS = 2;

/** -----------------------------------------------------  MATCH INFO ----------------------------------------------------- */
export const DEBUG_SHOW_ALL_MATCH_RESULTS = false;

export const WIN_COLOR = new Color(1, 1, 0);
export const LOSE_COLOR = new Color(0.93, 0.14, 0.14);

export const DEATH_TEXT = 'Eliminated';

export const RESULTS_TEXT_DURATION_MILLISECONDS = 2000;
export const RESULTS_SHOW_DELAY_MILLISECONDS = 1000;

export const MATCH_WIN_TEXT = 'VICTORY';
export const MATCH_LOSE_TEXT = 'DEFEAT';
export const MATCH_TIE_TEXT = 'TIE';
export const MATCH_END_TEXT_DURATION_MILLISECONDS = 2000;
export const MATCH_INTRO_SHOW_DURATION_MILLISECONDS = 3000;

/** -----------------------------------------------------  ROUND INFO ----------------------------------------------------- */
export const UI_ROUND_WINNER_TEXT_IMAGE = TextureImageAssetEx.new('0');
export const UI_WINNER_TEXT_IMAGE_HEIGHT = 100;
export const UI_ROUND_INFO_WINNER_DISPLAY_PADDING = 35;
export const UI_ROUND_INFO_WINNER_DISPLAY_SHOW_DELAY_SECONDS = 2.0;

export const UI_ROUND_INFO_HEIGHT = 400;
export const UI_ROUND_INFO_WIDTH = 2100;

export const UI_TIMER_WIDTH = 200;
export const UI_ROUND_INFO_CENTER_AREA_WIDTH = 600;
export const UI_ROUND_INFO_PLAYER_PORTRAIT_CENTER_OFFSET = 600;
export const UI_ROUND_INFO_SPACE_BETWEEN_PORTRAITS = 15;

export const BANNER_TEXT_COLOR_DEFAULT = new Color(1, 1, 1);
export const BANNER_TEXT_COLOR_WIN = new Color(1, 1, 0);
export const BANNER_TEXT_COLOR_LOSE = new Color(0.93, 0.14, 0.14);

export const ROUND_WIN_TEXT = 'Round Won';
export const ROUND_LOSE_TEXT = 'Round Lost';
export const ROUND_TIE_TEXT = 'Round Tie';

export interface ResultFeedbackData {
    text: string,
    showVFX?: Entity,
    showSFX?: Entity,
    headerTransitionSFX?: Entity,
    scoreChangeSFX?: Entity,
}

/** -----------------------------------------------------  PLAYER PORTRAIT ----------------------------------------------------- */
export const UI_PLAYER_PORTRAIT_PADDING = 15;
export const UI_PLAYER_PORTRAIT_WIDTH = 220;
export const UI_PLAYER_PORTRAIT_HEIGHT = 200;
export const UI_PLAYER_PORTRAIT_NAME_TEXT_HEIGHT = 40;
export const UI_PLAYER_PORTRAIT_CONTAINER_MARGIN_OFFSET = 50;
export const UI_PLAYER_PORTRAIT_SKEW_DEGREES = -15;
export const UI_PLAYER_PORTRAIT_EXPANSION = 30;

export const UI_PLAYER_PORTRAIT_DEATH_OVERLAY = TextureImageAssetEx.new('0');


/** -----------------------------------------------------  MATCH WIN LOSE ----------------------------------------------------- */
export const UI_MATCH_WIN_LOSE_REVEAL_DELAY_SECONDS = 1;
export const UI_MATCH_WIN_LOSE_WIDTH = 1400;
export const UI_MATCH_WIN_LOSE_HEIGHT = 1200;

export const UI_MATCH_WIN_LOSE_BACKGROUND_TOP_MARGIN = 200;
export const UI_WIN_LOSE_TEXT_IMAGE_HEIGHT = 200;

export const UI_MATCH_WINNER_TEXT_IMAGE = TextureImageAssetEx.new('0');
export const UI_WINNER_BACKGROUND_COLOR = '#ECF329DD';

export const UI_MATCH_LOSER_TEXT_IMAGE = TextureImageAssetEx.new('0');
export const UI_LOSER_BACKGROUND_COLOR = '#483232DD';

/** -----------------------------------------------------  HUD OVERLAY ----------------------------------------------------- */
export const UI_OVERLAY_BACKGROUND_BAR_COLOR_DEFAULT = '#00000099';
export const UI_OVERLAY_BACKGROUND_BAR_MARGIN_TOP = 30;
export const UI_OVERLAY_BACKGROUND_BAR_HEIGHT = 150;

export const UI_OVERLAY_BACKGROUND_BAR_NORMAL_ROUND_COLOR = '#1591E3';
export const UI_OVERLAY_BACKGROUND_BAR_FINAL_ROUND_COLOR = '#F1F1F1';

export const UI_OVERLAY_MAIN_TEXT_FONT_SIZE = 116;

export const UI_OVERLAY_HEADER_TRANSFORM_Y = UI_OVERLAY_BACKGROUND_BAR_MARGIN_TOP - UI_OVERLAY_BACKGROUND_BAR_HEIGHT * 0.5;
export const UI_OVERLAY_HEADER_TRANSFORM_SCALE = 48 / UI_OVERLAY_MAIN_TEXT_FONT_SIZE;

export const UI_OVERLAY_SHOW_TRANSITION_TIME_MILLISECONDS = 500;
export const UI_OVERLAY_SHOW_DURATION_MILLISECONDS = 1000;

export const UI_OVERLAY_HEADER_TRANSITION_TIME_MILLISECONDS = 300;

export const UI_OVERLAY_MAIN_TEXT_TRANSITION_TIME_MILLISECONDS = 500;

export const UI_OVERLAY_REVEAL_DURATION_MILLISECONDS = 1000;

export const UI_OVERLAY_FINAL_TRANSITION_DELAY_MILLISECONDS = 1500;
export const UI_OVERLAY_TRANSITION_AWAY_TIME_MILLISECONDS = 500;

export const UI_OVERLAY_NEXT_SEQUENCE_QUEUE_DELAY_MILLISECONDS = 1000;

/** -----------------------------------------------------  EQUIPMENT CARD ----------------------------------------------------- */
export const UI_EQUIPMENT_CARD_WIDTH = 200;
export const UI_EQUIPMENT_CARD_HEIGHT = 135;
export const UI_EQUIPMENT_CARD_BOARD_RADIUS = 2;

export const UI_EQUIPMENT_CARD_LEVEL_LABEL_FONT_SIZE = 16;
export const UI_EQUIPMENT_CARD_LEVEL_NUMBER_FONT_SIZE = 24;

export const UI_EQUIPMENT_CARD_SPACING = 6;

export const UI_EQUIPMENT_CARD_PROGRESS_FILL_COLOR = UI_COLOR_OFF_WHITE;
export const UI_EQUIPMENT_CARD_PROGRESS_BG_COLOR = '#462D1E';

export const UI_EQUIPMENT_CARD_EMPTY_BG_COLOR = '#000000';
export const UI_EQUIPMENT_CARD_EMPTY_IMG_BG_COLOR = '#2B2222';

export const UI_EQUIPMENT_CARD_LOCKED_IMG_BG_COLOR = '#414141';

export const UI_EQUIPMENT_CARD_WEAPON_BG_COLOR = '#D02F42';
export const UI_EQUIPMENT_CARD_WEAPON_IMG_BG_COLOR = '#583A27';

export const UI_EQUIPMENT_CARD_GADGET_BG_COLOR = '#374D7F';
export const UI_EQUIPMENT_CARD_GADGET_IMG_BG_COLOR = '#333A60';

export const UI_EQUIPMENT_CARD_ABILITY_BG_COLOR = '#87167C';
export const UI_EQUIPMENT_CARD_ABILITY_IMG_BG_COLOR = '#431247';

export const UI_EQUIPMENT_CARD_SELECTED_COLOR = UI_COLOR_OFF_WHITE;
export const UI_EQUIPMENT_CARD_SELECTED_TEXT_COLOR = 'black';
export const UI_EQUIPMENT_CARD_DEFAULT_TEXT_COLOR = UI_COLOR_OFF_WHITE;

export const UI_EQUIPMENT_CARD_CHECK_OVERLAY_BG_COLOR = '#000000AA';
export const UI_EQUIPMENT_CARD_CHECK_SIZE = 60;

/** -----------------------------------------------------  CURRENCY WIDGET ----------------------------------------------------- */
export const UI_CURRENCY_FONT_SIZE = 24;
export const UI_CURRENCY_WIDGET_WIDTH = 80;
export const UI_CURRENCY_WIDGET_HEIGHT = 40;

export const UI_CURRENCY_WIDGET_BORDER_COLOR = '#50596F';
export const UI_CURRENCY_WIDGET_BORDER_WIDTH = 4;

export const UI_CURRENCY_WIDGET_BG_COLOR = '#343C4A';

export const UI_CURRENCY_TEXT_COLOR_MONEY = '#FFEF15';
export const UI_CURRENCY_ICON_MONEY = TextureImageAssetEx.new('0');
export const UI_CURRENCY_ICON_META_CREDITS = TextureImageAssetEx.new('0');

export const UI_CURRENCY_IMAGE_MONEY_S = TextureImageAssetEx.new('0'); // 100g
export const UI_CURRENCY_IMAGE_MONEY_M = TextureImageAssetEx.new('0'); // 200g
export const UI_CURRENCY_IMAGE_MONEY_L = TextureImageAssetEx.new('0'); // 300g
export const UI_CURRENCY_IMAGE_MONEY_XL = TextureImageAssetEx.new('0'); // 500g
export const UI_CURRENCY_IMAGE_MONEY_XXL = TextureImageAssetEx.new('0'); // 1000g

export function getMoneyImage(amount: number) {
    if (amount >= 1000) return UI_CURRENCY_IMAGE_MONEY_XXL;
    else if (amount >= 500) return UI_CURRENCY_IMAGE_MONEY_XL;
    else if (amount >= 300) return UI_CURRENCY_IMAGE_MONEY_L;
    else if (amount >= 200) return UI_CURRENCY_IMAGE_MONEY_M;
    return UI_CURRENCY_IMAGE_MONEY_S;
}

/** -----------------------------------------------------  COST WIDGET ----------------------------------------------------- */
export const UI_COST_FONT_SIZE = 16;
export const UI_COST_WIDGET_WIDTH = 80;
export const UI_COST_WIDGET_HEIGHT = 24;
export const UI_COST_WIDGET_TEXT_COLOR_DEFAULT = '#FFEF15';
export const UI_COST_WIDGET_TEXT_COLOR_LOCKED = '#9C9C9C';
export const UI_COST_WIDGET_BG_COLOR = '#151515';

/** -----------------------------------------------------  TOOL TIP ----------------------------------------------------- */
export const UI_TOOL_TIP_WIDTH = 500;
export const UI_TOOL_TIP_HEIGHT = 60;
export const UI_TOOL_TIP_TEXT_STYLE: TextStyle = {
    ...TEXT_STYLE_DEFAULT,
    fontSize: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: 'white',
    color: 'black',
    padding: 4,
    position: 'absolute',
    alignSelf: 'center',
    width: UI_TOOL_TIP_WIDTH,
    height: UI_TOOL_TIP_HEIGHT,
    bottom: '105%',
};

/** -----------------------------------------------------  PAGE SELECTOR ----------------------------------------------------- */
export const UI_PAGE_SELECTOR_PAGE_NUMBER_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT,
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    flex: 3,
};

export const UI_PAGE_SELECTOR_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        borderRadius: 3,
        flex: 4,
        margin: 0,
        overflow: 'visible',
    },
    labelStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        fontSize: 32,
    },
    buttonStateColors: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
        color: '#C5742D',
        selectedColor: '#C5742D',
        hoverColor: '#f3a763',
        pressColor: '#f6c8a1',
        disabledColor: '#6B7181',
    },
};

/** -----------------------------------------------------  DROP SHADOW ----------------------------------------------------- */
export const UI_DROP_SHADOW_COLOR = '#00000040';
export const UI_DROP_SHADOW_OFFSET = 6;

/** -----------------------------------------------------  STICKER DISPLAY WIDGET ----------------------------------------------------- */
export const UI_STICKER_SIZE = 80;
export const UI_STICKER_DISPLAY_STYLE: ViewStyle = {
    width: UI_STICKER_SIZE,
    height: UI_STICKER_SIZE,
    justifyContent: 'center',
    alignContent: 'center',
};

export const UI_STICKER_DISPLAY_IMAGE_STYLE: ImageStyle = {
    ...IMAGE_STYLE_DEFAULT,
    resizeMode: 'contain',
};

/** -----------------------------------------------------  GAIN BUBBLE ----------------------------------------------------- */
export const GAIN_BUBBLE_BG_COLOR = '#000000DD';
