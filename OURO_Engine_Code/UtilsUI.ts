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

import { GlobalAnimationManager } from 'Animation';
import { TextureImageAssetEx } from 'AssetEx';
import { DEBUG_DISABLE_SERVER_UI_BINDING_OPTIMIZATIONS } from 'ConstsDebugging';
import * as ConstsUI from 'ConstsUI';
import { BUTTON_STYLE_OPTIONS_DEFAULT, HIDDEN_VIEW_STYLE, ImageButtonStateImages, IMAGE_STYLE_DEFAULT, STYLE_FULL_FILL, TabViewStyleOptions } from 'ConstsUI';
import { Color, Player } from 'horizon/core';
import * as ui from 'horizon/ui';
import { ImageSource, ScrollView, ViewStyle } from 'horizon/ui';

export function getDebugBorderStyle(color: string = 'red', width: number = 3) {
    return {borderColor: color, borderWidth: width};
}

//** CORE */
export interface UIWrapper {
    render: () => ui.UINode;
}

export function render(ui: UIWrapper[]) {
    const nodes: ui.UINode[] = [];
    ui.forEach((value) => nodes.push(value.render()));

    return nodes;
}

export type UIBaseBindingsOptions = {
    visibility?: boolean
    defaultVisibility?: boolean,
}

export abstract class UIBaseComponent implements UIWrapper {
    protected visibilityBinding?: UIBinding<boolean>;

    protected constructor(bindingsOptions?: UIBaseBindingsOptions) {
        if (bindingsOptions?.visibility) {
            this.visibilityBinding = new UIBinding<boolean>(bindingsOptions.defaultVisibility ?? true);
        }
    }

    setVisible(visible: boolean, player?: Player) {
        if (!this.visibilityBinding) {
            throw new Error('Missing visibility binding - did you forget to set the binding options?');
        }
        this.visibilityBinding.set(visible, player);
    }

    getVisible(player?: Player) {
        if (this.visibilityBinding) {
            return this.visibilityBinding.get(player);
        }
        return true;
    }

    abstract renderComponent(): ui.UINode;

    renderHiddenComponent(): ui.UINode | undefined {
        return undefined;
    }; // used to display something else if this element is not visible

    render(): ui.UINode {
        if (this.visibilityBinding) {
            return ui.UINode.if(
                this.visibilityBinding.binding,
                this.renderComponent(),
                this.renderHiddenComponent(),
            );
        }
        return this.renderComponent();
    }
}

const allPerPlayerValues: PerPlayerValues<any>[] = [];

export function deletePerPlayerValueForPlayer(player: Player) {
    allPerPlayerValues.forEach((perPlayerValueObject) => perPlayerValueObject.values.delete(player));
}

export class PerPlayerValues<T> {
    readonly values = new Map<Player, T>();

    constructor(public globalValue: T, private defaultValueGenerator: (() => T) | undefined = undefined) {
        allPerPlayerValues.push(this);
    }

    set(value: T, player?: Player) {
        if (player) {
            this.values.set(player, value);
        } else {
            this.globalValue = value;
            this.values.clear();
        }
    }

    get(player?: Player): T {
        if (!player) {
            return this.defaultValueGenerator?.() ?? this.globalValue;
        }

        if (this.values.has(player)) {
            return this.values.get(player)!;
        }

        this.set(this.defaultValueGenerator?.() ?? this.globalValue, player);
        return this.globalValue;
    }
}

export class UIBinding<T> {
    private static dirtySet: Set<UIBinding<any>> = new Set();
    static dirty: UIBinding<any>[] = [];

    binding: ui.Binding<T>;
    // stack: string // Uncomment this and the constructor if you need to figure out where the binding is

    renderedValues: PerPlayerValues<T | undefined>;
    perPlayerValue: PerPlayerValues<T>;

    constructor(defaultValue: T) {
        this.binding = new ui.Binding<T>(defaultValue);
        // this.stack = new Error().stack!

        this.renderedValues = new PerPlayerValues(undefined);
        this.perPlayerValue = new PerPlayerValues(defaultValue);
    }

    public set(value: T, player?: Player, debugString?: string) {
        if (debugString) {
            console.log(`UI setting binding value to "${value}" which is typeof ${typeof value} for ${player ? player.name.get() : 'all players'} with text "${debugString}"`);
        }

        if (DEBUG_DISABLE_SERVER_UI_BINDING_OPTIMIZATIONS) {
            this.binding.set(value, player ? [player] : undefined);
            return;
        }

        if (!UIBinding.dirtySet.has(this)) {
            UIBinding.dirtySet.add(this);
            UIBinding.dirty.push(this);
        }
        this.perPlayerValue.set(value, player);
    }

    public update() {
        if (this.renderedValues.globalValue != this.perPlayerValue.globalValue) {
            this.renderedValues.globalValue = this.perPlayerValue.globalValue;
            this.binding.set(this.perPlayerValue.globalValue);
        }

        this.perPlayerValue.values.forEach((value, player) => {
            if (this.renderedValues.get(player) == value) return;

            this.renderedValues.set(value, player);
            this.binding.set(value, [player]);
        });

        UIBinding.dirtySet.delete(this);
    }

    public get(player?: Player) {
        return this.perPlayerValue.get(player);
    }
}

//** VIEW */
export class UIView extends UIBaseComponent {
    constructor(protected children: UIWrapper[] = [], readonly style: ui.ViewStyle, bindingOptions?: UIBaseBindingsOptions) {
        super(bindingOptions);
    }

    override renderComponent() {
        return ui.View({
            children: render(this.children),
            style: this.style,
        });
    }
}

//** TEXT */
export type UITextBindingOptions = UIBaseBindingsOptions & {
    text?: boolean,
    textColor?: boolean,
    fontSize?: boolean
}

export class UIText extends UIBaseComponent {
    protected textBinding?: UIBinding<string>;
    protected textColorBinding?: UIBinding<string>;
    protected fontSizeBinding?: UIBinding<number>;

    textStyle: ui.TextStyle;

    constructor(protected displayedText: string, style: ui.TextStyle = ConstsUI.TEXT_STYLE_DEFAULT, bindingOptions?: UITextBindingOptions) {
        super(bindingOptions);
        if (bindingOptions?.text) {
            this.textBinding = new UIBinding<string>(displayedText);
        }

        this.textStyle = style;
        if (bindingOptions?.textColor) {
            if (style.color instanceof Color) {
                this.textColorBinding = new UIBinding(style.color.toHex() as string);
            } else if (typeof style.color === 'string') {
                this.textColorBinding = new UIBinding(style.color);
            } else {
                this.textColorBinding = new UIBinding('white');
            }

            this.textStyle = {
                ...this.textStyle,
                color: this.textColorBinding.binding,
            };
        }

        if (bindingOptions?.fontSize) {
            if (typeof style.fontSize === 'number') {
                this.fontSizeBinding = new UIBinding(style.fontSize);
            } else {
                this.fontSizeBinding = new UIBinding(12);
            }

            this.textStyle = {
                ...this.textStyle,
                fontSize: this.fontSizeBinding.binding,
            };
        }
    }

    clearText(player?: Player, modifyData: boolean = false) {
        this.setText('', player);
    }

    restoreText(player?: Player) {
        if (!this.textBinding) {
            throw new Error('Missing text binding - did you forget to set the binding options?');
        }
        this.setText(this.textBinding.perPlayerValue.get(player), player);
    }

    setText(text: string, player?: Player) {
        if (!this.textBinding) {
            throw new Error('Missing text binding - did you forget to set the binding options?');
        }
        this.textBinding.set(text, player, undefined);
    }

    setTextColor(color: string | Color, player?: Player) {
        if (!this.textColorBinding) {
            throw new Error('Missing text color binding - did you forget to set the binding options?');
        }
        if (color instanceof Color) {
            this.textColorBinding.set(color.toHex(), player);
            return;
        }
        this.textColorBinding.set(color, player);
    }

    setFontSize(size: number, player?: Player) {
        if (!this.fontSizeBinding) {
            throw new Error('Missing font size binding - did you forget to set the binding options?');
        }
        this.fontSizeBinding.set(size, player);
    }

    getText(player?: Player) {
        if (this.textBinding) {
            return this.textBinding.get(player);
        }
        return this.displayedText;
    }

    public getColor(player?: Player) {
        return this.textColorBinding?.get(player);
    }

    override renderComponent() {
        return ui.Text({
            text: this.textBinding ? this.textBinding.binding : this.displayedText,
            style: this.textStyle,
        });
    }
}

//** IMAGE */
export type UIImageBindingOptions = UIBaseBindingsOptions & {
    imageSource?: boolean,
    tint?: boolean,
}

export class UIImage extends UIBaseComponent {
    protected tintBinding?: UIBinding<string>;
    protected imageSourceBinding?: UIBinding<ui.ImageSource>;

    imageStyle: ui.ImageStyle;

    constructor(protected TextureImageAssetEx: TextureImageAssetEx, style: ui.ImageStyle = ConstsUI.IMAGE_STYLE_DEFAULT, bindingOptions?: UIImageBindingOptions) {
        super(bindingOptions);

        if (bindingOptions?.imageSource) {
            this.imageSourceBinding = new UIBinding<ui.ImageSource>(TextureImageAssetEx.imageSource);
        }

        if (bindingOptions?.tint) {
            this.tintBinding = new UIBinding<string>('white');
            this.imageStyle = {
                ...style,
                tintColor: this.tintBinding.binding,
            };
        } else {
            this.imageStyle = style;
        }
    }

    setImage(TextureImageAssetEx: TextureImageAssetEx, player?: Player) {
        this.setImageSource(TextureImageAssetEx.imageSource, player);
    }

    setImageSource(imageSource: ui.ImageSource, player?: Player) {
        if (!this.imageSourceBinding) {
            throw new Error('Missing image source binding - did you forget to set the binding options?');
        }
        this.imageSourceBinding.set(imageSource, player);
    }

    getImage(player?: Player): ImageSource {
        if (this.imageSourceBinding) {
            return this.imageSourceBinding.get(player);
        }
        return this.TextureImageAssetEx.imageSource;
    }

    setTint(color: Color, player?: Player) {
        this.setTintString(color.toHex(), player);
    }

    setTintString(color: string, player?: Player) {
        if (!this.tintBinding) {
            throw new Error('Missing tint binding - did you forget to set the binding options?');
        }
        this.tintBinding.set(color, player);
    }

    getTint(player?: Player) {
        if (this.tintBinding) {
            return this.tintBinding.get(player);
        }
        return 'white';
    }

    override renderComponent() {
        if (this.imageSourceBinding) {
            return ui.Image({
                source: this.imageSourceBinding.binding,
                style: this.imageStyle,
            });
        }

        return ui.Image({
            source: this.TextureImageAssetEx.imageSource,
            style: this.imageStyle,
        });
    }
}

//** PRESSABLE UI */
export interface UIInteractionCallbacks<T extends UIInteractable<T>> {
    onPress: (player: Player, interactable: T) => void,
    onRelease?: (player: Player, interactable: T) => void,
    onEnter?: (player: Player, interactable: T) => void,
    onExit?: (player: Player, interactable: T) => void,
    onClick?: (player: Player, interactable: T) => void,
}

export abstract class UIInteractable<T extends UIInteractable<T>> extends UIBaseComponent {
    protected enabled = new PerPlayerValues<boolean>(true);

    constructor(
        public children: UIWrapper[] = [],
        readonly style: ui.ViewStyle = {},
        readonly callbacks: Partial<UIInteractionCallbacks<T>> = {},
        bindingOptions?: UIBaseBindingsOptions,
    ) {
        super(bindingOptions);
    }

    renderComponent(): ui.UINode {
        return ui.Pressable({
            children: render(this.children),
            style: this.style,
            onPress: (player) => this.doCallbackIfValid(this.callbacks.onPress, player),
            onRelease: (player) => this.doCallbackIfValid(this.callbacks.onRelease, player),
            onEnter: (player) => this.doCallbackIfValid(this.callbacks.onEnter, player),
            onExit: (player) => this.doCallbackIfValid(this.callbacks.onExit, player),
            onClick: (player) => this.doCallbackIfValid(this.callbacks.onClick, player),
        });
    }

    setEnabled(enabled: boolean, player?: Player) {
        this.enabled.set(enabled, player);
    }

    protected doCallbackIfValid(
        callback: ((player: Player, interactable: T) => void) | undefined = undefined,
        player: Player,
    ) {
        if (!callback || !this.enabled.get(player)) return;
        // "this as unknown as T" is gross... T in UIInteractionCallbacks should always extend the shape of UIInteractable<T>
        callback(player, this as unknown as T); // TODO: make this SAFE
    }
}

export class UIPressable extends UIInteractable<UIPressable> {
}

export enum UIButtonState {
    DEFAULT = 0,
    HOVER,
    DOWN,
    SELECTED,
}

export type UIButtonBindingOptions = UIBaseBindingsOptions & {
    labelTextBindingOptions?: UITextBindingOptions,
    iconImageBindingOptions?: UIImageBindingOptions,
    updateColorAndImageBasedOnButtonState?: boolean,
}

export class UIButton extends UIInteractable<UIButton> {
    protected colorBinding: UIBinding<string>;

    styleOptions: PerPlayerValues<ConstsUI.ButtonStyleOptions>;
    style: ui.ViewStyle;

    protected isSelected = new PerPlayerValues<boolean>(false);
    protected state = new PerPlayerValues<UIButtonState>(UIButtonState.DEFAULT);

    labelText?: UIText;
    iconImage?: UIImage;
    buttonImage?: UIImage;

    id: number = 0; // meta data used to identify buttons in complex ui

    constructor(
        readonly callbacks: Partial<UIInteractionCallbacks<UIButton>> = {},
        label?: string,
        readonly buttonStyleOptions: ConstsUI.ButtonStyleOptions = ConstsUI.BUTTON_STYLE_OPTIONS_DEFAULT,
        readonly bindingOptions?: UIButtonBindingOptions,
        useDefaultBackgroundColorBindings: boolean = true,
    ) {
        super([], {}, {}, bindingOptions);

        const styleOptions = this.buttonStyleOptions ?? BUTTON_STYLE_OPTIONS_DEFAULT;

        this.styleOptions = new PerPlayerValues<ConstsUI.ButtonStyleOptions>(styleOptions);
        this.style = styleOptions.buttonStyle;

        this.colorBinding = new UIBinding<string>(styleOptions.buttonStateColors.color);

        if (useDefaultBackgroundColorBindings) {
            this.style = {
                ...this.style,
                backgroundColor: this.colorBinding.binding,
                borderColor: this.colorBinding.binding,
            };
        }

        if (styleOptions.buttonStateImages) {
            this.buttonImage = new UIImage(styleOptions.buttonStateImages.image, {
                ...ConstsUI.IMAGE_STYLE_DEFAULT,
                ...styleOptions.imageStyle,
            }, {
                imageSource: true,
                tint: true,
            });
            this.children.push(this.buttonImage);
            if (this.labelText) {
                // Forking path: If a button has a label and is image button, compose and exit. SHOULD really be a separate button type..
                return;
            }
        }


        if (styleOptions.iconData) {
            // FYI white default is set, but check if we want keep it like this. should be default
            this.iconImage = new UIImage(styleOptions.iconData.icon, {
                ...styleOptions.iconData.style,
            }, {
                ...bindingOptions?.iconImageBindingOptions,
                tint: true,
            });

            const iconContainer = new UIView([this.iconImage], {
                // This makes sure the icon is always in the center. We may need to customize this data later if we want OR make an icon button class.
                position: 'absolute',
                width: '100%',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'center',
                ...styleOptions.iconData.iconContainerStyle,
            });
            this.children.push(iconContainer);
        }

        if (styleOptions.labelStyle) {
            this.labelText = new UIText(label ?? '', styleOptions.labelStyle, bindingOptions?.labelTextBindingOptions);
            if (this.buttonImage) {
                this.children.push(new UIView([this.labelText], {
                    ...STYLE_FULL_FILL,
                    position: 'absolute',
                }));
            } else {
                this.children.push(this.labelText);
            }
        }
    }

    public setIsSelected(isSelected: boolean, player?: Player) {
        this.isSelected.set(isSelected, player);
        this.updateState(player);
    }

    public getIsSelected(player?: Player) {
        return this.isSelected.get(player);
    }

    public setEnabled(enabled: boolean, player?: Player) {
        super.setEnabled(enabled, player);
        this.updateState(player);
    }

    public setImage(image: TextureImageAssetEx | undefined, player?: Player) {
        if (!image) return;
        this.buttonImage?.setImage(image, player);
    }

    public setIconImage(image: TextureImageAssetEx, player?: Player) {
        this.iconImage?.setImage(image, player);
    }

    public getIconImage(player?: Player): ImageSource | undefined {
        return this.iconImage?.getImage(player);
    }

    protected setState(state: UIButtonState, player: Player) {
        this.state.set(state, player);
        this.updateState(player);
    }

    private updateState(player?: Player) {
        const styleOptions = this.styleOptions.get(player);
        this.updateButtonColor(player);
        this.updateIconColor(player);

        if (!styleOptions.buttonStateImages?.shouldUpdateImageStates) return;
        this.updateImage(player);
    }

    protected getImageFromState(player?: Player) {
        const styleOptions = this.styleOptions.get(player);
        if (!styleOptions.buttonStateImages) return;

        if (!this.enabled.get(player)) {
            return styleOptions.buttonStateImages.disabledImage;
        }

        if(this.bindingOptions?.updateColorAndImageBasedOnButtonState) {
            switch (this.state.get(player)) {
                case UIButtonState.HOVER:
                    return this.isSelected.get(player) ? styleOptions.buttonStateImages.selectedHoverImage : styleOptions.buttonStateImages.hoverImage;
                case UIButtonState.DOWN:
                    return styleOptions.buttonStateImages.pressImage;
                case UIButtonState.DEFAULT: // fallthrough
                default:
                    // no-op
            }
        }

        return this.isSelected.get(player) ? styleOptions.buttonStateImages.selectedImage : styleOptions.buttonStateImages.image;
    }

    protected updateImage(player?: Player) {
        const image = this.getImageFromState(player);
        if (!image) return;
        this.setImage(image, player);
    }

    protected getButtonColorFromState(player?: Player) {
        const buttonStateColors = this.styleOptions.get(player).buttonStateColors;

        if (!this.enabled.get(player)) {
            return buttonStateColors.disabledColor;
        }

        const isSelected = this.isSelected.get(player);
        if(this.bindingOptions?.updateColorAndImageBasedOnButtonState) {
            switch (this.state.get(player)) {
                case UIButtonState.HOVER:
                    return isSelected ? buttonStateColors.selectedHoverColor : buttonStateColors.hoverColor;
                case UIButtonState.DOWN:
                    return isSelected ? buttonStateColors.selectedPressColor : buttonStateColors.selectedColor;
                case UIButtonState.DEFAULT: // fallthrough
                default:
                    // no-op
            }
        }

        return isSelected ? buttonStateColors.selectedColor : buttonStateColors.color;
    }

    protected updateButtonColor(player?: Player) {
        const color = this.getButtonColorFromState(player);
        this.colorBinding.set(color, player);

        if (!this.styleOptions.get(player).buttonStateImages?.useButtonStateAsTintColor) return;
        this.buttonImage?.setTintString(color, player);
    }

    protected updateIconColor(player?: Player) {
        const styleOptions = this.styleOptions.get(player);
        if (styleOptions.iconData == undefined) return;

        if (this.enabled.get(player)) {
            const isSelected = this.isSelected.get(player);

            switch (this.state.get(player)) {
                case UIButtonState.DEFAULT:
                    this.iconImage?.setTintString(isSelected ? styleOptions.iconData.stateColors.selectedColor : styleOptions.iconData.stateColors.color, player);
                    break;

                case UIButtonState.DOWN:
                    this.iconImage?.setTintString(isSelected ? styleOptions.iconData.stateColors.selectedColor : styleOptions.iconData.stateColors.color, player);
                    break;
            }
        } else {
            this.iconImage?.setTintString(styleOptions.iconData.stateColors.disabledColor, player);
        }
    }

    override renderComponent() {
        return ui.Pressable({
            children: render(this.children),
            style: this.style,
            onEnter: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onEnter, player);
                this.setState(UIButtonState.HOVER, player);
            },
            onExit: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onExit, player);
                this.setState(UIButtonState.DEFAULT, player);
            },
            onPress: (player: Player) => {
                if (this.callbacks.onPress) {
                    this.doCallbackIfValid(this.callbacks.onPress, player);
                    this.setState(UIButtonState.DOWN, player);
                }
            },
            onClick: (player: Player) => {
                if (this.callbacks.onClick) { // have to use on click if button is inside a scroll view
                    this.doCallbackIfValid(this.callbacks.onClick, player);
                    this.setState(UIButtonState.DOWN, player);
                }
            },
            onRelease: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onRelease, player);
                this.setState(UIButtonState.HOVER, player);
            },
        });
    }
}

export type UIImageButtonBindingOptions = UIBaseBindingsOptions & {
    updateImageBasedOnButtonState?: boolean,
}

export class UIImageButton extends UIInteractable<UIImageButton> {
    image: UIImage;

    protected isSelected = new PerPlayerValues<boolean>(false);
    protected state = new PerPlayerValues<UIButtonState>(UIButtonState.DEFAULT);

    constructor(
        readonly callbacks: Partial<UIInteractionCallbacks<UIImageButton>> = {},
        readonly imageOptions: ImageButtonStateImages,
        readonly style: ViewStyle = {},
        readonly bindingOptions?: UIImageButtonBindingOptions,
    ) {
        super([], {}, {}, bindingOptions);
        this.image = new UIImage(
            imageOptions.image,
            {
                ...IMAGE_STYLE_DEFAULT,
            },
            {
                imageSource: true,
            },
        );
        this.children.push(this.image);
    }

    protected setState(state: UIButtonState, player: Player) {
        this.state.set(state, player);
        this.updateImage(player);
    }

    public setIsSelected(isSelected: boolean, player?: Player) {
        this.isSelected.set(isSelected, player);
        this.updateImage(player);
    }

    public getIsSelected(player?: Player) {
        return this.isSelected.get(player);
    }

    protected getImageFromState(player?: Player) {
        if (!this.enabled.get(player)) {
            return this.imageOptions.disabledImage;
        }

        if(this.bindingOptions?.updateImageBasedOnButtonState) {
            switch (this.state.get(player)) {
                case UIButtonState.HOVER:
                    return this.isSelected.get(player) ? this.imageOptions.selectedHoverImage : this.imageOptions.hoverImage;
                case UIButtonState.DOWN:
                    return this.imageOptions.pressImage;
                case UIButtonState.DEFAULT: // fallthrough
                default:
                    // no-op
            }
        }

        return this.isSelected.get(player) ? this.imageOptions.selectedImage : this.imageOptions.image;
    }


    public setImage(image: TextureImageAssetEx, player?: Player) {
        this.image.setImage(image, player);
    }

    protected updateImage(player?: Player) {
        let image = this.getImageFromState(player);
        if (!image) {
            image = this.imageOptions.image;
        }
        this.setImage(image, player);
    }

    override renderComponent() {
        return ui.Pressable({
            children: render(this.children),
            style: this.style,
            onEnter: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onEnter, player);
                this.setState(UIButtonState.HOVER, player);
            },
            onExit: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onExit, player);
                this.setState(UIButtonState.DEFAULT, player);
            },
            onPress: (player: Player) => {
                if (this.callbacks.onPress) {
                    this.doCallbackIfValid(this.callbacks.onPress, player);
                    this.setState(UIButtonState.DOWN, player);
                }
            },
            onClick: (player: Player) => {
                if (this.callbacks.onClick) { // have to use on click if button is inside a scroll view
                    this.doCallbackIfValid(this.callbacks.onClick, player);
                    this.setState(UIButtonState.DOWN, player);
                }
            },
            onRelease: (player: Player) => {
                this.doCallbackIfValid(this.callbacks.onRelease, player);
                this.setState(UIButtonState.HOVER, player);
            },
        });
    }
}

export class UIListView<T extends UIBaseComponent = UIBaseComponent> extends UIBaseComponent {
    constructor(public contents: T[], protected styleOptions: ConstsUI.ListViewStlyeOptions = ConstsUI.LIST_VIEW_STYLE_OPTIONS_HORIZONTAL, bindingOptions?: UIBaseBindingsOptions) {
        super(bindingOptions);
    }

    override renderComponent() {
        return ui.View({
            children: render(this.contents),
            style: {
                ...this.styleOptions.style,
            },
        });
    }
}

export enum AnimatedVeiwScaleScheme {
    UNIFORM,
    X_ONLY,
    Y_ONLY,
}

export class UIAnimatedView extends UIBaseComponent {
    scaleBinding = new ui.AnimatedBinding(1);
    transformBindings: any[] = [];

    constructor(protected contents: UIBaseComponent[], protected style: ui.ViewStyle, protected reserveSpaceWhenHidden: boolean = false, scaleScheme: AnimatedVeiwScaleScheme = AnimatedVeiwScaleScheme.UNIFORM) {
        super({visibility: true});
        this.contents = contents;

        if (style.transform) {
            this.transformBindings.push(...style.transform);
        }

        switch (scaleScheme) {
            case AnimatedVeiwScaleScheme.X_ONLY:
                this.transformBindings.push({scaleX: this.scaleBinding});
                break;
            case AnimatedVeiwScaleScheme.Y_ONLY:
                this.transformBindings.push({scaleY: this.scaleBinding});
                break;
            default:
                this.transformBindings.push({scale: this.scaleBinding});
                break;
        }
    }

    scaleIn(player?: Player, instant: boolean = false, onAnimComplete?: (finished: boolean, player?: Player) => void, durationMs: number = 300, startScale: number = 1.15, easing: ui.Easing = ui.Easing.out(ui.Easing.back)) {
        this.setVisible(true, player);
        if (instant) {
            this.scaleBinding.set(1.0, undefined, player ? [player] : undefined);
            onAnimComplete?.(true, player);
            return;
        }

        this.scaleBinding.set(startScale, undefined, player ? [player] : undefined);
        this.scaleBinding.set(
            instant ? 1.0 : ui.Animation.timing(1.0,
                {
                    duration: durationMs,
                    easing: easing,
                }),
            (finished, p) => {
                this.scaleBinding.set(1.0, undefined, p ? [p] : undefined);
                if (onAnimComplete) {
                    onAnimComplete(finished, p);
                }
            },
            player ? [player] : undefined);
    }

    pulse(player?: Player, onAnimComplete?: (finished: boolean, player?: Player) => void, startScale = 0.75, durationMs: number = 300, easing: ui.Easing = ui.Easing.in(ui.Easing.back)) {
        this.scaleBinding.set(startScale, undefined, player ? [player] : undefined);
        this.scaleBinding.set(
            ui.Animation.timing(1.0, {
                duration: durationMs,
                easing: easing,
            }),
            (finished, p) => {
                this.scaleBinding.set(1.0, undefined, p ? [p] : undefined);
                onAnimComplete?.(finished, p);
            },
            player ? [player] : undefined);
    }

    scaleOut(player?: Player, instant: boolean = false, onAnimComplete?: (finished: boolean, player?: Player) => void, durationMs: number = 300, startScale: number = 1.0, easing: ui.Easing = ui.Easing.in(ui.Easing.back)) {
        if (instant) {
            this.setVisible(false, player);
            onAnimComplete?.(true, player);
            return;
        }

        this.scaleBinding.set(startScale, undefined, player ? [player] : undefined);
        this.scaleBinding.set(
            instant ? 0.001 : ui.Animation.timing(0.001,
                {
                    duration: durationMs,
                    easing: easing,
                }),
            (finished, p) => {
                this.setVisible(false, p);
                onAnimComplete?.(finished, p);
            },
            player ? [player] : undefined);
    }

    stopAnimation(player?: Player) {
        this.scaleBinding.stopAnimation(player ? [player] : undefined);
    }

    override renderComponent() {
        return ui.View({
            children: render(this.contents),
            style: {
                ...this.style,
                transform: this.transformBindings,
            },
        });
    }

    override renderHiddenComponent() {
        if (!this.reserveSpaceWhenHidden) {
            return;
        }

        return ui.View({
            children: [],
            style: {
                ...this.style,
                ...HIDDEN_VIEW_STYLE,
            },
        });
    }
}

//** PAGINATED VIEW */
export class UIPaginatedView extends UIListView<UIBaseComponent> {
    protected activePageIndex = new PerPlayerValues<number>(-1);

    protected xBinding = new UIBinding<number>(0);
    protected yBinding = new UIBinding<number>(0);

    constructor(pages: UIBaseComponent[], protected paginateViewStyleOptions: ConstsUI.PaginateViewStyleOptions = ConstsUI.PAGINATED_VIEW_STYLE_OPTIONS_DEFAULT, bindingOptions?: UIBaseBindingsOptions) {
        super(pages, paginateViewStyleOptions, bindingOptions);

        /*
        this.pages.forEach((value)=>{
          value.setVisible(false);
        });
        */

        this.setPage(0);
    }

    setPage(index: number, player?: Player, instant: boolean = false) {
        /*
        this.pages[this.activePageIndex].setVisible(false);
        this.activePageIndex = index;
        this.pages[this.activePageIndex].setVisible(true);
        */

        // TODO: Figure out how to procedurally make this configurable
        if (this.activePageIndex.get(player) == index) {
            return;
        }

        this.activePageIndex.set(index, player);

        switch (this.paginateViewStyleOptions.changeScheme) {
            case ConstsUI.PaginatedViewChangeScheme.INSTANT:
                for (let i = 0; i < this.contents.length; ++i) {
                    this.contents[i].setVisible(i == index, player);
                }
                break;
            case ConstsUI.PaginatedViewChangeScheme.SCROLL_HORIZONTAL:
                if (instant) {
                    this.setX(-this.paginateViewStyleOptions.pageWidth * index, player);
                } else {
                    GlobalAnimationManager.animateTo(this.xBinding.get(player), -this.paginateViewStyleOptions.pageWidth * index, this.paginateViewStyleOptions.changeSpeed * 1000, (value) => this.setX(value as number, player));
                }

                break;
            case ConstsUI.PaginatedViewChangeScheme.SCROLL_VERTICAL:
                if (instant) {
                    this.setY(-this.paginateViewStyleOptions.pageHeight * index, player);
                } else {
                    GlobalAnimationManager.animateTo(this.yBinding.get(player), -this.paginateViewStyleOptions.pageHeight * index, this.paginateViewStyleOptions.changeSpeed * 1000, (value) => this.setY(value as number, player));
                }

                break;
        }
    }

    setX(x: number, player?: Player) {
        this.xBinding.set(Math.round(x), player);
    }

    setY(y: number, player?: Player) {
        this.yBinding.set(Math.round(y), player);
    }

    override renderComponent() {
        return ui.View({
            children: render(this.contents),
            style: {
                ...this.paginateViewStyleOptions.style,
                transform: [{translate: [this.xBinding.binding, this.yBinding.binding]}],
            },
        });
    }
}

//** TAB VIEW */

export interface TabViewContent {
    tabLabel: string,
    tabContent: UIBaseComponent,
}

/**
 * [WIP DESCRIPTION]
 * @description Each tab is associated with one piece of content.
 * For each item in content[] we make a new tab button that gets passed TabViewStyleOptions
 * @param contents:TabViewContent[] - Main content we display after clicking a tab
 * @param tabViewOptions:ConstsUI.TabViewStyleOptions = {ViewStyle, ButtonStyleOptions, ViewStyle, PaginateViewStyleOptions}
 * @returns [TBD]
 */
export class UITabView extends UIBaseComponent {
    activeTabIndex = new PerPlayerValues<number>(0);
    enabled = new PerPlayerValues<boolean>(true);

    tabButtons: UIButton[] = [];
    tabContents: UIPaginatedView;

    constructor(contents: TabViewContent[],
                protected styleOptions: TabViewStyleOptions = ConstsUI.TAB_VIEW_STYLE_OPTIONS_TABS_TOP,
                protected sharedContent: UIBaseComponent | undefined = undefined,
                protected onTabButtonPressed: ((index: number, player?: Player, instant?: boolean) => void) | undefined = undefined,
                bindingOptions?: UIBaseBindingsOptions) {
        super(bindingOptions);

        const pages: UIBaseComponent[] = [];
        let index = 0;
        contents.forEach((value) => {
            pages.push(value.tabContent);

            const selectionIndex = index;

            const tabButton = new UIButton(
                {
                    onPress: (player) => this.selectTab(selectionIndex, player),
                },
                value.tabLabel,
                {
                    ...styleOptions.tabButtonStyleOptions,
                });

            this.tabButtons.push(tabButton);
            index++;
        });

        this.tabContents = new UIPaginatedView(pages, styleOptions.contentContainerStyle);
        this.selectTab(0, undefined, true);
    }

    setEnabled(enabled: boolean, player?: Player) {
        this.enabled.set(enabled, player);
        this.tabButtons.forEach((btn) => btn.setEnabled(enabled, player));
    }

    selectTab(index: number, player?: Player, instant: boolean = false) {
        const currentTabIndex = this.activeTabIndex.get(player);
        if (currentTabIndex >= 0 && currentTabIndex < this.tabButtons.length) {
            this.tabButtons.forEach((btn) => btn.setIsSelected(false, player));
        }
        this.activeTabIndex.set(index, player);
        if (index >= 0 && index < this.tabButtons.length) {
            this.tabButtons[index].setIsSelected(true, player);
        }

        if (this.onTabButtonPressed) {
            this.onTabButtonPressed(index, player, instant);
        }

        if (this.sharedContent) {
            this.sharedContent.setVisible(true, player);
        } else {
            this.tabContents.setPage(index, player, instant);
        }
    }

    getActiveTabIndex(player?: Player) {
        return this.activeTabIndex.get(player);
    }

    override renderComponent() {
        return ui.View({
            children: [
                ui.View({
                    children: render(this.tabButtons),
                    style: this.styleOptions.tabsContainerStyle,
                }),
                this.sharedContent ? this.sharedContent.render() : this.tabContents.render(),
            ],
            style: this.styleOptions.style,
        });
    }
}

/**
 * @description Extends UITabView, allows button state to be toggled off (if supplied with toggleable buttons)
 * @returns {ui.View}
 */
export class UITabViewToggleable extends UITabView {
    override selectTab(index: number, player?: Player, instant: boolean = false) {
        const currentTabIndex = this.activeTabIndex.get(player);
        const alreadySelected = currentTabIndex === index;
        if (alreadySelected) {
            index = 0;
        }
        super.selectTab(index, player, instant);
    }
}

//** PANEL */
export type UIPanelBindingOptions = UIBaseBindingsOptions & {
    headerTextBindingOptions?: UITextBindingOptions,
    bgImageBindingOptions?: UIImageBindingOptions,
}

/**
 * @description  A panel has three pieces, its main container, a header, and a body. Contents are placed in the body container.
 * @param {T[]} contents
 * @param {string} header
 * @param {ConstsUI.PanelStyleOptions} panelOptions (style:ui.ViewStyle, contentStyle:ui.ViewStyle, headerStyle:ui.TextStyle, bodyStyle:ui.ViewStyle, bgImage?:ui.ImageSource, bgImageStyle?:ui.ImageStyle;)
 * @param {boolean} isDynamic
 * @returns {ui.View}
 */
export class UIPanel extends UIBaseComponent {
    styleOptions: ConstsUI.PanelStyleOptions;
    bgImage?: UIImage;
    headerText?: UIText;

    constructor(protected contents: UIBaseComponent[], header: string = '', panelOptions: ConstsUI.PanelStyleOptions = ConstsUI.PANEL_STYLE_OPTIONS_DEFAULT, panelBindingOptions?: UIPanelBindingOptions) {
        super(panelBindingOptions);

        this.styleOptions = panelOptions;
        if (this.styleOptions.headerStyle) {
            this.headerText = new UIText(header, this.styleOptions.headerStyle, panelBindingOptions?.headerTextBindingOptions);
        } else {
            this.headerText = new UIText(header, ConstsUI.TEXT_STYLE_DEFAULT, panelBindingOptions?.headerTextBindingOptions);
        }

        this.contents = contents;

        if (this.styleOptions.bgImage) {
            if (this.styleOptions.bgImageStyle) {
                this.bgImage = new UIImage(this.styleOptions.bgImage, this.styleOptions.bgImageStyle, panelBindingOptions?.bgImageBindingOptions);
            } else {
                this.bgImage = new UIImage(this.styleOptions.bgImage, ConstsUI.IMAGE_STYLE_DEFAULT, panelBindingOptions?.bgImageBindingOptions);
            }
        }

    }

    override renderComponent() {

        let contents: ui.UINode[] = [];

        contents.push(ui.View({
            children: render(this.contents),
            style: this.styleOptions.bodyStyle,
        }));

        if (this.headerText) {
            contents.push(this.headerText.render());
        }

        if (this.bgImage) {
            return ui.View({
                children: [
                    // background
                    this.bgImage.render(),
                    // content
                    ui.View({
                        children: contents,
                        style: this.styleOptions.contentStyle,
                    }),
                ],
                style: this.styleOptions.style,
            });
        }
        return ui.View({
            children: contents,
            style: this.styleOptions.style,
        });
    }
}

//** SCROLL VIEW */
export class UIScrollView extends UIBaseComponent {
    constructor(
        private readonly children: UIWrapper[] = [],
        /**The style applied to the component.*/
        private readonly style: ViewStyle = STYLE_FULL_FILL,
        /**The styles to apply to the scroll view content container that wraps all of the child views.*/
        private readonly contentContainerStyle?: ViewStyle,
        /**When true, the scroll view's children are arranged horizontally in a row instead of vertically in a column. The default value is false.*/
        private readonly horizontal: boolean = false,
        bindingOptions?: UIBaseBindingsOptions,
    ) {
        super(bindingOptions);
    }

    override renderComponent() {
        return ScrollView({
            children: render(this.children),
            style: this.style,
            contentContainerStyle: this.contentContainerStyle,
            horizontal: this.horizontal,
        });
    }
}

//** DYNAMIC LIST */
export class UIDynamicList<T> extends UIBaseComponent {
    data: ui.Binding<T[]>;

    constructor(data: T[], private renderItem: (data: T, index?: number) => UIBaseComponent, private style: ViewStyle = {}) {
        super();
        this.data = new ui.Binding<T[]>(data);
    }

    override renderComponent(): ui.UINode {
        return ui.DynamicList({
            data: this.data,
            renderItem: (data: T, index?: number) => this.renderItem(data, index).render(),
            style: this.style,
        });
    }
}
