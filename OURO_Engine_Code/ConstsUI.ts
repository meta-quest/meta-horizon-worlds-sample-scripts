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


import * as ui from 'horizon/ui';
import {ImageStyle, ViewStyle} from 'horizon/ui';
import * as UtilsGameplay from 'UtilsGameplay';
import {TextureImageAssetEx} from 'AssetEx';
import { Entity } from 'horizon/core';

export const FONT_STRING = '<font="Kallisto-Bold SDF">';

export const DISPLAY_NAME_DEFAULT_LENGTH: number = 12;

export const DEFAULT_BORDER_RADIUS = 20;

export const PLACEHOLDER_ICON = TextureImageAssetEx.new('0');
export const PLACEHOLDER_IMAGE = TextureImageAssetEx.new('0');
/**Empty Image Asset, square aspect ratio*/
export const PLACEHOLDER_IMAGE_EMPTY = TextureImageAssetEx.new('0');

//** CORE */
export const STYLE_FULL_FILL: ui.ViewStyle = {
    width: '100%',
    height: '100%',
};

export const STYLE_MARGIN: ui.ViewStyle = {
    margin: 10,
};

export const HIDDEN_VIEW_STYLE: ViewStyle = {
    borderColor: '#00000000',
    backgroundColor: '#00000000',
}

//** TEXT */
export const TEXT_STYLE_DEFAULT: ui.TextStyle = {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Kallisto',
    fontWeight: '700',
    //flex:1,
};

export const TEXT_STYLE_HEADER: ui.TextStyle = {
    color: 'white',
    fontSize: 24,
    textAlignVertical: 'center',
};

//** IMAGE */
export const IMAGE_STYLE_DEFAULT: ui.ImageStyle = {
    ...STYLE_FULL_FILL,
    tintOperation: 'multiply',
};

//** BUTTON */
export type ButtonStateColors = {
    color: string,
    hoverColor: string,
    pressColor: string,
    disabledColor: string,
    disabledHoverColor: string,
    disabledPressColor: string,
    selectedColor: string,
    selectedHoverColor: string,
    selectedPressColor: string,
}

export type ImageButtonStateImages = {
    image: TextureImageAssetEx,
    hoverImage?: TextureImageAssetEx,
    pressImage?: TextureImageAssetEx,
    disabledImage?: TextureImageAssetEx,
    selectedImage?: TextureImageAssetEx,
    selectedHoverImage?: TextureImageAssetEx,
    shouldUpdateImageStates?: boolean,
    useButtonStateAsTintColor?: boolean,
}

/**A subset of {@link ButtonStateColors} for button components such as icons or text*/
export type ButtonComponentStateColors = {
    color: string,
    disabledColor: string,
    selectedColor: string,
}

export type ButtonStyleOptions = {
    labelStyle?: ui.TextStyle,
    buttonStyle: ui.ViewStyle,
    buttonStateColors: ButtonStateColors,
    buttonStateImages?: ImageButtonStateImages,
    imageStyle?: ImageStyle,
    iconData?: ButtonIconStyle,
}

// FYI just doing single icon first, but we may want to support multiple in the future.
export type ButtonIconStyle = {
    icon: TextureImageAssetEx,
    style: ui.ImageStyle,
    iconContainerStyle: ui.ViewStyle,
    stateColors: ButtonComponentStateColors,
}

export const BUTTON_STYLE_OPTIONS_DEFAULT: ButtonStyleOptions = {
    labelStyle: {
        ...TEXT_STYLE_DEFAULT,
        textAlign: 'center',
        textAlignVertical: 'center',
        height: '100%',
    },
    buttonStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 35,
        padding: 5,
        borderRadius: DEFAULT_BORDER_RADIUS,
        margin: 2.5,
        overflow: 'hidden',
    },
    buttonStateColors: {
        color: 'rgba(174, 174, 174, 1)',
        hoverColor: 'rgba(217, 217, 217, 1)',
        pressColor: 'rgba(174, 174, 174, 1)',
        disabledColor: 'rgba(128, 128, 128, 1)',
        disabledHoverColor: 'rgba(128, 128, 128, 1)',
        disabledPressColor: 'rgba(128, 128, 128, 1)',
        selectedColor: 'rgba(147, 243, 139, 1)',
        selectedHoverColor: 'rgba(147, 243, 139, 1)',
        selectedPressColor: UtilsGameplay.desaturateColor(UtilsGameplay.darkenColor('rgba(147, 243, 139, 1)', 40), 50),
    },
};

export const BUTTON_ICON_STYLE_DEFAULT: ButtonIconStyle = {
    icon: PLACEHOLDER_ICON,
    style: {
        height: '100%',
        width: '100%',
        alignSelf: 'center',
        alignItems: 'center',
        tintOperation: 'multiply',
    },
    iconContainerStyle: {

    },
    stateColors: {
        color: BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors.color,
        disabledColor: BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors.disabledColor,
        selectedColor: BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors.selectedColor,
    },
};

export const BUTTON_STYLE_OPTIONS_DEFAULT_ICON: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    iconData: {
        icon: PLACEHOLDER_ICON,
        style: {
            height: 50,
            width: 50,
        },
        iconContainerStyle: {

        },
        stateColors: { // TODO: Set proper defaults
            color: 'white',
            disabledColor: 'white',
            selectedColor: 'black',
        },
    },
};

export const BUTTON_STYLE_OPTIONS_DEFAULT_IMAGE: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    buttonStateColors: {
        color: 'white',
        hoverColor: 'white',
        pressColor: 'white',
        disabledColor: 'white',
        disabledHoverColor: 'white',
        disabledPressColor: 'white',
        selectedColor: 'white',
        selectedHoverColor: 'white',
        selectedPressColor: 'white',
    },
    buttonStateImages: {
        image: TextureImageAssetEx.new('0'),
        hoverImage: TextureImageAssetEx.new('0'),
        pressImage: TextureImageAssetEx.new('0'),
        shouldUpdateImageStates: true,
    },
    imageStyle: {
        ...IMAGE_STYLE_DEFAULT,
        borderRadius: DEFAULT_BORDER_RADIUS,
    },
};

//** PANEL */
export type PanelStyleOptions = {
    style: ui.ViewStyle;
    contentStyle: ui.ViewStyle,
    headerStyle?: ui.TextStyle,
    bodyStyle: ui.ViewStyle,
    bgImage?: TextureImageAssetEx;
    bgImageStyle?: ui.ImageStyle;
}

export const PANEL_HEADER_HEIGHT = 40;
export const PANEL_PADDING_HORIZONTAL = 12;
export const PANEL_PADDING_VERTICAL = 8;

export const PANEL_STYLE_OPTIONS_DEFAULT: PanelStyleOptions = {
    style: {
        ...STYLE_FULL_FILL,
        backgroundColor: 'gray',
        borderRadius: DEFAULT_BORDER_RADIUS,
        flexDirection: 'column-reverse',
    },
    contentStyle: {
        ...STYLE_FULL_FILL,
        position: 'absolute',
        //top:'10%',
        //left:'15%',
        //width:'70%',
        //height:'55%',
        //backgroundColor:'white',
    },
    headerStyle: {
        ...TEXT_STYLE_HEADER,
        height: PANEL_HEADER_HEIGHT,
        borderTopLeftRadius: DEFAULT_BORDER_RADIUS,
        borderTopRightRadius: DEFAULT_BORDER_RADIUS,
        backgroundColor: 'dimgray',
        paddingHorizontal: PANEL_PADDING_HORIZONTAL,
    },
    bodyStyle: {
        ...STYLE_FULL_FILL,
        flex: 1,
        paddingHorizontal: PANEL_PADDING_HORIZONTAL,
        paddingVertical: PANEL_PADDING_VERTICAL,
    },
};

export const PANEL_STYLE_OPTIONS_SELECTED: PanelStyleOptions = {
    ...PANEL_STYLE_OPTIONS_DEFAULT,
    style: {
        ...STYLE_FULL_FILL,
        backgroundColor: 'darkgray',
    },
};

export type ListViewStlyeOptions = {
    style: ui.ViewStyle;
}

export const LIST_VIEW_STYLE_OPTIONS_HORIZONTAL: ListViewStlyeOptions = {
    style: {
        flexDirection: 'row',
    },
};

export const LISTVIEW_STYLE_OPTIONS_VERTICAL: ListViewStlyeOptions = {
    style: {
        flexDirection: 'column',
    },
};

//** PAGINATED VIEW */
export enum PaginatedViewChangeScheme {
    INSTANT,
    SCROLL_HORIZONTAL,
    SCROLL_VERTICAL,
}

export type PaginateViewStyleOptions = ListViewStlyeOptions & {
    pageWidth: number,
    pageHeight: number,
    changeScheme: PaginatedViewChangeScheme,
    changeSpeed: number,
}

export const PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT: PaginateViewStyleOptions = {
    style: {
        ...STYLE_FULL_FILL,
        flex: 1,
        overflow: 'hidden',
    },
    pageWidth: 800,
    pageHeight: 600,
    changeScheme: PaginatedViewChangeScheme.INSTANT,
    changeSpeed: 0.3,
};

export const PAGINATED_VIEW_STYLE_OPTIONS_HORIZONTAL: PaginateViewStyleOptions = {
    ...PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT,
    changeScheme: PaginatedViewChangeScheme.SCROLL_HORIZONTAL,
};

export const PAGINATED_VIEW_STYLE_OPTIONS_VERTICAL: PaginateViewStyleOptions = {
    ...PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT,
    changeScheme: PaginatedViewChangeScheme.SCROLL_VERTICAL,
};

//** TAB VIEW */
export type TabViewStyleOptions = {
    style: ui.ViewStyle,
    tabButtonStyleOptions: ButtonStyleOptions,
    tabsContainerStyle: ui.ViewStyle,
    contentContainerStyle: PaginateViewStyleOptions,
}

export const TAB_VIEW_STYLE_OPTIONS_BASE: TabViewStyleOptions = {
    style: {
        ...STYLE_FULL_FILL,
        flex: 1,
    },
    tabButtonStyleOptions: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT,
        buttonStateColors: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
            selectedColor: 'white',
        },
        labelStyle: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT.labelStyle,
            color: 'black',
        },
    },
    tabsContainerStyle: {},
    contentContainerStyle: {
        ...PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT,
        style: {
            ...PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT.style,
            backgroundColor: 'white',
        },
    },
};

export const TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE: TabViewStyleOptions = {
    ...TAB_VIEW_STYLE_OPTIONS_BASE,
    tabButtonStyleOptions: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.tabButtonStyleOptions,
        buttonStyle: {
            ...TAB_VIEW_STYLE_OPTIONS_BASE.tabButtonStyleOptions.buttonStyle,
            flex: 1,
        },
    },
    tabsContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.tabsContainerStyle,
        height: PANEL_HEADER_HEIGHT,
        flexDirection: 'row',
    },
    contentContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.contentContainerStyle,
        style: {
            ...TAB_VIEW_STYLE_OPTIONS_BASE.contentContainerStyle.style,
            flexDirection: 'row',
        },
        changeScheme: PaginatedViewChangeScheme.SCROLL_HORIZONTAL,
    },
};

export const TAB_VIEW_STYLE_OPTIONS_TABS_TOP: TabViewStyleOptions = {
    ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE,
    style: {
        ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.style,
        flexDirection: 'column',
    },
    tabButtonStyleOptions: {
        ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.tabButtonStyleOptions,
        buttonStyle: {
            ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.tabButtonStyleOptions.buttonStyle,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            marginLeft: 0,
        },
    },
    contentContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.contentContainerStyle,
        style: {
            ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.contentContainerStyle.style,
            borderBottomLeftRadius: DEFAULT_BORDER_RADIUS,
            borderBottomRightRadius: DEFAULT_BORDER_RADIUS,
        },
    },
};

export const TAB_VIEW_STYLE_OPTIONS_TABS_BOTTOM: TabViewStyleOptions = {
    ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE,
    style: {
        ...TAB_VIEW_STYLE_OPTIONS_HORIZONTAL_BASE.style,
        flexDirection: 'column-reverse',
    },
};

export const TAB_VIEW_STYLE_OPTIONS_VERTICAL_BASE: TabViewStyleOptions = {
    ...TAB_VIEW_STYLE_OPTIONS_BASE,
    tabsContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.tabsContainerStyle,
        width: 100,
        flexDirection: 'column',
    },
    contentContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.contentContainerStyle,
        style: {
            ...TAB_VIEW_STYLE_OPTIONS_BASE.contentContainerStyle.style,
            flexDirection: 'column',
        },
        changeScheme: PaginatedViewChangeScheme.SCROLL_VERTICAL,
    },
};

export const TAB_VIEW_STYLE_OPTIONS_TABS_LEFT: TabViewStyleOptions = {
    ...TAB_VIEW_STYLE_OPTIONS_VERTICAL_BASE,
    style: {
        ...TAB_VIEW_STYLE_OPTIONS_VERTICAL_BASE.style,
        flexDirection: 'row',
    },
};

export type SelectorStyleOptions = {
    labelStyle: ui.TextStyle,
    valueStyle: ui.TextStyle,
    previousButtonStyleOptions: ButtonStyleOptions,
    nextButtonStyleOptions: ButtonStyleOptions,
    style: ui.ViewStyle,
}

export const SELECTOR_STYLE_OPTIONS_DEFAULT: SelectorStyleOptions = {
    labelStyle: {
        ...TEXT_STYLE_DEFAULT,
        flex: 7,
        textAlignVertical: 'center',
    },
    valueStyle: {
        ...TEXT_STYLE_DEFAULT,
        backgroundColor: '#888888',
        borderRadius: DEFAULT_BORDER_RADIUS,
        flex: 5,
        textAlign: 'center',
        textAlignVertical: 'center',
        margin: 2.5,
    },
    previousButtonStyleOptions: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT,
        buttonStyle: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
            flex: 1,
        },
    },
    nextButtonStyleOptions: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT,
        buttonStyle: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
            flex: 1,
        },
    },
    style: {
        flexDirection: 'row',
    },
};

export type ValueSelectorStyleOptions = SelectorStyleOptions & {
    selectButtonStyleOptions: ButtonStyleOptions,
}

export const VALUE_SELECTOR_STYLE_OPTIONS_DEFAULT = {
    ...SELECTOR_STYLE_OPTIONS_DEFAULT,
    selectButtonStyleOptions: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT,
        buttonStyle: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
            flex: 3,
        },
    },
};

export const NUMBER_SELECTOR_STYLE_OPTIONS_DEFAULT = {
    ...SELECTOR_STYLE_OPTIONS_DEFAULT,
    valueStyle: {
        ...SELECTOR_STYLE_OPTIONS_DEFAULT.valueStyle,
        flex: 1,
    },
};

export type BarStyleOptions = {
    style: ui.ViewStyle,
    backgroundStyle: ui.ViewStyle,
    fillStyle: ui.ViewStyle,
    labelStyle: ui.TextStyle,
}

export const BAR_STYLE_OPTIONS_DEFAULT: BarStyleOptions = {
    style: {
        height: BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle.height,
        borderWidth: 2,
        borderColor: 'darkgrey',
    },
    backgroundStyle: {
        ...STYLE_FULL_FILL,
        backgroundColor: 'black',
        position: 'absolute',
    },
    fillStyle: {
        ...STYLE_FULL_FILL,
        backgroundColor: 'green',
        position: 'absolute',
    },
    labelStyle: {
        ...TEXT_STYLE_DEFAULT,
        ...STYLE_FULL_FILL,
        position: 'absolute',
        textAlign: 'center',
        textAlignVertical: 'center',
    },
};

/** NUMBER TALLY */
export type NumberTallyStyleOptions = {
    labelTextStyle: ui.TextStyle,
    descriptionTextStyle: ui.TextStyle,
    labelGroupStyle: ListViewStlyeOptions,

    valueTextStyle: ui.TextStyle,

    containerStyle: ui.ViewStyle,

    valueToStringOverride?: (value: number) => string,

    tallyIncrementTime: number,
    tallyTotalTime: number,
    tallySFX?: Entity,
}

export const NUMBER_TALLY_STYLE_OPTIONS_DEFAULT: NumberTallyStyleOptions = {
    labelTextStyle: {
        ...TEXT_STYLE_HEADER,
        fontSize: 18,
        textAlign: 'left',
    },
    descriptionTextStyle: {
        ...TEXT_STYLE_DEFAULT,
        fontSize: 10,
        textAlign: 'left',
    },
    labelGroupStyle: {
        ...LISTVIEW_STYLE_OPTIONS_VERTICAL,
        style: {
            ...LISTVIEW_STYLE_OPTIONS_VERTICAL.style,
            flex: 3,
            paddingLeft: 10,
            justifyContent: 'center',
        },
    },

    valueTextStyle: {
        ...TEXT_STYLE_DEFAULT,
        fontSize: 18,
        textAlign: 'right',
        textAlignVertical: 'center',
        paddingRight: 10,
        flex: 2,
    },

    containerStyle: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        //marginTop: 20,
        //padding: 20,
        flex: 1,
    },

    tallyIncrementTime: 0.1,
    tallyTotalTime: 1.0,
};

// CLASS SELECTION //
export const CLASS_SELECTION_ABILITY_BORDER_RADIUS = 2;
export const CLASS_SELECTION_ABILITY_DURATION_ICON = TextureImageAssetEx.new('0');

export const CLASS_SELECTION_BACK_BUTTON_DEFAULT = TextureImageAssetEx.new('0');
export const CLASS_SELECTION_BACK_BUTTON_HOVER = TextureImageAssetEx.new('0');

export const CLASS_SELECTION_ABILITY_CONTAINER_STYLE: ui.ViewStyle = {
    width: 502 / 2,
    height: 680 / 2,
    marginHorizontal: 20,
};

export const CLASS_SELECTION_BACK_BUTTON_STYLE: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT_IMAGE,
    iconData: undefined,
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT_ICON.buttonStyle,
        position: 'absolute',
        left: -70,
        width: 50,
        height: 50,
    },
    buttonStateImages: {
        image: CLASS_SELECTION_BACK_BUTTON_DEFAULT,
        pressImage: CLASS_SELECTION_BACK_BUTTON_HOVER,
        hoverImage: CLASS_SELECTION_BACK_BUTTON_HOVER,
        selectedHoverImage: CLASS_SELECTION_BACK_BUTTON_HOVER, // TODO: Figure out why these hovered / selected states are not working
        shouldUpdateImageStates: true,
    },
};


export const CLASS_SELECTION_TAB_VIEW_STYLE: TabViewStyleOptions = { // TODO: DIO LOOK

    tabButtonStyleOptions: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT_ICON,
        labelStyle: undefined,
        buttonStyle: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT_ICON.buttonStyle,
            margin: 0,
            flex: 1,
            borderRadius: 0,
            borderWidth: 1,
            width: 170 / 2,
            height: 160 / 2,
        },
        buttonStateColors: {
            ...BUTTON_STYLE_OPTIONS_DEFAULT_ICON.buttonStateColors,
            hoverColor: 'black',
        },
        iconData: {
            ...BUTTON_ICON_STYLE_DEFAULT,
            stateColors: {
                ...BUTTON_ICON_STYLE_DEFAULT.stateColors,
                color: 'white',
                selectedColor: 'white',
                disabledColor: 'grey',
            },
        },
    },
    tabsContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.tabsContainerStyle,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0,
        overflow: 'hidden',
    },
    contentContainerStyle: {
        ...TAB_VIEW_STYLE_OPTIONS_BASE.contentContainerStyle,
        style: {
            flexDirection: 'column',
            paddingVertical: 6,
            paddingHorizontal: 32 / 2,
            backgroundColor: 'rgba(72, 72, 72, 1)', // TODO: dont set manually
            borderRadius: 2,
            borderWidth: 1,
            height: 114 / 2,
        },
        changeScheme: PaginatedViewChangeScheme.INSTANT,
    },

    style: { // Large container style
        height: 274 / 2,
        width: 504 / 2,
        flexDirection: 'column',
        alignSelf: 'center',
        flex: 0,
        alignContent: 'center',
        alignItems: 'center',
        marginBottom: 46 / 2,
    },
};
