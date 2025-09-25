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
import * as ConstsUI from 'ConstsUI';
import { IMAGE_STYLE_DEFAULT, STYLE_FULL_FILL } from 'ConstsUI';
import { clamp, Color, Component, Player } from 'horizon/core';
import * as ui from 'horizon/ui';
import { AnimatedBinding, Animation, Easing, ViewStyle } from 'horizon/ui';
import { playSFXForPlayer } from 'UtilsFX';
import * as UtilsMath from 'UtilsMath';
import { lerp } from 'UtilsMath';
import {
    PerPlayerValues,
    render,
    UIAnimatedView,
    UIBaseBindingsOptions,
    UIBaseComponent,
    UIBinding,
    UIButton,
    UIButtonBindingOptions,
    UIButtonState,
    UIImage,
    UIImageBindingOptions,
    UIListView,
    UIText,
    UITextBindingOptions,
    UIView
} from 'UtilsUI';

export class UIToggleButton extends UIButton {
    override renderComponent() {
        return ui.Pressable({
            children: new UIView(this.children, STYLE_FULL_FILL).renderComponent(),
            style: this.style,

            onEnter: (player: Player) => {
                this.setState(UIButtonState.HOVER, player);
                this.doCallbackIfValid(this.callbacks.onEnter, player);
            },
            onExit: (player: Player) => {

                this.setState(this.getIsSelected(player) ? UIButtonState.SELECTED : UIButtonState.DEFAULT, player);
                this.doCallbackIfValid(this.callbacks.onExit, player);
            },
            onPress: (player: Player) => {
                if (this.callbacks.onPress) {
                    this.setIsSelected(!this.getIsSelected(player), player);
                    this.setState(!this.getIsSelected(player) ? UIButtonState.SELECTED : UIButtonState.HOVER, player);
                    this.doCallbackIfValid(this.callbacks.onPress, player);
                }
            },
            onClick: (player: Player) => {
                if (this.callbacks.onClick) {
                    this.setIsSelected(!this.getIsSelected(player), player);
                    this.setState(!this.getIsSelected(player) ? UIButtonState.SELECTED : UIButtonState.HOVER, player);
                    this.doCallbackIfValid(this.callbacks.onClick, player);
                }
            },
            onRelease: (player: Player) => {

                this.setState(this.state.get(player) != UIButtonState.SELECTED ? UIButtonState.SELECTED : UIButtonState.HOVER, player);
            },
        });
    }
}


export type UIValueSelectorBindingOptions = UIBaseBindingsOptions & {
    labelTextBindingOptions?: UITextBindingOptions,
    valueTextBindingOptions?: UITextBindingOptions,
    prevButtonBindingOptions?: UIButtonBindingOptions,
    nextButtonBindingOptions?: UIButtonBindingOptions,
}

/**
 * @description  A view that contains a list of elements that orients it vertiaclly, or horizonally. At some point, these would scroll [TBA].
 * @param {T[]} contents [needs to extend UIBaseComponent]
 * @param {ConstsUI.ListViewStlyeOptions} styleOptions
 * @param {boolean} isDynamic
 * @returns {ui.View}
 */

export class UIValueSelector<T> extends UIBaseComponent {
    perPlayerValues: PerPlayerValues<T>;

    labelText: UIText;
    valueText: UIText;

    previousButton: UIButton;
    nextButton: UIButton;

    constructor(
        label: string,
        initialValue: T,
        private values: readonly T[],
        private onValueChange: undefined | ((value: T, player?: Player) => void) = undefined,
        private showOptionCount: boolean = false,
        private styleOptions: ConstsUI.ValueSelectorStyleOptions = ConstsUI.VALUE_SELECTOR_STYLE_OPTIONS_DEFAULT,
        bindingOptions?: UIValueSelectorBindingOptions,
    ) {
        super(bindingOptions);

        if (this.values.indexOf(initialValue) === -1) {
            throw Error(`Invalid ${label} initial value ${initialValue}, not one of ${this.values}`);
        }

        this.perPlayerValues = new PerPlayerValues<T>(initialValue);
        this.labelText = new UIText(label, this.styleOptions.labelStyle, {
            ...bindingOptions?.labelTextBindingOptions,
            text: true,
        });
        this.valueText = new UIText(`${initialValue}`, this.styleOptions.valueStyle, {
            ...bindingOptions?.valueTextBindingOptions,
            text: true,
        });
        this.previousButton = new UIButton({onPress: (player) => this.previousValue(player)}, '<', this.styleOptions.previousButtonStyleOptions, bindingOptions?.prevButtonBindingOptions);
        this.nextButton = new UIButton({onPress: (player) => this.nextValue(player)}, '>', this.styleOptions.nextButtonStyleOptions, bindingOptions?.nextButtonBindingOptions);

        this.updateDisplay();
    }

    previousValue(player: Player) {
        this.setValueIndex(this.getCurrentIndex(player) - 1, player);
    }

    nextValue(player: Player) {
        this.setValueIndex(this.getCurrentIndex(player) + 1, player);
    }

    setValue(value: T, player: Player) {
        const index = this.values.indexOf(value);
        if (index == -1) return;

        this.setValueIndex(index, player);
    }

    setValueIndex(index: number, player: Player) {
        const value = this.values[clamp(index, 0, this.values.length - 1)];

        this.perPlayerValues.set(value, player);
        this.updateDisplay(player);
        this.onValueChange?.(value, player);
    }

    updateDisplay(player?: Player) {
        const value = this.perPlayerValues.get(player)!;
        const index = this.values.indexOf(value);

        this.previousButton.setEnabled(index > 0, player);
        this.nextButton.setEnabled(index < this.values.length - 1, player);
        this.valueText.setText(`${value}${this.showOptionCount ? `/ ${this.values.length}` : ''}`, player);
    }

    override renderComponent() {
        const children = [
            this.labelText,
            this.previousButton,
            this.valueText,
            this.nextButton,
        ];
        return ui.View({
            children: render(children),
            style: this.styleOptions.style,
        });
    }

    private getCurrentIndex(player: Player) {
        return this.values.indexOf(this.perPlayerValues.get(player));
    }
}

//** NUMBER SELECTOR */
export type UINumberSelectorOptions = {
    isPerPlayer: boolean,
    step: number;
    min?: number;
    max?: number;
    showMax?: boolean;
    displayedValueOffset: number;
}

export const UI_NUMBER_SELECTOR_OPTIONS_DEFAULT: UINumberSelectorOptions = {
    isPerPlayer: false,
    step: 1,
    displayedValueOffset: 0,
};

export type UINumberSelectorBindingOptions = UIBaseBindingsOptions & {
    labelTextBindingOptions?: UITextBindingOptions,
    valueTextBindingOptions?: UITextBindingOptions,
    decrementButtonBindingOptions?: UIButtonBindingOptions,
    incrementButtonBindingOptions?: UIButtonBindingOptions,
}

export class UINumberSelector extends UIBaseComponent {
    enabled = new PerPlayerValues<boolean>(true);
    value: PerPlayerValues<number>;

    labelText: UIText;
    valueText: UIText;

    decrementButton: UIButton;
    incrementButton: UIButton;

    constructor(
        label: string,
        initialValue: number,
        readonly onValueChange: undefined | ((value: number, player?: Player, btn?: UIButton) => void) = undefined,
        protected styleOptions: ConstsUI.SelectorStyleOptions = ConstsUI.NUMBER_SELECTOR_STYLE_OPTIONS_DEFAULT,
        public options: UINumberSelectorOptions = {...UI_NUMBER_SELECTOR_OPTIONS_DEFAULT},
        bindingOptions?: UINumberSelectorBindingOptions,
    ) {
        super(bindingOptions);

        this.value = new PerPlayerValues<number>(initialValue);
        this.styleOptions = styleOptions;

        this.labelText = new UIText(label, this.styleOptions.labelStyle, bindingOptions?.labelTextBindingOptions);
        this.valueText = new UIText(initialValue.toString(), this.styleOptions.valueStyle, {
            ...bindingOptions?.valueTextBindingOptions,
            text: true,
        });

        this.decrementButton = new UIButton({
            onPress: (player, btn) => this.decrementValue(player, btn),
        }, '<', this.styleOptions.previousButtonStyleOptions, bindingOptions?.decrementButtonBindingOptions);

        this.incrementButton = new UIButton({
            onPress: (player, btn) => this.incrementValue(player, btn),
        }, '>', this.styleOptions.nextButtonStyleOptions, bindingOptions?.incrementButtonBindingOptions);

        this.updateDisplay();
    }

    setEnabled(enabled: boolean, player?: Player) {
        this.enabled.set(enabled, player);
        this.updateDisplay(player);
    }

    incrementValue(player?: Player, btn?: UIButton) {
        let value = this.value.get(player);
        this.setValue(value + this.options.step, player, btn);
    }

    decrementValue(player?: Player, btn?: UIButton) {
        let value = this.value.get(player);
        this.setValue(value - this.options.step, player, btn);
    }

    setValue(value: number, player?: Player, btn?: UIButton) {
        if (this.options.min != undefined) {
            value = Math.max(this.options.min, value);
        }

        if (this.options.max != undefined) {
            value = Math.min(this.options.max, value);
        }

        this.value.set(value, this.options.isPerPlayer ? player : undefined);
        this.updateDisplay(this.options.isPerPlayer ? player : undefined);

        if (this.onValueChange) {
            this.onValueChange(value, player, btn);
        }
    }

    updateDisplay(player?: Player) {
        const enabled = this.enabled.get(player);
        const value = this.value.get(player);
        this.incrementButton.setEnabled(enabled && (this.options.max == undefined || value < this.options.max), player);
        this.decrementButton.setEnabled(enabled && (this.options.min == undefined || value > this.options.min), player);

        const decimalCount = this.options.step >= 1 ? 0 : this.options.step >= 0.1 ? 1 : 2;
        let valueText = (value + this.options.displayedValueOffset).toFixed(decimalCount).toString();
        if (this.options.showMax && this.options.max != undefined) {
            valueText += '/' + (this.options.max + this.options.displayedValueOffset).toString();
        }
        this.valueText.setText(valueText, player);
    }

    override renderComponent() {
        return ui.View({
            children: render([
                this.labelText,
                this.decrementButton,
                this.valueText,
                this.incrementButton,
            ]),
            style: this.styleOptions.style,
        });
    }
}

//** NUMBER TALLY */
export type UINumberTallyBindingOptions = UIBaseBindingsOptions & {
    labelTextBindingOptions?: UITextBindingOptions,
    descriptionTextBindingOptions?: UITextBindingOptions,
    valueTextBindingOptions?: UITextBindingOptions,
}

export class UINumberTally extends UIBaseComponent {

    labelText: UIText;
    descriptionText: UIText;
    valueText: UIText;
    container: UIAnimatedView;

    value = new PerPlayerValues<number>(0);
    fromValue = new PerPlayerValues<number>(0);
    toValue = new PerPlayerValues<number>(0);
    tallyTimer = new PerPlayerValues<number>(0);

    constructor(
        protected asyncProvider: Component,
        label: string,
        description: string = '',
        protected styleOptions: ConstsUI.NumberTallyStyleOptions = ConstsUI.NUMBER_TALLY_STYLE_OPTIONS_DEFAULT,
        bindingOptions?: UINumberTallyBindingOptions,
    ) {
        super(bindingOptions);

        this.labelText = new UIText(label, this.styleOptions.labelTextStyle, bindingOptions?.labelTextBindingOptions);
        this.descriptionText = new UIText(description, this.styleOptions.descriptionTextStyle, bindingOptions?.descriptionTextBindingOptions);
        const labelGroup = new UIListView([this.labelText, this.descriptionText], this.styleOptions.labelGroupStyle);

        this.valueText = new UIText('0', this.styleOptions.valueTextStyle, {
            ...bindingOptions?.valueTextBindingOptions,
            text: true,
        });

        this.container = new UIAnimatedView([labelGroup, this.valueText], styleOptions.containerStyle, false);

        this.setValue(0);
    }

    override renderComponent() {
        return this.container.render();
    }

    clearContent(player?: Player) {
        this.labelText.clearText(player);
        this.descriptionText.clearText(player);
        this.valueText.clearText(player);
    }

    restoreContent(player?: Player) {
        this.labelText.restoreText(player);
        this.descriptionText.restoreText(player);
        this.valueText.restoreText(player);
    }

    setValue(value: number, player?: Player) {
        this.value.set(value, player);
        if (this.styleOptions.valueToStringOverride) {
            this.valueText.setText(this.styleOptions.valueToStringOverride(value), player);
        } else {
            this.valueText.setText(Math.round(value).toString(), player);
        }
    }

    tallyTo(value: number, player: Player, playSFX: boolean = true) {
        this.fromValue.set(this.value.get(player), player);
        this.toValue.set(value, player);
        this.tallyTimer.set(0, player);

        this.asyncProvider.async.setTimeout(() => {
            this.doTally(player, playSFX);
        }, this.styleOptions.tallyIncrementTime * 1000);
    }

    doTally(player: Player, playSFX: boolean = true) {
        let tallyTimer = this.tallyTimer.get(player);
        tallyTimer += this.styleOptions.tallyTotalTime;
        this.tallyTimer.set(tallyTimer, player);

        const percent = tallyTimer / this.styleOptions.tallyTotalTime;
        const fromValue = this.fromValue.get(player);
        const toValue = this.toValue.get(player);
        const value = Math.round(UtilsMath.lerp(fromValue, toValue, percent));
        this.setValue(value, player);

        if (playSFX) {
            playSFXForPlayer(this.styleOptions.tallySFX, player);
        }

        if (percent >= 1.0) {
            this.setValue(this.toValue.get(player), player);
        } else {
            this.setValue(UtilsMath.lerp(this.fromValue.get(player), this.toValue.get(player), percent), player);
            this.asyncProvider.async.setTimeout(() => {
                this.doTally(player, playSFX);
            }, this.styleOptions.tallyIncrementTime * 1000);
        }
    }
}

//** BAR COMPONENT */
export type UIBarBindingOptions = UIBaseBindingsOptions & {
    labelTextBindingOptions?: UITextBindingOptions;
    fillColor?: boolean,
}

export class UIBar extends UIBaseComponent {
    protected percent: PerPlayerValues<number>;
    protected fill: AnimatedBinding;
    protected fillColor?: UIBinding<string>;
    label?: UIText;

    protected defaultFillColor: string;

    constructor(
        percent: number = 1.0,
        label: string = '',
        protected styleOptions: ConstsUI.BarStyleOptions = ConstsUI.BAR_STYLE_OPTIONS_DEFAULT,
        bindingOptions?: UIBarBindingOptions,
    ) {
        super(bindingOptions);

        percent = UtilsMath.clamp01(percent);
        this.percent = new PerPlayerValues<number>(percent);
        this.fill = new AnimatedBinding(percent);
        const fillStyleColor = styleOptions.fillStyle.backgroundColor;
        this.defaultFillColor = fillStyleColor ? (fillStyleColor instanceof Color ? fillStyleColor.toHex() : fillStyleColor as string) : 'white';
        if (bindingOptions?.fillColor) {
            this.fillColor = new UIBinding<string>(this.defaultFillColor);
        }

        if (label != '' || bindingOptions?.labelTextBindingOptions?.text) {
            this.label = new UIText(label, styleOptions.labelStyle, bindingOptions?.labelTextBindingOptions);
        }

        this.updateDisplay();
    }

    setFillColor(color: Color, player?: Player) {
        this.setFillColorStr(color.toHex(), player);
    }

    setFillColorStr(colorStr: string, player?: Player) {
        if (!this.fillColor) {
            throw new Error('Missing fill color binding - did you forget to set the binding options?');
        }
        this.fillColor.set(colorStr, player);
    }

    setPercent(percent: number, player?: Player) {
        this.percent.set(UtilsMath.clamp01(percent), player);
        this.updateDisplay(player);
    }

    animatePercentTo(percent: number, player?: Player, durationMs: number = 300, easing: ui.Easing = ui.Easing.linear, onComplete?: (finished: boolean, player: Player) => void) {
        this.percent.set(UtilsMath.clamp01(percent), player);
        this.fill.set(ui.Animation.timing(percent, {duration: durationMs, easing: easing}), (finished, player) => {
            onComplete?.(finished, player);
        }, player ? [player] : undefined);
    }

    stopPercentToAnimation(player?: Player, updateDisplay: boolean = true) {
        this.fill.stopAnimation(player ? [player] : undefined);
        if (updateDisplay) {
            this.updateDisplay(player);
        }
    }

    getPercent(player?: Player) {
        return this.percent.get(player);
    }

    updateDisplay(player?: Player) {
        this.fill.set(this.percent.get(player), undefined, player ? [player] : undefined);
    }

    override renderComponent() {
        const children = [
            ui.View({ // background
                style: {
                    ...this.styleOptions.backgroundStyle,
                },
            }),
            ui.View({ // fill
                style: {
                    ...this.styleOptions.fillStyle,
                    width: this.fill.interpolate([0, 1], ['0%', '100%']),
                    backgroundColor: this.fillColor ? this.fillColor.binding : this.defaultFillColor,
                },
            }),
        ];

        if (this.label) {
            children.push(this.label.render());
        }

        return ui.View({
            children: children,
            style: {
                ...this.styleOptions.style,
            },
        });
    }
}

export type UIImageBarBindingOptions = UIBaseBindingsOptions & {
    backgroundImageBindingOptions?: UIImageBindingOptions,
}

export class UIImageBar extends UIBaseComponent {
    container: UIView;
    backgroundImage: UIImage;
    fillMask: UIMaskableImage;

    constructor(
        percent: number,
        backgroundImageSource: TextureImageAssetEx,
        fillImageSource: TextureImageAssetEx,
        width: number,
        height: number,
        fillIsHorizontal: boolean,
        style: ViewStyle = {},
        bindingOptions?: UIImageBarBindingOptions,
    ) {
        super(bindingOptions);

        this.backgroundImage = new UIImage(
            backgroundImageSource,
            {
                ...IMAGE_STYLE_DEFAULT,
                ...STYLE_FULL_FILL,
                position: 'absolute',
            },
            bindingOptions?.backgroundImageBindingOptions,
        );

        this.fillMask = new UIMaskableImage(
            width,
            height,
            fillImageSource,
            fillIsHorizontal,
        );

        this.container = new UIView([
                this.backgroundImage,
                this.fillMask,
            ],
            {
                ...style,
                width: width,
                height: height,
                justifyContent: fillIsHorizontal ? 'flex-start' : 'flex-end',
            },
        );

        this.setPercent(percent);
    }

    override renderComponent(): ui.UINode {
        return this.container.render();
    }

    setPercent(percent: number, player?: Player) {
        this.fillMask.setPercent(percent, player);
    }

    animateToPercent(percent: number, durationSeconds: number, easing: Easing = Easing.linear, player?: Player) {
        this.fillMask.animateToPercent(percent, durationSeconds, easing, player);
    }
}

export class UIImageDoubleBar extends UIBaseComponent {
    private container: UIView;
    private readonly backgroundImage: UIImage;
    backgroundFillImage: UIMaskableImage;
    topFillImage: UIMaskableImage;

    constructor(
        percent: number,
        backgroundImageSource: TextureImageAssetEx,
        topFillImageSource: TextureImageAssetEx,
        backgroundFillImageSource: TextureImageAssetEx,
        width: number,
        height: number,
        fillIsHorizontal: boolean,
        style: ViewStyle = {},
        bindingOptions?: UIImageBarBindingOptions,
    ) {
        super(bindingOptions);

        this.backgroundImage = new UIImage(
            backgroundImageSource,
            {
                ...IMAGE_STYLE_DEFAULT,
                ...STYLE_FULL_FILL,
                position: 'absolute',
                zIndex: -100,
            },
            bindingOptions?.backgroundImageBindingOptions,
        );

        this.backgroundFillImage = new UIMaskableImage(
            width,
            height,
            backgroundFillImageSource,
            fillIsHorizontal,
            {zIndex: 0}
        );

        this.topFillImage = new UIMaskableImage(
            width,
            height,
            topFillImageSource,
            fillIsHorizontal,
            {zIndex: 100}
        );

        this.container = new UIView([
                this.backgroundImage,
                this.backgroundFillImage,
                this.topFillImage,
            ],
            {
                ...style,
                width: width,
                height: height,
                justifyContent: fillIsHorizontal ? 'flex-start' : 'flex-end',
            },
        );

        this.setPercent(percent);
    }

    override renderComponent(): ui.UINode {
        return this.container.render();
    }

    public setPercent(percent: number, player?: Player) {
        this.topFillImage.setPercent(percent, player);
        this.backgroundFillImage.setPercent(percent, player);
    }

    public animateTopBarToPercent(percent: number, durationSeconds: number, easing: Easing = Easing.linear, player?: Player) {
        this.topFillImage.animateToPercent(percent, durationSeconds, easing, player);
    }

    public animateBackgroundBarToPercent(percent: number, durationSeconds: number, easing: Easing = Easing.linear, player?: Player) {
        this.backgroundFillImage.animateToPercent(percent, durationSeconds, easing, player);
    }
}

export class UIMaskableImage extends UIBaseComponent {
    protected percent = new PerPlayerValues<number>(0);
    readonly fillImage: UIImage;
    readonly fillMask: UIView;
    readonly fillMaskSize: AnimatedBinding;

    constructor(
        readonly width: number,
        readonly height: number,
        readonly fillImageSource: TextureImageAssetEx,
        readonly fillIsHorizontal: boolean,
        maskStyle: ViewStyle = {},
        bindingsOptions?: UIBaseBindingsOptions,
    ) {
        super(bindingsOptions);
        this.fillImage = new UIImage(
            fillImageSource,
            {
                ...IMAGE_STYLE_DEFAULT,
                width: width,
                height: height,
                transform: [
                    {rotate: fillIsHorizontal ? '0deg' : '180deg'},
                ],
            },
        );

        this.fillMaskSize = new AnimatedBinding(this.fillIsHorizontal ? width : height);
        this.fillMask = new UIView(
            [
                this.fillImage,
            ],
            {
                ...maskStyle,
                position: 'absolute',
                overflow: 'hidden',
                width: this.fillIsHorizontal ? this.fillMaskSize : '100%',
                height: this.fillIsHorizontal ? '100%' : this.fillMaskSize,
                transform: [
                    {rotate: this.fillIsHorizontal ? '0deg' : '180deg'},
                ],
            },
        );
        this.setPercent(0);
    }

    getFillSize(player?: Player) {
        return lerp(0, this.fillIsHorizontal ? this.width : this.height, this.getPercent(player));
    }

    setPercent(percent: number, player?: Player) {
        this.percent.set(UtilsMath.clamp01(percent), player);
        this.animateToPercent(percent, 0, Easing.linear, player);
    }

    animateToPercent(percent: number, durationSeconds: number, easing: Easing = Easing.linear, player?: Player) {
        this.percent.set(UtilsMath.clamp01(percent), player);
        const animation = Animation.timing(
            this.getFillSize(player),
            {
                duration: durationSeconds * 1000,
                easing: easing,
            });
        this.fillMaskSize.set(animation, undefined, player ? [player] : undefined);
    }

    getPercent(player?: Player) {
        return this.percent.get(player);
    }

    renderComponent(): ui.UINode {
        return this.fillMask.render();
    }
}
