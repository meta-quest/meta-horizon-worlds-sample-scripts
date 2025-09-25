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
import { StatId } from 'ConstsIdsStat';
import { LoadoutSlot } from 'ConstsLoadout';
import * as ConstsUI from 'ConstsUI';
import { BarStyleOptions, BAR_STYLE_OPTIONS_DEFAULT, ButtonStyleOptions, BUTTON_STYLE_OPTIONS_DEFAULT, ImageButtonStateImages, STYLE_FULL_FILL } from 'ConstsUI';
import {
    UI_EQUIPMENT_CARD_SPACING,
    UI_EQUIPMENT_CARD_WIDTH,
    UI_OVERLAY_SHOW_TRANSITION_TIME_MILLISECONDS,
    UI_OVERLAY_TRANSITION_AWAY_TIME_MILLISECONDS,
    UI_PAGE_SELECTOR_BUTTON_STYLE_OPTIONS,
    UI_TEXT_DEFAULT_ITALIC
} from 'ConstsUIStrike';
import { Color, Entity, LocalEvent, Player } from 'horizon/core';
import { Easing, TextStyle, ViewStyle } from 'horizon/ui';

export enum HomeMenuPageIds {
    UNDEFINED = 'Undefined',

    DEV = 'DEV',

    CAREER = 'CAREER',
    LOCKER = 'LOCKER',
    QUESTS = 'QUESTS',

    LOADOUT = 'LOADOUT',

    MATCHRESULTS = 'MATCHRESULTS',
    PROGRESSION = 'PROGRESSION',
}

export const HOME_MENU_TAB_PAGE_IDS = [
    HomeMenuPageIds.CAREER,
    HomeMenuPageIds.LOCKER,
    HomeMenuPageIds.QUESTS,
];

export enum HomeMenuOverlayIds {
    UNDEFINED = 'Undefined',

    DEV_PLAYER_DATA = 'DEV_PLAYER_DATA',
    DEV_PERFORMANCE = 'DEV_PERFORMANCE',

    CUSTOMIZE = 'CUSTOMIZE',
    ALL_STATS = 'ALL_STATS',

    WEAPON_SKINS = 'WEAPON_SKINS',

    REWARD = 'REWARD',

    LOGIN_REWARDS = 'LOGIN_REWARDS',
    PLAYTIME_REWARDS = 'PLAYTIME_REWARDS',

    PREMIUM_SHOP = 'PREMIUM_SHOP',

    MATCHMAKING = 'MATCHMAKING',
    MATCHMAKING_STATUS = 'MATCHMAKING_STATUS',
    TEAMBUILDING_STATUS = 'TEAMBUILDING_STATUS',

    LOGIN_PROMPT = 'LOGIN_PROMPT',

    SETTINGS = 'SETTINGS',
}

export enum EntitlementUIState {
    UNDEFINED = 0,
    HIDDEN, // not visible
    LOCKED, // visible but not accessible
    UNLOCKED, // visible and can be purchased
    OWNS, // has been purchased
    EQUIPPED, // is currently equipped
}

/** -----------------------------------------------------  COMMON  ----------------------------------------------------- */
export const UI_WIDTH = 1200;
export const UI_HEIGHT = 600;

export const RED_BUTTON_STYLE_OPTIONS = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        minWidth: 150,
        minHeight: 30,
        padding: 10,
        margin: 0,
        borderRadius: 6,
    },
    buttonStateColors: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
        color: '#DE4545',
        hoverColor: '#e16c6c',
        pressColor: '#f4afaf',
        selectedColor: '#DE4545',
    },
    labelStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        color: 'white',
        fontSize: 16,
    },
};

export const WHITE_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        minWidth: 180,
        padding: 10,
        height: 50,
        margin: 0,
        borderRadius: 10,
    },
    buttonStateColors: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
        color: '#FFFFFF',
        hoverColor: '#f8fa9f',
        pressColor: '#fff9f9',
        selectedColor: '#E3E61E',
    },
    labelStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        color: '#394A4B',
        fontSize: 32,
    },
};

export const ORANGE_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        minWidth: 150,
        minHeight: 30,
        paddingHorizontal: 10,
        margin: 0,
        borderRadius: 6,
    },
    buttonStateColors: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
        color: '#C5742D',
        hoverColor: '#e6a770',
        pressColor: '#f6d4b7',
        selectedColor: '#C5742D',
    },
    labelStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
};

export const YELLOW_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        minWidth: 150,
        padding: 10,
        height: 50,
        margin: 0,
        borderRadius: 10,
    },
    buttonStateColors: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
        color: '#E3E61E',
        hoverColor: '#f8fa9f',
        pressColor: '#fff9f9',
        selectedColor: '#E3E61E',
    },
    labelStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        color: 'black',
        fontSize: 28,
    },
};

export const YELLOW_BUTTON_COST_WIDGET_CONTAINER_STYLE: ViewStyle = {
    backgroundColor: '#535413',
    height: 36,
    borderRadius: 18,
};

export const YELLOW_BUTTON_COST_WIDGET_TEXT_STYLE: TextStyle = {
    fontSize: 24,
};

/** -----------------------------------------------------  EVENTS  ----------------------------------------------------- */
export const openPlayerHomeMenu = new LocalEvent<{pageId: HomeMenuPageIds, player: Player}>('openPlayerHomeMenu');
export const closePlayerHomeMenu = new LocalEvent<{player: Player}>('closePlayerHomeMenu');

export const showPlayerHomeMenuOverlay = new LocalEvent<{overlayId: HomeMenuOverlayIds, player: Player}>('showPlayerHomeMenuOverlay');
export const hidePlayerHomeMenuOverlay = new LocalEvent<{player: Player}>('hidePlayerHomeMenuOverlay');

export const setCanUseHomeMenu = new LocalEvent<{canUseHomeMenu: boolean, player: Player}>('setHomeMenuVisible');
export const setCanChangeLoadout = new LocalEvent<{canChangeLoadout: boolean, player: Player, durationSeconds?: number}>('setChangeLoadoutButtonVisible');
export const setCanLeaveMatch = new LocalEvent<{canLeaveMatch: boolean, player: Player}>('setCanLeaveMatch');

export const setPlayerStatusUIVisibility = new LocalEvent<{visible: boolean, player: Player}>('setPlayerStatusUIVisibility');
export const setRoundInfoUIVisibility = new LocalEvent<{visible: boolean, player: Player}>('setRoundInfoUIVisibility');

export const showKillCard = new LocalEvent<{killer: Player, instant: boolean, player: Player}>('showKillCard');
export const hideKillCard = new LocalEvent<{instant: boolean, player?: Player}>('hideKillCard');

export type showOverlayRewardEventData = {
    rewardUIDatas: RewardUIData[],
    player: Player,
    headerData?: {
        icon?: TextureImageAssetEx,
        text: string,
    }
    showSfx?: Entity,
    onOverlayHide?: (p: Player) => void
}
export const showRewardOverlay = new LocalEvent<showOverlayRewardEventData>('showRewardOverlay');
export const showProgression = new LocalEvent<{player: Player}>('showProgression');
export const showPremiumShop = new LocalEvent<{player: Player}>('showPremiumShop');

/** -----------------------------------------------------  COLORS  ----------------------------------------------------- */
export const HOME_MENU_BACKGROUND_COLOR = '#394052';

/** -----------------------------------------------------  ENTRY POINTS - HOME MENU ----------------------------------------------------- */
export const HOME_MENU_LOGIN_REWARD_ICON = TextureImageAssetEx.new('0');
export const HOME_MENU_PLAYTIME_REWARD_ICON = TextureImageAssetEx.new('0');
export const HOME_MENU_LOGIN_PROMPT_ICON = TextureImageAssetEx.new('0');

export const HOME_MENU_BACKGROUND_IMAGE_GENERAL = TextureImageAssetEx.new('0');
export const HOME_MENU_BACKGROUND_IMAGE_LOCKER = TextureImageAssetEx.new('0');

export const HOME_MENU_TRANSITION_IN_DURATION_MILLISECONDS = 300;
export const HOME_MENU_TRANSITION_IN_EASING = Easing.sin;

export const HOME_MENU_TRANSITION_OUT_DURATION_MILLISECONDS = 300;
export const HOME_MENU_TRANSITION_OUT_EASING = Easing.sin;

export const HOME_MENU_TABS_CONTAINER_HEIGHT_PERCENT_RAW = 14;
export const HOME_MENU_BOTTOM_OFFSET_PERCENT_RAW = 7;
export const HOME_MENU_CLOSED_VIEW_HEIGHT_PERCENT = `${HOME_MENU_TABS_CONTAINER_HEIGHT_PERCENT_RAW}%`;
export const HOME_MENU_TABS_CLOSE_STATE_BOTTOM_OFFSET_PERCENT = `${HOME_MENU_BOTTOM_OFFSET_PERCENT_RAW}%`;
export const HOME_MENU_TABS_OPEN_STATE_BOTTOM_OFFSET_PERCENT = `${100 - HOME_MENU_TABS_CONTAINER_HEIGHT_PERCENT_RAW}%`;

export const HOME_MENU_BODY_HEIGHT_PERCENT = `${100 - HOME_MENU_TABS_CONTAINER_HEIGHT_PERCENT_RAW}%`;
export const HOME_MENU_BODY_CLOSE_STATE_TOP_OFFSET_PERCENT = `${100 - HOME_MENU_BOTTOM_OFFSET_PERCENT_RAW}%`;
export const HOME_MENU_BODY_OPEN_STATE_TOP_OFFSET_PERCENT = HOME_MENU_CLOSED_VIEW_HEIGHT_PERCENT;

export const HOME_MENU_BUTTON_PLAY_IMAGES: ImageButtonStateImages = {
    image: TextureImageAssetEx.new('0'),
    pressImage: TextureImageAssetEx.new('0'),
};
export const HOME_MENU_PLAY_BUTTON_HEIGHT = 48;
export const HOME_MENU_PLAY_BUTTON_WIDTH = HOME_MENU_PLAY_BUTTON_HEIGHT * 5.375;
export const HOME_MENU_PLAY_BUTTON_STYLE: ViewStyle = {
    height: HOME_MENU_PLAY_BUTTON_HEIGHT,
    width: HOME_MENU_PLAY_BUTTON_WIDTH,
    position: 'absolute',
    bottom: 80,
};

export const HOME_MENU_CAREER_TAB_IMAGES: ImageButtonStateImages = {
    image: TextureImageAssetEx.new('0'),
    selectedImage: TextureImageAssetEx.new('0'),
};

export const HOME_MENU_LOCKER_TAB_IMAGES: ImageButtonStateImages = {
    image: TextureImageAssetEx.new('0'),
    selectedImage: TextureImageAssetEx.new('0'),
};

export const HOME_MENU_QUESTS_TAB_IMAGES: ImageButtonStateImages = {
    image: TextureImageAssetEx.new('0'),
    selectedImage: TextureImageAssetEx.new('0'),
};

export const HOME_MENU_TAB_IMAGES_MAP = new Map<HomeMenuPageIds, ImageButtonStateImages>(
    [
        [HomeMenuPageIds.CAREER, HOME_MENU_CAREER_TAB_IMAGES],
        [HomeMenuPageIds.LOCKER, HOME_MENU_LOCKER_TAB_IMAGES],
        [HomeMenuPageIds.QUESTS, HOME_MENU_QUESTS_TAB_IMAGES],
    ],
);

export const HOME_MENU_TAB_HEIGHT = 48;
export const HOME_MENU_TAB_WIDTH = HOME_MENU_TAB_HEIGHT * 3.142;
export const HOME_MENU_TAB_BUTTON_STYLE: ViewStyle = {
    height: HOME_MENU_TAB_HEIGHT,
    width: HOME_MENU_TAB_WIDTH,
    marginBottom: -1,
};

export const HOME_MENU_CLOSE_TAB_IMAGES: ImageButtonStateImages = {
    image: TextureImageAssetEx.new('0'),
};

export const HOME_MENU_CLOSE_TAB_BUTTON_STYLE: ViewStyle = {
    ...HOME_MENU_TAB_BUTTON_STYLE,
    width: HOME_MENU_TAB_HEIGHT * 1.354,
};

export const HOME_MENU_NUX_FIRST_PURCHASE_IMAGE = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  ENTRY POINTS - CHANGE LOADOUT ----------------------------------------------------- */

export const LEAVE_MATCH_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...RED_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...RED_BUTTON_STYLE_OPTIONS.buttonStyle,
        width: 200,
        marginBottom: 60,
    },
};

export const CHANGE_LOADOUT_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...YELLOW_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...YELLOW_BUTTON_STYLE_OPTIONS.buttonStyle,
        width: 300,
        marginBottom: 60,
    },
};

export const CHANGE_LOADOUT_AVAILABILITY_BAR_STYLE_OPTIONS: BarStyleOptions = {
    ...BAR_STYLE_OPTIONS_DEFAULT,
    style: {
        height: 10,
        width: CHANGE_LOADOUT_BUTTON_STYLE_OPTIONS.buttonStyle.width,
        marginBottom: 10,
    },
    backgroundStyle: {
        ...BAR_STYLE_OPTIONS_DEFAULT.backgroundStyle,
        backgroundColor: undefined,
    },
    fillStyle: {
        ...BAR_STYLE_OPTIONS_DEFAULT.fillStyle,
        backgroundColor: 'white',
    },
};

/** -----------------------------------------------------  ENTRY POINTS - REWARD BUTTONS ----------------------------------------------------- */
export const HOME_MENU_REWARD_BUTTON_SIZE = 60;
export const HOME_MENU_REWARD_BUTTONS_PLAYTIME_TIMER_HEIGHT = 25;

/** -----------------------------------------------------  PAGES BASE  ----------------------------------------------------- */
export const PAGE_HORIZONTAL_PADDING = 90;
export const SCROLL_VIEW_BAR_PADDING = 12;

/** -----------------------------------------------------  PAGES OVERLAY  ----------------------------------------------------- */
export const PAGE_OVERLAY_Z_INDEX = 100;
export const PAGE_OVERLAY_BG_TINT = '#000000AA';
export const PAGE_OVERLAY_BG_COLOR = '#2F3A55';
export const PAGE_OVERLAY_HEADER_WIDTH_PERCENT = '60%';

export const PAGE_OVERLAY_PADDING = 20;

/** -----------------------------------------------------  CONFIRMATION MODAL  ----------------------------------------------------- */
export const UI_CONFIRMATION_MODAL_OVERLAY_TINT = '#000000AA';
export const UI_CONFIRMATION_MODAL_BG_COLOR = '#1E455F';
export const UI_CONFIRMATION_MODAL_PADDING = 20;
export const UI_CONFIRMATION_MODAL_FONT_SIZE = 24;

export const UI_CONFIRMATION_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...YELLOW_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...YELLOW_BUTTON_STYLE_OPTIONS.buttonStyle,
        width: 100,
        height: 40,
    },
};

/** -----------------------------------------------------  CAREER PAGE ----------------------------------------------------- */
export const CAREER_PAGE_MARGIN_VERTICAL = 20;
export const CAREER_PAGE_INTERIOR_MARGIN_QUESTS = 10;
export const CAREER_PAGE_INTERIOR_MARGIN_CENTER = 15;
export const CAREER_PAGE_INTERIOR_PADDING = 6;

export const CAREER_PAGE_NAME_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    width: '80%',
    marginBottom: 10,
    marginVertical: -15,
    fontSize: 32,
    textAlign: 'left',
};

export const CAREER_PAGE_COMPONENT_VIEW_STYLE_COMMON: ViewStyle = {
    backgroundColor: '#2F3A6DE6',
    borderRadius: 10,
};

export const CAREER_PAGE_INTERIOR_BODY_COLOR = '#404E8DE6';

export const CAREER_PAGE_IMAGE_PROFILE_CUSTOMIZE = TextureImageAssetEx.new('0');
export const CAREER_PAGE_IMAGE_ELIMINATED_BY_INDICATOR = TextureImageAssetEx.new('0');

export const CAREER_PAGE_PROFILE_DISPLAYED_STICKERS_COUNT = 2;
export const CAREER_PAGE_PROFILE_OVERLAY_PERCENT = 23;

export const CAREER_PAGE_BAR_STYLE_OPTIONS: BarStyleOptions = {
    ...BAR_STYLE_OPTIONS_DEFAULT,
    style: {
        ...BAR_STYLE_OPTIONS_DEFAULT.style,
        height: 25,
        marginTop: 4,
        flex: 1,
        borderRadius: 4,
        borderWidth: 0,
        overflow: 'hidden',
    },
    backgroundStyle: {
        ...BAR_STYLE_OPTIONS_DEFAULT.backgroundStyle,
        backgroundColor: '#192249E6',
    },
    fillStyle: {
        ...BAR_STYLE_OPTIONS_DEFAULT.fillStyle,
        backgroundColor: '#1591E3',
        height: 23,
        borderRadius: 4,
    },
    labelStyle: {
        ...BAR_STYLE_OPTIONS_DEFAULT.labelStyle,
        fontSize: 16,
    },
};


/** -----------------------------------------------------  CAREER PAGE - STATS ----------------------------------------------------- */
export const CAREER_PAGE_STATS_FONT_SIZE = 16;
export const CAREER_PAGE_STATS_VALUE_TEXT_STYLE: TextStyle = {
    fontSize: CAREER_PAGE_STATS_FONT_SIZE,
    textAlign: 'center',
    backgroundColor: CAREER_PAGE_COMPONENT_VIEW_STYLE_COMMON.backgroundColor,
    borderRadius: 12,
};

export const CAREER_PAGE_STATS_SECTION_HEADER_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    color: '#7182FF',
};

export const CAREER_PAGE_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'eliminations_deaths_ratio',
];

export enum AllStatsTabIds {
    OVERALL = 'OVERALL',
    POINTS = 'DEATHMATCH',
    ELIMINATIONS = 'SHOWDOWN',
}

export const ALL_STATS_TAB_IDS = [
    AllStatsTabIds.OVERALL,
    AllStatsTabIds.POINTS,
    AllStatsTabIds.ELIMINATIONS,
];

export const ALL_STATS_PAGE_OVERALL_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'eliminations_deaths_ratio',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',
];

export const ALL_STATS_PAGE_OVERALL_DISPLAYED_ACCOUNT_STATS: StatId[] = [
    'owned_weapon_skins_all',
    'owned_bg_cards',
    'owned_stickers',
    'owned_titles',
];

export const ALL_STATS_PAGE_POINTS_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'eliminations_deaths_ratio',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',
];

export const ALL_STATS_PAGE_ELIMINATION_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'win_streak_current',
    'win_streak_longest',
    'eliminations_deaths_ratio',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',
];


/** -----------------------------------------------------  CAREER PAGE - QUESTS ----------------------------------------------------- */

export const QUEST_CARD_HEIGHT = 115;
export const QUEST_CARD_REWARD_TEXT_HEIGHT = 25;

export const QUEST_CARD_BAR_ANIMATION_TIME_MILLISECONDS = 500;

export interface QuestUIData {
    icon: TextureImageAssetEx,
    description: string,
    goalValue: number,
    currentValue: number,
    gains?: number,
    rewardDatas: RewardUIData[],
}

/** -----------------------------------------------------  PROFILE CUSTOMIZE ----------------------------------------------------- */
export enum CustomizeOverlayTabIds {
    TITLE = 'Title',
    STICKER = 'Sticker',
    BG_CARD = 'Card',
}

export const CAREER_PAGE_CUSTOMIZE_TAB_IDS = [
    CustomizeOverlayTabIds.TITLE,
    CustomizeOverlayTabIds.STICKER,
    CustomizeOverlayTabIds.BG_CARD,
];

export const CAREER_PAGE_CUSTOMIZE_TAB_COLOR_DEFAULT = '#95BCF2';
export const CAREER_PAGE_CUSTOMIZE_TAB_COLOR_SELECTED = 'white';

/** -----------------------------------------------------  PROFILE CUSTOMIZE - TITLE ----------------------------------------------------- */
export const CUSTOMIZE_TITLE_NUM_OPTIONS_PER_PAGE = 8;

export const CUSTOMIZE_TITLE_TITLE_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    ...STYLE_FULL_FILL,
    textAlign: 'center',
    textAlignVertical: 'center',
};

export const CUSTOMIZE_TITLE_OPTION_CONTAINER_WIDTH = 350;
export const CUSTOMIZE_TITLE_OPTION_CONTAINER_HEIGHT = 55;
export const CUSTOMIZE_TITLE_OPTION_CONTAINER_MARGIN = 20;
export const CUSTOMIZE_TITLE_TITLE_TEXT_CONTAINER_STYLE: ViewStyle = {
    backgroundColor: '#202531',
    width: '100%',
    height: CUSTOMIZE_TITLE_OPTION_CONTAINER_HEIGHT,
    borderRadius: CUSTOMIZE_TITLE_OPTION_CONTAINER_HEIGHT / 2,
};


export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_DEFAULT = '#3787BC';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_DEFAULT_BORDER = '#3787BC';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_DEFAULT_TEXT = '#F2F2F2';

export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_LOCKED = '#222C45';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_LOCKED_BORDER = '#246088';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_LOCKED_TEXT = '#246088';

export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_UNLOCKED = '#246088';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_UNLOCKED_BORDER = '#3787BC';
export const CUSTOMIZE_TITLE_TITLE_OPTION_COLOR_UNLOCKED_TEXT = '#F2F2F2';

/** -----------------------------------------------------  PROFILE CUSTOMIZE - STICKER ----------------------------------------------------- */
export const CUSTOMIZE_STICKERS_NUM_SLOTS = CAREER_PAGE_PROFILE_DISPLAYED_STICKERS_COUNT;
export const CUSTOMIZE_STICKERS_NUM_OPTIONS_PER_PAGE = 18;

export const CUSTOMIZE_STICKERS_SLOT_SIZE = 100;
export const CUSTOMIZE_STICKERS_SLOT_COLOR_DEFAULT = '#4E566A';
export const CUSTOMIZE_STICKERS_SLOT_COLOR_SELECTED = 'white';

export const CUSTOMIZE_STICKERS_OPTION_CONTAINER_HEIGHT = 90;
export const CUSTOMIZE_STICKERS_OPTION_CONTAINER_WIDTH = 100;
export const CUSTOMIZE_STICKERS_OPTION_CONTAINER_MARGIN_VERTICAL = 10;
export const CUSTOMIZE_STICKERS_OPTION_CONTAINER_MARGIN_HORIZONTAL = 20;
export const CUSTOMIZE_STICKERS_OPTION_CHECK_SIZE = 30;

export const CUSTOMIZE_STICKERS_OPTION_TINT_DEFAULT = '#FFFFFF';
export const CUSTOMIZE_STICKERS_OPTION_TINT_LOCKED = '#FFFFFF44';
export const CUSTOMIZE_STICKERS_OPTION_TINT_UNLOCKED = '#FFFFFF44';

/** -----------------------------------------------------  PROFILE CUSTOMIZE - BG CARD ----------------------------------------------------- */
export const CUSTOMIZE_BG_CARD_NUM_OPTIONS_PER_PAGE = 6;

export const BG_CARD_RAW_WIDTH = 683;
export const BG_CARD_RAW_HEIGHT = 1024;
export const CUSTOMIZE_BG_CARD_OPTION_DIMENSION_SCALER = 0.175;
export const CUSTOMIZE_BG_CARD_OPTION_CONTAINER_WIDTH = BG_CARD_RAW_WIDTH * CUSTOMIZE_BG_CARD_OPTION_DIMENSION_SCALER;
export const CUSTOMIZE_BG_CARD_OPTION_CONTAINER_HEIGHT = BG_CARD_RAW_HEIGHT * CUSTOMIZE_BG_CARD_OPTION_DIMENSION_SCALER;
export const CUSTOMIZE_BG_CARD_OPTION_CONTAINER_MARGIN = 20;
export const CUSTOMIZE_BG_CARD_OPTION_CHECK_SIZE = 40;

export const CUSTOMIZE_BG_CARD_OPTION_TINT_DEFAULT = '#FFFFFF';
export const CUSTOMIZE_BG_CARD_OPTION_TINT_LOCKED = '#FFFFFF44';
export const CUSTOMIZE_BG_CARD_OPTION_TINT_UNLOCKED = '#FFFFFF44';

/** -----------------------------------------------------  LOCKER PAGE ----------------------------------------------------- */
export const LOCKER_PAGE_TOP_PADDING = UI_EQUIPMENT_CARD_SPACING * 4;
export const LOCKER_PAGE_EQUIPMENT_SCROLL_BG_COLOR = '#1A1E26AA';
export const LOCKER_PAGE_EQUIPMENT_SCROLL_POSITION_MARGIN = 12;

export const LOCKER_PAGE_EQUIPMENT_SCROLL_TOTAL_WIDTH = UI_EQUIPMENT_CARD_WIDTH + SCROLL_VIEW_BAR_PADDING + LOCKER_PAGE_EQUIPMENT_SCROLL_POSITION_MARGIN;

export const LOCKER_PAGE_SECTION_HORIZONTAL_PADDING = 20;

export const LOCKER_PAGE_LOCKED_BG_COLOR = '#212121';
export const LOCKER_PAGE_WEAPON_BG_COLOR = '#C62336';
export const LOCKER_PAGE_WIDGET_BG_COLOR = '#374D7F';
export const LOCKER_PAGE_ABILITY_BG_COLOR = '#87167C';

export const LOCKER_PAGE_LOCKED_REWARD_TEXT_BG_COLOR = '#656565';
export const LOCKER_PAGE_WEAPON_REWARD_TEXT_BG_COLOR = '#8F1F2C';
export const LOCKER_PAGE_WIDGET_REWARD_TEXT_BG_COLOR = '#1F238F';
export const LOCKER_PAGE_ABILITY_REWARD_TEXT_BG_COLOR = '#6E1765';

export const LOCKER_PAGE_MONEY_REWARD_TEXT_COLOR = '#FDC91D';

export const LOCKER_PAGE_EQUIPMENT_DETAILS_NAME_FONT_SIZE = 30;
export const LOCKER_PAGE_STANDARD_FONT_SIZE = 16;
export const LOCKER_PAGE_EQUIPMENT_DETAILS_HEADER_VERTICAL_MARGIN = 20;

export const LOCKER_PAGE_EQUIPMENT_DETAILS_OVERALL_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'eliminations_deaths_ratio',
    'damage_dealt',
    'eliminations',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',
];

export const LOCKER_PAGE_EQUIPMENT_DETAILS_GAME_MODE_DISPLAYED_STATS: StatId[] = [
    'matches_played',
    'matches_won',
    'matches_win_rate',
    'eliminations_deaths_ratio',
    'damage_dealt',
    'average_damage_dealt_per_match',
    'eliminations',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',
];

export const LOCKER_PAGE_IMAGE_SKINS_BUTTON = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  LOCKER PAGE - WEAPON SKINS ----------------------------------------------------- */
export const LOCKER_PAGE_WEAPON_SKINS_NUM_OPTIONS_PER_PAGE = 8;
export const LOCKER_PAGE_WEAPON_SKINS_BG_COLOR = '#2A2F3CBF';

export const LOCKER_PAGE_WEAPON_SKINS_BG_PADDING = 24;
export const LOCKER_PAGE_WEAPON_SKINS_BG_BORDER_RADIUS = 16;

export const LOCKER_PAGE_WEAPON_SKINS_OPTION_CONTAINER_HEIGHT = 100;
export const LOCKER_PAGE_WEAPON_SKINS_OPTION_CHECK_SIZE = 40;

export const LOCKER_PAGE_WEAPON_SKINS_OPTION_TINT_DEFAULT = '#FFFFFF';
export const LOCKER_PAGE_WEAPON_SKINS_OPTION_TINT_LOCKED = '#444444';
export const LOCKER_PAGE_WEAPON_SKINS_OPTION_TINT_UNLOCKED = '#999999';

export const LOCKER_PAGE_WEAPON_SKINS_IMAGE_DONE_BUTTON = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  LOCKER PAGE - PROGRESS DISPLAY ----------------------------------------------------- */
export const LOCKER_PAGE_PROGRESS_DISPLAY_STARBURST = TextureImageAssetEx.new('0');
export const LOCKER_PAGE_PROGRESS_DISPLAY_IMAGE_CHEST_CLOSED = TextureImageAssetEx.new('0');
export const LOCKER_PAGE_PROGRESS_DISPLAY_IMAGE_CHEST_OPENED = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  QUESTS PAGE ----------------------------------------------------- */
export const QUESTS_PAGE_NUM_QUESTS_PER_PAGE = 9;

export const QUEST_CARD_BG_COLOR_DEFAULT = '#3E538AE6';
export const QUEST_CARD_BG_COLOR_COMPLETE = '#267DCE';

export const QUEST_CARD_BAR_COLOR_DEFAULT = '#1591E3';
export const QUEST_CARD_BAR_COLOR_COMPLETE = '#E3E61E';

/** -----------------------------------------------------  LOADOUT MANAGER ----------------------------------------------------- */
export const LOADOUT_MANAGER_BG_COLOR = '#000000AA';
export const LOADOUT_MANAGER_DISPLAYED_LOADOUT_SLOTS = [
    LoadoutSlot.WEAPON_PRIMARY,
    LoadoutSlot.WEAPON_SECONDARY,
    LoadoutSlot.ABILITY_UTILITY,
    LoadoutSlot.ABILITY_PRIMARY,
];

export const LOADOUT_MANAGER_CLOSE_DELAY_SECONDS = 1.0;

export const LOADOUT_SLOT_WIDTH = 200;
export const LOADOUT_SLOT_HEIGHT = 135;
export const LOADOUT_SLOT_BG_COLOR = '#000000AA';
export const LOADOUT_SLOT_BORDER_COLOR = 'white';

export const LOADOUT_SLOT_MARGIN = 6;
export const LOADOUT_SLOT_LABEL_COLOR_EMPTY = '#ACACAC';
export const LOADOUT_SLOT_LABEL_COLOR_SET = 'white';
export const LOADOUT_SLOT_SELECTED_BORDER_WIDTH = 6;

export const LOADOUT_TRANSITION_AWAY_TIME_MILLISECONDS = 300;

/** -----------------------------------------------------  OVERLAY - REWARD ----------------------------------------------------- */
export const REWARD_IMAGE_BG = TextureImageAssetEx.new('0');
export const REWARD_IMAGE_STAR_BURST = TextureImageAssetEx.new('0');
export const REWARD_STAR_BURST_ROTATION_MILLISECONDS_PER_REVOLUTION = 15000;

export const REWARD_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    color: 'black',
    fontSize: 32,
};

export interface RewardUIData {
    rewardBgImage?: TextureImageAssetEx,
    weaponImage?: TextureImageAssetEx,
    abilityImage?: TextureImageAssetEx,
    stickerImage?: TextureImageAssetEx,
    bgCard?: TextureImageAssetEx,
    money?: number,
    title?: string,
    text?: string,
    sfx?: Entity,
    requireManualSkip?: boolean,
}

export const REWARD_TEXT_NEW_WEAPON = 'New Weapon Unlocked!';
export const REWARD_TEXT_NEW_GADGET = 'New Gadget Unlocked!';
export const REWARD_TEXT_NEW_POWER = 'New Power Unlocked!';

export const REWARD_TEXT_NEW_TITLE_AVAILABLE = 'New Title Available!';
export const REWARD_TEXT_NEW_TITLE_ACQUIRED = 'New Title Acquired!';

export const REWARD_TEXT_NEW_STICKER_AVAILABLE = 'New Sticker Available!';
export const REWARD_TEXT_NEW_STICKER_ACQUIRED = 'New Sticker Acquired!';

export const REWARD_TEXT_NEW_BG_CARD_AVAILABLE = 'New Card Available!';
export const REWARD_TEXT_NEW_BG_CARD_ACQUIRED = 'New Card Acquired!';

export const REWARD_TEXT_NEW_WEAPON_WRAP_AVAILABLE = 'New Weapon Wrap Available!';
export const REWARD_TEXT_NEW_WEAPON_WRAP_ACQUIRED = 'New Weapon Wrap Acquired!';

export const REWARD_TEXT_XP_BOOST_ACQUIRED = 'XP Boost Acquired!';
export const REWARD_TEXT_GOLD_BOOST_ACQUIRED = 'Gold Boost Acquired!';


export const REWARD_MIN_SHOW_TIME_MILLISECONDS = 500;
export const REWARD_AUTO_SKIP_TIME_MILLISECONDS = 5000;

/** -----------------------------------------------------  PROGRESSION ----------------------------------------------------- */
export enum ProgressionUIPhaseState {
    UNDEFINED,
    INITIAL_REVEAL,
    CONSUMING_GAINS,
    ADDING_GAINS,
    SHOWING_REWARDS,
    FINAL_SHOWING,
    COMPLETING,
}

export const PROGRESSION_BAR_HEIGHT = 50;
export const PROGRESSION_BAR_PADDING_HORIZONTAL = 20;
export const PROGRESSION_BAR_BG_COLOR = 'black';
export const PROGRESSION_BAR_TEXT_STYLE: TextStyle = {
    ...UI_TEXT_DEFAULT_ITALIC,
    textAlignVertical: 'bottom',
    fontWeight: 'normal',
};
export const PROGRESSION_BAR_MIN_DISPLAYED_PERCENT = 0;

export const PROGRESSION_GAINS_BUBBLE_TOTAL_TEXT_FONT_SIZE = 32;
export const PROGRESSION_GAINS_SHOW_TIME_MILLISECONDS = 500;
export const PROGRESSION_GAINS_CONSUME_TRANSITION_TIME_MILLISECONDS = 300;
export const PROGRESSION_GAINS_HORIZONTAL_PADDING = 40;
export const PROGRESSION_GAINS_VERTICAL_PADDING = 20;

export const PROGRESSION_PLAYER_XP_BAR_LEVEL_LABEL_FONT_SIZE = 28;
export const PROGRESSION_PLAYER_XP_BAR_LEVEL_NUMBER_FONT_SIZE = 40;
export const PROGRESSION_PLAYER_XP_BAR_XP_PERCENT_FONT_SIZE = 24;

export const PROGRESSION_PLAYER_XP_BAR_BORDER_RADIUS = 12;
export const PROGRESSION_PLAYER_XP_BAR_FILL_COLOR = '#1591E3';
export const PROGRESSION_PLAYER_XP_BAR_PERCENT_COLOR = '#61C0FF';
export const PROGRESSION_PLAYER_XP_BAR_TRANSITION_TIME_MILLISECONDS = 1000;
export const PROGRESSION_PLAYER_XP_BAR_ANIMATION_EASING = Easing.in(Easing.sin);

export const PROGRESSION_RANK_SOURCE_TEXT_COLOR = '#F342D2';
export const PROGRESSION_PLAYER_XP_SOURCE_TEXT_COLOR = '#61C0FF';
export const PROGRESSION_MONEY_SOURCE_TEXT_COLOR = '#FDC91D';
export const PROGRESSION_GAINS_FRIEND_BONUS_TEXT_COLOR = '#F5FF6C';


export const PROGRESSION_LEVEL_UP_BANNER_BG_BAR_COLOR = '#1591E3';
export const PROGRESSION_LEVEL_UP_BANNER_SHOW_TIME_MILLISECONDS = 500;

export const PROGRESSION_LEVEL_UP_END_DELAY_MILLISECONDS = PROGRESSION_LEVEL_UP_BANNER_SHOW_TIME_MILLISECONDS + UI_OVERLAY_SHOW_TRANSITION_TIME_MILLISECONDS + UI_OVERLAY_TRANSITION_AWAY_TIME_MILLISECONDS;
export const PROGRESSION_TALLY_END_SEQUENCE_DELAY_MILLISECONDS = 1000;


export const PROGRESSION_TIME_BETWEEN_PHASES_MILLISECONDS = 300;
export const PROGRESSION_QUEST_CARD_SHOW_TIME_MILLISECONDS = 1000;

export const PROGRESSION_PLAYER_RESULTS_WIDTH = 240;
export const PROGRESSION_PLAYER_RESULTS_HEIGHT = 160;
export const PROGRESSION_PLAYER_RESULTS_HEADER_FONT_SIZE = 16;
export const PROGRESSION_PLAYER_RESULTS_STATS_FONT_SIZE = 16;
export const PROGRESSION_PLAYER_RESULTS_STICKER_SIZE = 60 * 1.5;

export const PROGRESSION_PLAYER_RESULTS_RANK_FONT_SIZE = 36;

export const PROGRESSION_PLAYER_RESULTS_BG_COLOR_DEFAULT = '#1A1728D2';
export const PROGRESSION_PLAYER_RESULTS_BG_COLOR_PLAYER = '#002FDBEC';
export const PROGRESSION_PLAYER_RESULTS_HEADER_BG_COLOR = '#0000006C';

export const PROGRESSION_PLAYER_RESULTS_DISPLAYED_STATS: StatId[] = [
    'eliminations',
    'deaths',
    'assists',
    'damage_dealt',
];

export const PROGRESSION_MATCH_RESULT_INITIAL_TRANSITION_DELAY_MILLISECONDS = 500;
export const PROGRESSION_MATCH_RESULT_TRANSITION_DELAY_STEP_MILLISECONDS = 500;
export const PROGRESSION_MATCH_RESULT_TRANSITION_DURATION_MILLISECONDS = 300;

export const PROGRESSION_MATCH_RESULTS_IMAGE_MVP = TextureImageAssetEx.new('0');

export const PROGRESSION_MATCH_RESULTS_IMAGE_NEXT = TextureImageAssetEx.new('0');
export const PROGRESSION_END_OF_MATCH_IMAGE_BUTTON_ONE_MORE_GAME = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  HUD ----------------------------------------------------- */
export const HUD_ROUND_RANKING_PORTRAIT_SIZE = 50;
export const HUD_ROUND_RANKING_PORTRAIT_MARGIN = 5;
export const HUD_ROUND_RANKING_MAX_PORTRAITS = 9;
export const HUD_ROUND_RANKING_PORTRAIT_BG_RED = '#BC2222';
export const HUD_ROUND_RANKING_PORTRAIT_BG_BLUE = '#1E50B3';
export const HUD_ROUND_RANKING_PORTRAIT_BG_GREY = '#646464';
export const HUD_ROUND_RANKING_PORTRAIT_PERSONAL_BORDER_WIDTH = 3;
export const HUD_ROUND_RANKING_PORTRAIT_CROWN = TextureImageAssetEx.new('0');
export const HUD_ROUND_RANKING_IMAGE_SCORE_DISPLAY_BACKGROUND = TextureImageAssetEx.new('0');
export const HUD_ROUND_RANKING_HEALTH_BAR_HEIGHT = 7;
export const HUD_ROUND_RANKING_HEALTH_BAR_WIDTH = 40;
export const HUD_ROUND_RANKING_HEALTH_BAR_BORDER_COLOR = '#000000';
export const HUD_ROUND_RANKING_HEALTH_BAR_BORDER_WIDTH = 1;
export const HUD_ROUND_RANKING_HEALTH_BAR_FILL_COLOR_ALLY = '#19EE2B';
export const HUD_ROUND_RANKING_HEALTH_BAR_FILL_COLOR_ENEMY = '#ff0000';
export const HUD_ROUND_RANKING_MARGIN_TOP = 1;

export const HUD_ROUND_MATCHUP_BG_RED = '#BC2222';
export const HUD_ROUND_MATCHUP_BG_BLUE = '#1E50B3';

export const HUD_HP_BAR_IMAGE_BG = TextureImageAssetEx.new('0');
export const HUD_HP_BAR_IMAGE_FILL = TextureImageAssetEx.new('0');
export const HUD_HP_BAR_IMAGE_FILL_HEAL = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  BOOSTS DISPLAY ----------------------------------------------------- */
export const HOME_MENU_BOOST_DISPLAY_ICON_EMPTY = TextureImageAssetEx.new('0');
export const HOME_MENU_BOOST_DISPLAY_ICON_XP = TextureImageAssetEx.new('0');
export const HOME_MENU_BOOST_DISPLAY_ICON_GOLD = TextureImageAssetEx.new('0');

export const HOME_MENU_BOOST_DISPLAY_CONTAINER_WIDTH = 80;
export const HOME_MENU_BOOST_DISPLAY_CONTAINER_HEIGHT = 40;

/** -----------------------------------------------------  PREMIUM SHOP ----------------------------------------------------- */
export const PREMIUM_SHOP_IMAGE_XP_BOOST = TextureImageAssetEx.new('0');
export const PREMIUM_SHOP_IMAGE_GOLD_BOOST = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  MATCHMAKING ----------------------------------------------------- */
export const MATCHMAKING_IMAGE_POINTS = TextureImageAssetEx.new('0');
export const MATCHMAKING_IMAGE_ELIMINATIONS = TextureImageAssetEx.new('0');
export const MATCHMAKING_IMAGE_ELIMINATIONS_COMING_SOON = TextureImageAssetEx.new('0');

export const MATCHMAKING_IMAGE_BG = TextureImageAssetEx.new('0');
export const MATCHMAKING_IMAGE_CLOSE_BUTTON = TextureImageAssetEx.new('0');

export const MATCHMAKING_PADDING = 40;

/** -----------------------------------------------------  SETTINGS ----------------------------------------------------- */
export const SETTINGS_IMAGE_BUTTON_SETTINGS = TextureImageAssetEx.new('0');
export const SETTINGS_IMAGE_BUTTON_ON = TextureImageAssetEx.new('0');
export const SETTINGS_IMAGE_BUTTON_OFF = TextureImageAssetEx.new('0');
export const SETTINGS_IMAGE_BUTTON_BACK_TO_LOBBY = TextureImageAssetEx.new('0');
export const SETTINGS_IMAGE_BUTTON_LEAVE = TextureImageAssetEx.new('0');

/** -----------------------------------------------------  DEV ----------------------------------------------------- */
export const DEV_BUTTON_STYLE_OPTIONS: ButtonStyleOptions = {
    ...ORANGE_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...ORANGE_BUTTON_STYLE_OPTIONS.buttonStyle,
        minHeight: undefined,
        height: 40,
        marginVertical: 5,
    },
};
export const DEV_SECTION_STYLE: ViewStyle = {
    ...CAREER_PAGE_COMPONENT_VIEW_STYLE_COMMON,
    height: '100%',
    flexDirection: 'column',
    paddingHorizontal: 10,
    margin: 5,
    flex: 1,
};
export const DEV_LOG_TEXT_STYLE: TextStyle = {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Roboto-Mono',
    fontWeight: '400',
};
export const DEV_CLOSE_BUTTON_LABEL = 'Close Development Menu';
export const DEV_CLOSE_BUTTON_STYLE: ButtonStyleOptions = {
    ...DEV_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...DEV_BUTTON_STYLE_OPTIONS.buttonStyle,
        width: 300,
        marginHorizontal: 0,
        zIndex: 10,
        top: '-14%',
        left: '45%',
        position: 'absolute',
    },
};
export const DEV_PLAYER_DATA_SECTION_STYLE: ViewStyle = {
    ...CAREER_PAGE_COMPONENT_VIEW_STYLE_COMMON,
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    paddingHorizontal: 10,
    paddingBottom: 10,
    margin: 5,
    flex: 1,
};
const DEV_PLAYER_DATA_CARD_BUTTON_STYLE: ButtonStyleOptions = {
    ...ConstsUI.BUTTON_STYLE_OPTIONS_DEFAULT,
    labelStyle: {
        ...ConstsUI.BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
        fontSize: 16,
    },
    buttonStyle: {
        ...ConstsUI.BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        width: 100,
        height: 40,
    },
};
export const DEV_PLAYER_DATA_CARD_BUTTON_STYLE_GREEN: ButtonStyleOptions = {
    ...DEV_PLAYER_DATA_CARD_BUTTON_STYLE,
    buttonStateColors: {
        ...DEV_PLAYER_DATA_CARD_BUTTON_STYLE.buttonStateColors,
        color: 'rgb(12, 106, 29)',
    },
};
export const DEV_PLAYER_DATA_CARD_BUTTON_STYLE_RED: ButtonStyleOptions = {
    ...DEV_PLAYER_DATA_CARD_BUTTON_STYLE,
    buttonStateColors: {
        ...DEV_PLAYER_DATA_CARD_BUTTON_STYLE.buttonStateColors,
        color: 'rgb(143, 22, 22)',
    },
};
export const DEV_PLAYER_DATA_BUTTON_STYLE_GREEN: ButtonStyleOptions = {
    ...DEV_BUTTON_STYLE_OPTIONS,
    buttonStateColors: {
        ...DEV_BUTTON_STYLE_OPTIONS.buttonStateColors,
        color: 'rgb(12, 106, 29)',
    },
};
export const DEV_PLAYER_DATA_BUTTON_STYLE_RED: ButtonStyleOptions = {
    ...DEV_BUTTON_STYLE_OPTIONS,
    buttonStateColors: {
        ...DEV_BUTTON_STYLE_OPTIONS.buttonStateColors,
        color: 'rgb(143, 22, 22)',
    },
};
export const DEV_PLAYER_DATA_BUTTON_VIEW_STYLE: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
};
export const DEV_PLAYER_DATA_CARD_STYLE: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    margin: 4,
    padding: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    borderColor: Color.white,
};
export const DEV_PLAYER_DATA_CARD_LIST_STYLE: ViewStyle = {
    height: '100%',
    width: '100%',
    flex: 1,
    flexDirection: 'column',
    margin: 5,
};
export const DEV_PLAYER_DATA_PAGE_SELECTOR_STYLE: ViewStyle = {
    minWidth: '45%',
    maxWidth: '90%',
    alignSelf: 'center',
    flex: -4,
};

export const DEV_PLAYER_DATA_PAGE_SELECTOR_BUTTON_STYLE: ButtonStyleOptions = {
    ...UI_PAGE_SELECTOR_BUTTON_STYLE_OPTIONS,
    buttonStyle: {
        ...UI_PAGE_SELECTOR_BUTTON_STYLE_OPTIONS.buttonStyle,
        flex: 0,
        marginHorizontal: 2,
        paddingHorizontal: 30,
    },
};
