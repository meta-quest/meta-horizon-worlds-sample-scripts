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

import { ButtonStyleOptions, BUTTON_STYLE_OPTIONS_DEFAULT, STYLE_FULL_FILL } from 'ConstsUI';
import { setRecordingModeEnabled } from 'Events';
import { Game } from 'Game';
import { Component, Player } from 'horizon/core';
import { TextStyle, UIComponent, UINode } from 'horizon/ui';
import { addToSessionLogs, getRawSessionLogs, getSessionLogs, logEx } from 'UtilsConsoleEx';
import { waitUntil } from 'UtilsGameplay';
import { UIButton, UIDynamicList, UIScrollView, UIText, UIView } from 'UtilsUI';
import { UIToggleButton } from 'UtilsUIComponents';

/**
 * A portable console.
 * It is particularly useful to get logs that happen before the horizon console initializes AND for the duration of the server.
 *
 * **Using in Empty World:**
 *
 * * **Note:** Server-side logging is already set up for you when calling `initializeUI()` function in `ConsoleEx.ts`. You only need to set up client-side logging if required.
 *
 * * **Client-Side Logging (Optional):** If you need per-player client logging, initialize `CONSOLE_HZ_OBJ` on a script client side.
 *
 * */

const UI_WIDTH = 1024;
const UI_HEIGHT = 512;

const TEXT_STYLE: TextStyle = {
    color: 'white',
    fontSize: 8,
    fontFamily: 'Roboto-Mono',
    fontWeight: '400',
};

const BUTTON_STYLE: ButtonStyleOptions = {
    ...BUTTON_STYLE_OPTIONS_DEFAULT,
    labelStyle: {
        ...TEXT_STYLE,
        color: 'black',
        fontSize: 14,
        textAlign: 'center',

    },
    buttonStyle: {
        ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStyle,
        width: '100%',
        alignSelf: 'center',
        borderRadius: 10,
    },
};

export class ConsoleEx extends UIComponent<typeof ConsoleEx> {
    static propsDefinition = {};
    panelWidth = UI_WIDTH;
    panelHeight = UI_HEIGHT;
    private spawnedScriptsLogs = new UIText('Refresh to see spawned asset infos.', TEXT_STYLE, {text: true});
    private sessionLogs = new UIText('Refresh to see all stored game logs.', TEXT_STYLE, {text: true});
    private filterButtonsDynamicList!: UIDynamicList<string>;
    private filterButtons: UIToggleButton[] = [];
    private filteredComponents = new Set<string>();
    private filteredEntityIds = new Set<string>();
    private isFilteringByEntityIds = true;

    initializeUI(): UINode {
        // This sets the Console Hz Obj for the server.
        this.connectNetworkBroadcastEvent(addToSessionLogs, (data) => {
            if (data.sourcePlayer == this.world.getLocalPlayer()) return;

            logEx(data.message, data.logType);
        });

        const worldName = new UIText(`${this.world.name.get()} [${this.world.id.get()}]`, {
            ...TEXT_STYLE,
            fontSize: 16,
            marginBottom: 6,
        });

        const startTimeString = `World [${this.world.name.get()}] Start Time: ${new Date().toString()} || Unix Timestamp: ${Date.now()}`;
        const serverStartTime = new UIText(startTimeString, TEXT_STYLE);

        const logContainer = new UIScrollView([this.sessionLogs], {
            ...STYLE_FULL_FILL,
            marginTop: 10,
            marginBottom: 10,
        }, {
            width: '100%',
            padding: 10,
            backgroundColor: 'rgb(19,19,30)',
        });

        const mainLeftContainer = new UIView(
            [
                worldName,
                serverStartTime,
                this.spawnedScriptsLogs,
                logContainer,
            ],
            {
                height: '100%',
                flex: 3,
            },
        );

        const debugButtonContainer = new UIView(
            [
                this.createRefreshButton(),
                this.createEnableRecordingButton(),
            ],
            {
                flexDirection: 'column',
            },
        );

        this.filterButtonsDynamicList = new UIDynamicList<string>([], (data) => this.createFilterButton(data));

        const filterButtonContainer = new UIScrollView([this.filterButtonsDynamicList], {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative',
            backgroundColor: 'rgb(27,27,27)',
            paddingLeft: 4,
            width: '100%',
        });

        const mainRightContainer = new UIView(
            [
                debugButtonContainer,
                filterButtonContainer,
            ],
            {
                width: '25%',
                justifyContent: 'flex-start',
                height: '100%',
                flexDirection: 'column',
            },
        );

        return new UIView([
            mainLeftContainer,
            mainRightContainer,
        ], {
            ...STYLE_FULL_FILL,
            flexDirection: 'row',
            backgroundColor: 'black',
            borderRadius: 14,
            padding: 20,
        }).render();
    }

    async start() {
        await waitUntil(Game.isPostStarted);
    }
    private addLogFilter(filter: string) {
        const filterSet = this.isFilteringByEntityIds ? this.filteredEntityIds : this.filteredComponents;
        filterSet.add(filter);
    }

    private removeLogFilter(filter: string) {
        const filterSet = this.isFilteringByEntityIds ? this.filteredEntityIds : this.filteredComponents;
        filterSet.delete(filter);
    }

    private createFilterButton(filter: string) {
        const button = new UIToggleButton({
            onClick: (player, button) => {
                if (button.getIsSelected(player)) {
                    this.addLogFilter(filter);
                } else {
                    this.removeLogFilter(filter);
                }
                this.refreshUI();
            },
        }, filter, {
            ...BUTTON_STYLE,
            buttonStyle: {
                ...BUTTON_STYLE.buttonStyle,
                width: '100%',
                maxWidth: '90%',
                alignSelf: 'flex-start',
            },
            labelStyle: {
                ...BUTTON_STYLE.labelStyle,
                fontSize: 12,
                textAlign: 'left',
                paddingLeft: 4,
            },
        });

        this.filterButtons.push(button);
        return button;
    }

    private createRefreshButton() {
        return new UIButton({onPress: () => this.refreshUI()}, 'Refresh', {
            ...BUTTON_STYLE,
            buttonStateColors: {
                ...BUTTON_STYLE_OPTIONS_DEFAULT.buttonStateColors,
                color: 'rgb(191,243,180)',
            },
        });
    }

    private createEnableRecordingButton() {
        return new UIToggleButton(
            {
                onPress: (p, btn) => {
                    this.sendLocalBroadcastEvent(setRecordingModeEnabled, {enabled: btn.getIsSelected(p), player: p});
                },
            },
            'Enable Recording Mode',
            BUTTON_STYLE,
        );
    }

    private refreshUI() {
        this.sessionLogs.setText(getSessionLogs(Array.from(this.filteredComponents.values()), Array.from(this.filteredEntityIds.values())));
    }

    private clearLogFilters(player: Player) {
        this.filterButtons.forEach((button) => button.setIsSelected(false, player));
        this.filteredComponents.clear();
        this.refreshUI();
    }
}

Component.register(ConsoleEx);
