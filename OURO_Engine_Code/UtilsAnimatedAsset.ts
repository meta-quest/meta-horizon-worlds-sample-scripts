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

import { Color, Component } from 'horizon/core';
import { AssetBundleGizmo, AssetBundleInstanceReference } from 'horizon/unity_asset_bundles';
import { logEx } from 'UtilsConsoleEx';
import { EntityOrUndefined } from 'UtilsGameplay';

// Animated Assets
export interface AnimatedAssetStyle {
    tintColor?: Color;
    tintStrength?: number;
    brightness?: number;
}

export class AnimatedAsset {
    protected bundle!: AssetBundleGizmo;
    protected root!: AssetBundleInstanceReference;
    protected isLoaded: boolean = false;
    private onInitialized?: () => void;
    private cachedParameterChangesFuncs: (() => void)[] = [];

    constructor(private hzObj: Component) {
    }

    public getAnimationParameters() {
        return this.root.getAnimationParameters();
    }

    public initialize(obj: EntityOrUndefined, onInitialized?: () => void) {
        if (!obj) {
            const errorMessage = `Could not initialize Animated Asset, object provided is undefined or null.`;
            logEx(errorMessage);
            throw new Error(errorMessage);
        }

        this.bundle = obj.as(AssetBundleGizmo);
        this.onInitialized = onInitialized;
        this.checkIsLoaded();
    }

    private checkIsLoaded() {
        if (this.isLoaded) return;

        this.isLoaded = this.bundle && this.bundle.isLoaded();

        if (!this.isLoaded) {
            this.hzObj.async.setTimeout(() => this.checkIsLoaded(), 100);
            return;
        }

        this.root = this.bundle.getRoot();
        this.setCachedChangesStoredWhileLoading();
        this.onInitialized?.();
    }

    private doOrQueue(setParameterFunc: () => void) {
        if (this.isLoaded) {
            setParameterFunc();
            return;
        }
        this.cacheChangesWhenLoading(setParameterFunc);
    }

    setBool(id: string, value: boolean) {
        this.doOrQueue(() => this.root.setAnimationParameterBool(id, value));
    }

    setFloat(id: string, value: number) {
        this.doOrQueue(() => this.root.setAnimationParameterFloat(id, value));
    }

    setInt(id: string, value: number) {
        this.doOrQueue(() => this.root.setAnimationParameterInteger(id, value));
    }

    setTrigger(id: string) {
        this.doOrQueue(() => this.root.setAnimationParameterTrigger(id));
    }

    resetTrigger(id: string) {
        this.doOrQueue(() => this.root.resetAnimationParameterTrigger(id, true));
    }

    setLocalBool(id: string, value: boolean) {
        this.doOrQueue(() => this.root.setAnimationParameterBool(id, value, true));
    }

    setLocalFloat(id: string, value: number) {
        this.doOrQueue(() => this.root.setAnimationParameterFloat(id, value, true));
    }

    setLocalInt(id: string, value: number) {
        this.doOrQueue(() => this.root.setAnimationParameterInteger(id, value, true));
    }

    setLocalTrigger(id: string) {
        this.doOrQueue(() => this.root.setAnimationParameterTrigger(id, true));
    }

    resetLocalTrigger(id: string) {
        this.doOrQueue(() => this.root.resetAnimationParameterTrigger(id, true));
    }

    private cacheChangesWhenLoading(func: () => void) {
        this.cachedParameterChangesFuncs.push(func);
    }

    private setCachedChangesStoredWhileLoading() {
        this.cachedParameterChangesFuncs.forEach((func) => func());
        this.cachedParameterChangesFuncs = [];
    }

    getReference(str: string, errorIfNotExist: boolean = false) {
        return this.bundle?.getReference(str, errorIfNotExist);
    }

    setStyle(style: AnimatedAssetStyle) {
        if (!this.root) {
            console.error(`Root is undefined, can't set style.`);
            return;
        }

        if (style.tintColor) this.root?.style.tintColor.set(style.tintColor);
        if (style.tintStrength) this.root?.style.tintStrength.set(style.tintStrength);
        if (style.brightness) this.root?.style.brightness.set(style.brightness);

        console.log(`Will try to set style with data style. tintColor: ${style.tintColor}, style.tintStrength: ${style.tintStrength}, style.brightness: ${style.brightness}`);
    }
}
