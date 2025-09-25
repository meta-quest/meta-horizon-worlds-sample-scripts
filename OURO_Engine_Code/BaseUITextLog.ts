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

import { StatusEffectHandler } from 'CompStatusEffects';
import { ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import { STATUS_EFFECT_DATA_REGISTRY } from 'ConstsStatusEffect';
import { WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import { DeathEventData } from 'Events';
import { GamePlayer } from 'GamePlayer';
import { Color, Component, Player, World } from 'horizon/core';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import * as UtilsGameplay from 'UtilsGameplay';
import { EntityOrUndefined, getHexFrom01, getRGBHex, truncateRichText } from 'UtilsGameplay';
import { clamp01, lerp } from 'UtilsMath';

const DEFAULT_DURATION_SECONDS = 5;
export const DEFAULT_ALIGNMENT_HORIZONTAL = '<align=left>';
export const DEFAULT_ALIGNMENT_VERTICAL_ALIGN_TO_TOP = true; // to align text vertically, we have to add line breaks to pad the content before or after. This allows us to key that logic.
export const LOG_LINE_HEIGHT = '<line-height=120%>';

export const LOG_ENTRIES_UNLIMITED = -1;
const LOG_UPDATE_RATE_LIMIT = 0.05;

const COLOR_HEX_WHITE = '#FFFFFF';
export const COLOR_HEX_PLAYER_HIGHLIGHT = '#FFFF00';

const LOG_BG_COLOR_NEUTRAL = '#3B3B3B';
const LOG_BG_COLOR_TEAM = '#0a1eb3';
const LOG_BG_COLOR_ENEMY = '#960000';

const KILL_LOG_NAME_CHARACTER_LIMIT = 12;

const LOG_BG_SYSTEM_EVENT = '#000000';

export class BaseUITextLog<T extends BaseUITextLogEntry = BaseUITextLogEntry> {
    maxEntries: number;
    textObject: EntityOrUndefined;
    horizontalAlignment: string;
    verticalAlignmentIsTop: boolean;
    entries: T[] = [];
    cachedVisibility: boolean | undefined = undefined;
    cachedDisplayText: string = '';
    updateRateLimitTimer = 0;

    /* Max Entries of -1 = Infinite */
    constructor(parent: Component, textObject: EntityOrUndefined, maxEntries: number = LOG_ENTRIES_UNLIMITED, horizontalAlignment: string = DEFAULT_ALIGNMENT_HORIZONTAL, verticalAlignmentIsTop: boolean = DEFAULT_ALIGNMENT_VERTICAL_ALIGN_TO_TOP) {
        this.textObject = textObject;
        this.horizontalAlignment = horizontalAlignment;
        this.verticalAlignmentIsTop = verticalAlignmentIsTop;
        this.maxEntries = maxEntries;
        this.updateVisibility();

        parent.connectLocalBroadcastEvent(World.onUpdate, (data) => {
            this.updateRateLimitTimer += data.deltaTime;
            if (this.updateRateLimitTimer < LOG_UPDATE_RATE_LIMIT) {
                return;
            }
            this.updateRateLimitTimer -= LOG_UPDATE_RATE_LIMIT;
            this.update(LOG_UPDATE_RATE_LIMIT);
        });
    }

    add(entry: T) {
        if (this.maxEntries > 0 && this.entries.length >= this.maxEntries) {
            this.entries.pop();
        }
        entry.parent = this;
        this.entries.push(entry);
        this.sortEntries();
        return entry;
    }

    remove(entry: T) {
        this.entries.splice(this.entries.indexOf(entry), 1);
        this.updateVisibility();
    }

    removeAll() {
        this.entries.length = 0;
        this.updateVisibility();
    }

    updateVisibility() {
        const hasLogsToShow = this.entries.length > 0;
        if (this.cachedVisibility != hasLogsToShow) {
            UtilsGameplay.setVisible(this.textObject, hasLogsToShow);
            this.cachedVisibility = hasLogsToShow;
        }
    }

    generateDisplayText() {
        let text = '';
        this.entries.forEach((entry) => {
            text = entry.toFormat() + '<br>' + text;
        });

        const padding = this.maxEntries - this.entries.length;
        for (let i = 0; i < padding; i++) {
            text = '<br>' + text;
        }

        text = this.horizontalAlignment + LOG_LINE_HEIGHT + text;

        return this.verticalAlignmentIsTop
            ? generateLineBreaksToPreserveVerticalAlignmentFromText(text) + text
            : text + generateLineBreaksToPreserveVerticalAlignmentFromText(text);
    }

    sortEntries() {
        this.entries.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            } else {
                return b.timeAddedInMs - a.timeAddedInMs;
            }
        });
    }

    getBaseEntriesOfType<U extends T>(entryType: new (...args: any[]) => U): U[] {
        return this.entries.filter((entry) => entry instanceof entryType) as U[];
    }

    /* Returns the first entry object that matches by string */
    private update(deltaTime: number) {
        this.updateVisibility();
        if (this.entries.length == 0) {
            return;
        }

        this.entries.forEach((entry) => {
            entry.update(deltaTime);
        });

        const displayText = this.generateDisplayText();
        if (displayText != this.cachedDisplayText) {
            UtilsGameplay.setText(this.textObject, displayText);
            this.cachedDisplayText = displayText;
        }
    }
}

export class BaseUITextLogEntry {
    parent: BaseUITextLog<BaseUITextLogEntry> | undefined;
    text: string;
    color: Color;
    priority: number;
    duration: number;
    timeAddedInMs: number;

    timeRemaining: number = 0;
    alpha: number = 1;

    /* Duration of -1 = Infinite */
    constructor(entry: string,
                color: Color = Color.white,
                priority: number = 0,
                duration: number = DEFAULT_DURATION_SECONDS
    ) {
        this.text = entry;
        this.color = color;
        this.priority = priority;
        this.duration = duration;
        this.timeAddedInMs = Date.now();
        if (this.duration) {
            this.timeRemaining = this.duration;
        }
    }

    toFormat() {
        return '<color=' + UtilsGameplay.getRGBHex(this.color) + UtilsGameplay.getHexFrom01(this.alpha) + '>' + this.injectHEXAlphaToRichText(this.text) + '</color>';
    }

    private injectHEXAlphaToRichText(text: string) {
        return text.replace(/<color=#([0-9A-Fa-f]{6})>/g, (match, colorHEX) => {
            return `<color=#${colorHEX}${getHexFrom01(this.alpha)}>`;
        });
    }

    update(deltaTime: number) {
        if (this.duration < 0) {
            return;
        }

        this.timeRemaining -= deltaTime;

        if (this.timeRemaining >= 0) {
            this.alpha = (this.timeRemaining / this.duration);
        } else {
            this.remove();
        }
    }

    remove() {
        this.alpha = 0;
        this.parent?.remove(this);
    }
}

const STATUS_EFFECT_RUNNING_OUT_WARNING_TIME = 3;

export class UITextLogEntryStatusEffect extends BaseUITextLogEntry {
    prefix = '';
    statusEffectHandler: StatusEffectHandler;
    targetSize: string;

    constructor(statusEffectHandler: StatusEffectHandler, targetSizeRichText: string = '75%') {
        super(
            statusEffectHandler.effectData.displayName,
            statusEffectHandler.effectData.color,
            statusEffectHandler.effectData.hudLogPriority,
            -1
        );
        this.statusEffectHandler = statusEffectHandler;
        this.targetSize = targetSizeRichText;
    }

    update(deltaTime: number) {
        if (this.statusEffectHandler.duration > 0) {
            this.alpha = this.statusEffectHandler.duration < STATUS_EFFECT_RUNNING_OUT_WARNING_TIME ? Math.abs(Math.sin(this.statusEffectHandler.duration * 2 * Math.PI)) : 1;
        }
    }

    toFormat(): string {
        const stacks = this.statusEffectHandler.stackCount > 1 ? +this.statusEffectHandler.stackCount.toString() + 'x ' : '';
        if (this.statusEffectHandler.duration > 0) {
            return formatRichText('<size=' + this.targetSize + '>', this.prefix + '<color=' + UtilsGameplay.getRGBAHex(this.color, this.alpha) + '>' + stacks + this.text + ' (' + this.statusEffectHandler.duration.toFixed(1) + 's)</color>');
        } else {
            return formatRichText('<size=' + this.targetSize + '>', this.prefix + '<color=' + UtilsGameplay.getRGBHex(this.color) + '>' + stacks + this.text + '</color>');
        }
    }
}

export class UITextLogEntryKill extends BaseUITextLogEntry {

    protected killerName: string = '';
    protected killerNameColor: string = '';
    protected sourceSpriteId?: string;
    protected sourceName: string = 'KO';
    protected deadName: string = '';
    protected bgColor: string = LOG_BG_COLOR_NEUTRAL;

    constructor(protected data: DeathEventData, virtualOwner: Player) {
        super('');
        const killer = ServerBaseObjRegistry.getObjFrom(data.sourceData);
        this.killerName = killer ? truncateRichText(killer.getDisplayName(), KILL_LOG_NAME_CHARACTER_LIMIT) : 'Something';
        this.killerNameColor = COLOR_HEX_WHITE;

        if (data.sourceData.weaponId) {
            const statusSource = STATUS_EFFECT_DATA_REGISTRY.get(data.sourceData.statusEffectId);
            if (statusSource) {
                this.sourceSpriteId = statusSource.killLogSprite;
                this.sourceName = statusSource.displayName;
            }
            const abilitySource = ABILITY_DATA_REGISTRY.get(data.sourceData.abilityId);
            if (abilitySource) {
                this.sourceSpriteId = abilitySource.killLogSprite;
                this.sourceName = abilitySource.displayName;
            }
            const weaponSource = WEAPON_DATA_REGISTRY.get(data.sourceData.weaponId);
            if (weaponSource) {
                this.sourceSpriteId = weaponSource.killLogSprite;
                this.sourceName = weaponSource.displayName;
            }
        }

        const dead = ServerBaseObjRegistry.getObj(data.targetData);
        this.deadName = dead ? truncateRichText(dead.getDisplayName(), KILL_LOG_NAME_CHARACTER_LIMIT) : 'Something';

        const gp = GamePlayer.getGamePlayer(virtualOwner);
        if (gp && killer) {
            const teamId = gp.getTeamId();
            if (teamId != undefined) {
                this.bgColor = teamId == killer.getTeamId() ? LOG_BG_COLOR_TEAM : LOG_BG_COLOR_ENEMY;
            }

            if(gp == killer) {
                this.killerNameColor = COLOR_HEX_PLAYER_HIGHLIGHT
            }
        }
    }

    toFormat(): string {
        const fadeThreshold = 0.1;
        const transitionThreshold = 0.95;

        let alpha = this.alpha;
        if (alpha > transitionThreshold) {
            alpha = 1.0 - ((alpha - transitionThreshold) / (1.0 - transitionThreshold));
        } else if (alpha < fadeThreshold) {
            alpha = alpha / fadeThreshold;
        } else {
            alpha = 1.0;
        }

        let pos = this.alpha - transitionThreshold;
        pos = Math.round(clamp01(pos) * 150);

        const alphaHex = UtilsGameplay.getHexFrom01(alpha);//Easing.inOutSine(this.alpha));
        let sourceDisplay = ' KOed ';
        if (this.sourceSpriteId != undefined) {
            sourceDisplay = `<u></u><sprite="SuperStrike" name="${this.sourceSpriteId}" color="${COLOR_HEX_WHITE + alphaHex}"></u>`;
        } else {
            sourceDisplay = `[${this.sourceName}]`;
        }
        const killerText = `<color=${this.killerNameColor + alphaHex}>${this.killerName}</color>`;
        const logContent = `<color=${COLOR_HEX_WHITE + alphaHex}><font="Kallisto-Bold SDF"><i> ${killerText} ${sourceDisplay} ${this.deadName} </i></font></color>`;
        // HACK: exploit TextMeshPro's rendering order by using the font tag
        const textRenderOnTopOfMarkExploit = '<font="Roboto-Bold SDF"><color=#FFFFFF00>.</color></font>';
        // HACK: Using a long enough string after the mark tag somehow makes the sprite appear on top of the mark as well
        const spriteRenderOnTopOfMarkExploit = '<color=#FFFFFF00>spriteRenderOnTopOfMarkExploit</color>';
        return `<pos=${pos}em><mark=${this.bgColor + alphaHex}>${logContent}${textRenderOnTopOfMarkExploit}</mark>${spriteRenderOnTopOfMarkExploit}</pos>`;
    }
}

export class UITextLogEntrySystemEvent extends BaseUITextLogEntry {

    constructor(text: string, color:Color, priority:number, duration:number = DEFAULT_DURATION_SECONDS) {
        super(text, color, priority, duration);
    }

    toFormat(): string {
        const fadeThreshold = 0.1;
        const transitionThreshold = 0.95;

        let alpha = this.alpha;
        if (alpha > transitionThreshold) {
            alpha = 1.0 - ((alpha - transitionThreshold) / (1.0 - transitionThreshold));
        } else if (alpha < fadeThreshold) {
            alpha = alpha / fadeThreshold;
        } else {
            alpha = 1.0;
        }

        let pos = this.alpha - transitionThreshold;
        pos = Math.round(clamp01(pos) * 150);

        const posTag = `<pos=${pos}em>`;
        const alphaHex = UtilsGameplay.getHexFrom01(alpha);//Easing.inOutSine(this.alpha));
        const colorHex = getRGBHex(this.color);
        let logContent = `<color=${colorHex + alphaHex}><font="Kallisto-Bold SDF"><i> ${this.text} </i></font></color>`;
        // apply position to line breaks so the content slides all together
        logContent = logContent.replace('<br>', `<br>${posTag}  `);

        // HACK: exploit TextMeshPro's rendering order by using the font tag
        const textRenderOnTopOfMarkExploit = '<font="Roboto-Bold SDF"><color=#FFFFFF00>.</color></font>';
        // HACK: Using a long enough string after the mark tag somehow makes the sprite appear on top of the mark as well
        const spriteRenderOnTopOfMarkExploit = '<color=#FFFFFF00>spriteRenderOnTopOfMarkExploit</color>';
        return `${posTag}<mark=${LOG_BG_SYSTEM_EVENT + alphaHex}>${logContent}${textRenderOnTopOfMarkExploit}</mark>${spriteRenderOnTopOfMarkExploit}</pos>`;
    }
}

export class UITextLogEntryTitleCard extends BaseUITextLogEntry {
    easeInPct: number = .075;
    easeOutPct: number = .15;

    getEaseTime(pct: number) {
        return this.duration * pct;
    }

    update(deltaTime: number) {
        this.timeRemaining -= deltaTime;

        if (this.timeRemaining >= this.duration - this.getEaseTime(this.easeInPct)) { // Ease in
            this.alpha = lerp(0, 1, 1 - (this.timeRemaining - (this.duration - this.getEaseTime(this.easeInPct))) / this.getEaseTime(this.easeInPct));
        } else if (this.timeRemaining <= this.getEaseTime(this.easeOutPct) && this.timeRemaining > 0) {
            this.alpha = lerp(1, 0, 1 - this.timeRemaining / this.getEaseTime(this.easeOutPct));
        } else if (this.timeRemaining <= 0) {
            this.remove();
        } else {
            this.alpha = 1;
        }
    }
}

export function generateLineBreaksToPreserveVerticalAlignmentFromText(text: string) {
    return text.match(/<br>/g)?.join('');
}

function formatRichText(formatting: string, textToFormat: string) {
    const match = formatting.match(/<([\w-]+)(?:=[^>]*)?>/g);  // Match the opening tags with or without attributes
    if (match) {
        let postfix = '';
        const tags = match.map(tag => {
            const tagName = tag.match(/<([\w-]+)/);  // Extract tag name
            return tagName ? tagName[1] : undefined;
        });

        tags.forEach((tag) => {
            if (tag) postfix += '</' + tag + '>';
        });
        return formatting + textToFormat + postfix;
    } else {
        return textToFormat;
    }
}
