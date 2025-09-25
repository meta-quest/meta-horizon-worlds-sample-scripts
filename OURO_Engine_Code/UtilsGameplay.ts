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



import { AssetEx } from 'AssetEx';
import { HapticsSettings } from 'ConstsHaptics';
import { EntityOrPlayer } from 'ConstsObj';
import { ChangeDataHitInfo, CHANGE_DATA_HIT_INFO_DEFAULT, SOURCE_DATA_DEFAULT } from 'EventData';
import * as EventsNetworked from 'EventsNetworked';
import * as libCam from 'horizon/camera';
import {
    AnimatedEntity,
    AttachableEntity,
    AttachablePlayerAnchor,
    AudioGizmo,
    BuiltInVariableType,
    CodeBlockEvent,
    CodeBlockEvents,
    Color,
    Component,
    Entity,
    EventSubscription,
    GrabbableEntity,
    Handedness,
    HapticSharpness,
    HapticStrength,
    LayerType,
    LocalEvent,
    MeshEntity,
    NetworkEvent,
    PhysicalEntity,
    PhysicsForceMode,
    Player,
    PlayerBodyPartType,
    PlayerDeviceType,
    PlayerVisibilityMode,
    Quaternion,
    RaycastGizmo,
    RaycastHit,
    RaycastTargetType,
    SerializableState,
    SpawnController,
    TextGizmo,
    TextureAsset,
    TrailGizmo,
    Vec3,
    World
} from 'horizon/core';
import { logEx, setConsoleHzObj } from 'UtilsConsoleEx';
import * as UtilsMath from 'UtilsMath';
import { TIME_UNITS } from 'UtilsMath';
import { fetchAsData, gameplayObjExists, getDebugName } from 'UtilsObj';

/*
 * So this is hacky, but important. A lot of functions require a horizon object to access, such as async functions or world. Because this script is imported on both server and client, we set the hzObj
 * with one entity that will always live on the server, and for clients set one that always live on the client.
 *
 * For server, this is: Game, since it's the entry point into the world
 * For clients, this is: LocalPlayer, since it's the main brain for local clients
 *
 * This will let us do stuff in this file WITHOUT requiring us to always pass in a component in the function signature
 */
let HZ_OBJ: Component;

export function setHzObj(obj: Component) {
    HZ_OBJ = obj;
    setConsoleHzObj(obj);
}

/**Do not use before start() context, otherwise this will likely throw an exception and cause cascading issues. On failure, this logs to our OURO console.*/
export function getHzObj(): Component {
    if (HZ_OBJ == undefined) {
        const errorMessage = `HZ_OBJ is trying to be used before it was set. Likely on a preStart() method.`;
        logEx(errorMessage, 'error');
        throw Error(errorMessage);
    }

    return HZ_OBJ;
}

/*
 * HUR is super weird about circular references, and they sometimes work and sometimes don't. This exists to circumvent that
 */
export let GAME_ENTITY: Entity;

export function setGameEntity(obj: Entity) {
    GAME_ENTITY = obj;
}

// Some Horizon API calls are buffered (such as set position and rotation) and batch called at the end of the frame.
// You will sometimes want to call a function on the next frame. This can be achieved by passing a setTimeout without a timeout value
export function doOrDelayOneFrame(shouldPlayImmediately: boolean, func: () => any) {
    if (HZ_OBJ && !shouldPlayImmediately) {
        HZ_OBJ.async.setTimeout(func);
    } else {
        func();
    }
}

export function tryCatchFunc<T>(func: () => T) {
    try {
        return func();
    } catch (e) {
        logEx(`tryCatchFunc Caught: "${e}"`, 'error');
    }
}

export async function asyncTimeout<T>(promise: Promise<T>, timeoutMessage?: string, timeoutMillis: number = 60000) {
    return await Promise.race([promise, timeout(timeoutMillis, timeoutMessage)]);
}

export async function timeout(timeoutMillis: number, timeoutMessage?: string) {
    return await new Promise((_, reject) => {
        return HZ_OBJ.async.setTimeout(() => reject(new Error(`TIMEOUT: ${timeoutMessage}`)), timeoutMillis);
    });
}

export async function waitForUpdate() {
    await new Promise(resolve => HZ_OBJ.async.setTimeout(() => resolve(true), 0));
}

export async function waitForMilliseconds(ms: number) {
    await new Promise(resolve => HZ_OBJ.async.setTimeout(() => resolve(true), ms));
}

export async function waitWhile(
    condition: () => boolean,
    intervalMs: number = 100,
    timeoutMs: number = 0,
): Promise<boolean> {
    if (timeoutMs > 0) {
        let timeoutTimer = timeoutMs;
        while (condition() && timeoutTimer > 0) {
            await waitForMilliseconds(intervalMs);
            timeoutTimer -= intervalMs;
        }
        return timeoutTimer > 0;
    } else {
        while (condition()) {
            await waitForMilliseconds(intervalMs);
        }
        return true;
    }
}

export async function waitUntil(
    condition: () => boolean,
    intervalMs: number = 100,
    timeoutMs: number = 0,
): Promise<boolean> {
    if (timeoutMs > 0) {
        let timeoutTimer = timeoutMs;
        while (!condition() && timeoutTimer > 0) {
            await waitForMilliseconds(intervalMs);
            timeoutTimer -= intervalMs;
        }
        return timeoutTimer > 0;
    } else {
        while (!condition()) {
            await waitForMilliseconds(intervalMs);
        }
        return true;
    }
}

export async function waitUntilAsync(
    condition: () => Promise<boolean>,
    intervalMs: number = 100,
    timeoutMs: number = 0,
): Promise<boolean> {
    if (timeoutMs > 0) {
        let timeoutTimer = timeoutMs;
        while (!(await condition()) && timeoutTimer > 0) {
            await waitForMilliseconds(intervalMs);
            timeoutTimer -= intervalMs;
        }
        return timeoutTimer > 0;
    } else {
        while (!(await condition())) {
            await waitForMilliseconds(intervalMs);
        }
        return true;
    }
}

// There's a bug (see T223881227), where on onPlayerEnterWorld, the world.getPlayers() function may return invalid players.
// Per discussion with BigBox, a delay of 100ms will fix it. We've found that that's not always true. Probably because our world is huge. So we poll instead.
// THIS IS TEMPORARY, please remove once the above task is resolved.
export function onPlayerEnterWorldSafe(serverComponent: Component, func: (player: Player) => (void | Promise<void>), printLogs: boolean = false) {
    serverComponent.connectCodeBlockEvent(
        serverComponent.entity,
        CodeBlockEvents.OnPlayerEnterWorld,
        (player) => {
            const schrodingersPlayer = `Schrodinger's Player ${toStringSafe(player)}`;

            // Poll until the player is valid. Once they're valid, callback and stop polling.
            const intervalTimeMillis = 100;
            const intervalsPerSecond = TIME_UNITS.MILLIS_PER_SECOND / intervalTimeMillis;

            let i = 0;
            const intervalHandle = serverComponent.async.setInterval(() => {
                i++;
                if (!gameplayObjExists(player)) {
                    if (i == (15 * intervalsPerSecond)) {
                        if (printLogs) logEx(`${schrodingersPlayer} never existed`);
                        serverComponent.async.clearInterval(intervalHandle);
                    }
                    return;
                }

                serverComponent.async.clearInterval(intervalHandle);

            }, intervalTimeMillis);
        }
    );
}

function resolveVoidOrPromiseVoidFunc(func: (player: Player) => (void | Promise<void>), player: Player) {
    const result = func(player);
    if (result instanceof Promise) {
        result.then(
            () => {
                // no-op on happy path
            },
            onRejected => {
                logEx(`${onRejected.message} ${onRejected.stack}`, 'error');
            }
        );
    }
}

export type EntityOrUndefined = Entity | undefined | null

export function toStringSafe(obj: EntityOrPlayer | undefined | null) {
    if (!obj) return 'UNDEFINED';

    let name: string;
    try {
        name = getHzObj().world.getServerPlayer() == obj ? 'SERVER' : getDebugName(obj);
    } catch (e) {
        console.warn('Player/Object no longer valid');
        name = 'INVALID';
    }
    return name;
}

export function getPositionRotation(obj: Entity): [Vec3, Quaternion] {
    return [obj.position.get(), obj.rotation.get()];
}

export function removeWhiteSpace(str?: string) {
    return str?.replace(/\s+/g, '') ?? '';
}

// Data loading
export async function loadAndProcessTSVAsset(
    dataAsset: AssetEx,
    processLine: (tsvData: Map<string, string | undefined>, index: number) => void,
    errorDebugString: string,
) {
    const result = await fetchAsData(dataAsset.getAsset());
    const rawTextData = result.asText();
    if (!rawTextData) {
        throw new Error(`No data found ${errorDebugString}`);
    }

    const lines = rawTextData.split('\n');
    const headers = lines[0].split('\t');

    // clean up headers so they map properly
    for (let j = 0; j < headers.length; j++) {
        headers[j] = removeWhiteSpace(headers[j]);
    }

    console.log(`processing: ${errorDebugString} - entries:${lines.length}`);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].split('\t');
        if (headers.length != line.length) {
            throw new Error(`Header length does not match data length - line: ${i - 1} - ${errorDebugString}`);
        }

        let lineData: Map<string, string | undefined> = new Map();
        for (let j = 0; j < headers.length; j++) {
            const value = line[j].trim();
            lineData.set(headers[j], value.length > 0 ? value : undefined);
        }

        processLine(lineData, i);
    }
}

// General
const mappedLogs = new Map<string, string>();

export function printMappedLog(key: string, message: string) {
    if (mappedLogs.get(key) != message) {
        mappedLogs.set(key, message);
        console.log(message);
    }
}

const rateLimitsTimeLastRanValues = new Map<string, number>();

export function canRunRateLimitedFunc(key: string, limitTimeMs: number = 500, providedMap?: Map<string, number>) {
    const map = providedMap ? providedMap : rateLimitsTimeLastRanValues;

    const timeLastRan = map.get(key);
    if (!timeLastRan) {
        map.set(key, Date.now());
        return true;
    }

    const result = Date.now() - timeLastRan > limitTimeMs;
    map.set(key, Date.now());
    return result;
}

export function formatVec(vec: Vec3, decimals: number = 3) {
    return `(X:${vec.x.toFixed(decimals)}, Y:${vec.y.toFixed(decimals)}, Z:${vec.z.toFixed(decimals)})`;
}

export function formatQuat(quat: Quaternion, decimals: number = 3) {
    return `(X:${quat.x.toFixed(decimals)}, Y:${quat.y.toFixed(decimals)}, Z:${quat.z.toFixed(decimals)}, W:${quat.w.toFixed(decimals)})`;
}

export function getCleanCSVArray(value?: string): string[] {
    if (!value) {
        return [];
    }
    return removeWhiteSpace(value).split(',').filter(i => i);
}

export interface TimeStringOptions {
    showMilliseconds?: boolean,
    showHours?: boolean,
    minutesPaddingDigits?: number,
}

export function getTimeString(seconds: number, options: TimeStringOptions = {}) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secondsRemainder = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);

    const hoursComponent = options.showHours ? hours.toString().padStart(2, '0') + ':' : '';
    const minutesComponent = minutes.toString().padStart(options.minutesPaddingDigits ?? 2, '0');
    const secondsComponent = ':' + secondsRemainder.toString().padStart(2, '0');
    const millisecondsComponent = options.showMilliseconds ? ':' + milliseconds.toString().padStart(2, '0') : '';

    return hoursComponent + minutesComponent + secondsComponent + millisecondsComponent;
}

export function truncateRichText(text: string, characterLimit: number = 14) {
    return text.length <= characterLimit ? text : text.slice(0, characterLimit) + '<cspace=-.2em>...</cspace>';
}

export function truncateCustomUIText(text: string, characterLimit: number = 14) {
    // Note: We adjust truncation to roughly match width of truncation characters '...', otherwise CustomUI text may spillover.
    return text.length > characterLimit ? text.slice(0, characterLimit - 2) + '...' : text;
}

export function getFromArrayClamped<T>(array: T[], index: number) {
    if (index < 0) {
        return array[0];
    }

    if (index >= array.length) {
        return array[array.length - 1];
    }

    return array[index];
}

export function getHexFrom01(value: number) {
    const mappedValue = Math.floor(255 * UtilsMath.clamp01(value));
    return (mappedValue > 15 ? '' : '0') + mappedValue.toString(16);
}

export function getRGBHex(color: Color) {
    return '#' + getHexFrom01(color.r) + getHexFrom01(color.g) + getHexFrom01(color.b);
}

export function getRGBAHex(color: Color, alpha: number = 1.0) {
    return getRGBHex(color) + getHexFrom01(alpha);
}

export function ColorLerp(a: Color, b: Color, t: number) {
    return new Color(UtilsMath.lerp(a.r, b.r, t), UtilsMath.lerp(a.g, b.g, t), UtilsMath.lerp(a.b, b.b, t));
}

export function raycast(rayGizmo: EntityOrUndefined, origin: Vec3, dir: Vec3, dist: number, layerType?: LayerType) {
    return rayGizmo?.as(RaycastGizmo)?.raycast(origin, dir, {maxDistance: dist, layerType: layerType});
}

/** This is a potentially expensive operation if you continue to hit ignore objects consecutively. */
export function raycastIgnoreTags(rayGizmo: EntityOrUndefined, origin: Vec3, direction: Vec3, distance: number, ignoreTags: string[], distanceIncrement: number = 1, layer: LayerType = LayerType.Both) {
    const directionNormalized = direction.normalize();
    let hit = raycast(rayGizmo, origin, directionNormalized, distance, layer);

    while (hit && hit.targetType == RaycastTargetType.Entity && hit.target.tags.get().some((tag) => ignoreTags.includes(tag))) {
        const distanceFromHit = origin.distance(hit.hitPoint);
        const offsetDistance = distanceFromHit + distanceIncrement;
        const newStartPos = origin.add(directionNormalized.mul(offsetDistance));
        hit = raycast(rayGizmo, newStartPos, directionNormalized, distance - offsetDistance, layer);
    }

    return hit;
}

/**Preforms raycast ignoring object that has an ancestor with a matching tag*/
export function raycastIgnoreAncestorTags(rayGizmo: EntityOrUndefined, origin: Vec3, direction: Vec3, distance: number, ignoreTags: string[], distanceIncrement: number = 1, layer: LayerType = LayerType.Both) {
    const directionNormalized = direction.normalize();
    let hit = raycast(rayGizmo, origin, directionNormalized, distance, layer);

    while (hit && hit.targetType == RaycastTargetType.Entity && getFirstAncestorWithTags(hit.target, ignoreTags, true, false)) {
        const distanceFromHit = origin.distance(hit.hitPoint);
        const offsetDistance = distanceFromHit + distanceIncrement;
        const newStartPos = origin.add(directionNormalized.mul(offsetDistance));
        hit = raycast(rayGizmo, newStartPos, directionNormalized, distance - offsetDistance, layer);
    }

    return hit;
}

export function getRayHitObjectName(hit: RaycastHit) {
    return hit.targetType == RaycastTargetType.Static ? 'Static Object' : getDebugName(hit.target);
}

/* UI HELPERS */
export const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
export const RGBA_REGEX = /rgba?\(([^)]+)\)/i;

export function darkenColor(color: string, percent: number): string {
    const hexMatch = color.match(HEX_REGEX);
    const rgbaMatch = color.match(RGBA_REGEX);

    if (hexMatch) {
        const [, rHex, gHex, bHex] = hexMatch;
        const r = parseInt(rHex, 16);
        const g = parseInt(gHex, 16);
        const b = parseInt(bHex, 16);
        return darkenRGBColor(r, g, b, percent);
    } else if (rgbaMatch) {
        const rgbaComponents = rgbaMatch[1].split(',').map(parseFloat);
        if (rgbaComponents.length === 4) {
            const [r, g, b, a] = rgbaComponents;
            return darkenRGBColor(r, g, b, percent, a);
        }
    }

    // Returning Magenta if error or unsupported format
    return `rgba(255, 30, 246, 1)`;
}

export function darkenRGBColor(r: number, g: number, b: number, percentage: number, a: number = 1): string {
    const maxR = Math.max(0, r - (255 - r) * (percentage / 100));
    const maxG = Math.max(0, g - (255 - g) * (percentage / 100));
    const maxB = Math.max(0, b - (255 - b) * (percentage / 100));
    const maxA = Math.max(0, Math.min(1, a - (1 - a) * (percentage / 100)));

    return `rgba(${maxR}, ${maxG}, ${maxB}, ${maxA})`;
}

export function desaturateRGBColor(r: number, g: number, b: number, percent: number, a: number = 1): string {
    const average = (r + g + b) / 3;
    const desaturationFactor = 1 - UtilsMath.clamp(percent, 0, 100) / 100;

    const desaturatedR = Math.round(r * desaturationFactor + average * (1 - desaturationFactor));
    const desaturatedG = Math.round(g * desaturationFactor + average * (1 - desaturationFactor));
    const desaturatedB = Math.round(b * desaturationFactor + average * (1 - desaturationFactor));

    return `rgba(${desaturatedR}, ${desaturatedG}, ${desaturatedB}, ${a})`;
}

export function desaturateColor(color: string, percent: number): string {
    const hexMatch = color.match(HEX_REGEX);
    const rgbaMatch = color.match(RGBA_REGEX);

    if (hexMatch) {
        const [, rHex, gHex, bHex] = hexMatch;
        const r = parseInt(rHex, 16);
        const g = parseInt(gHex, 16);
        const b = parseInt(bHex, 16);
        return desaturateRGBColor(r, g, b, percent);
    } else if (rgbaMatch) {
        const rgbaComponents = rgbaMatch[1].split(',').map(parseFloat);
        if (rgbaComponents.length === 4) {
            const [r, g, b, a] = rgbaComponents;
            return desaturateRGBColor(r, g, b, percent, a);
        }
    }
    // Returning Magenta if error or unsupported format
    return `rgba(255, 30, 246, 1)`;
}

// Spawn Controller Helpers
export function spawnControllerWithDefaults(asset: AssetEx, pos: Vec3 = Vec3.zero, rot: Quaternion = Quaternion.one, scale: Vec3 = Vec3.one) {
    return new SpawnController(asset.getAsset(), pos, rot, scale);
}

// Player Helpers
export function isServerPlayer(player: Player | undefined, world: World) {
    return player === world.getServerPlayer();
}

export function isServer(world: World) {
    return world.getLocalPlayer() == world.getServerPlayer();
}

// This function has to be called after hzObj is setup; use isServer instead for anything early in startup cycle (such as on an onUpdate invocation)
export function isServerSingleton() {
    return HZ_OBJ.world.getServerPlayer() == HZ_OBJ.world.getLocalPlayer();
}

export function checkIfClient(errorMessage: string = 'Not client context') {
    if (isServerSingleton()) throw Error(errorMessage);
}

export function checkIfServer(errorMessage: string = 'Not server context') {
    if (!isServerSingleton()) throw Error(errorMessage);
}

export function playHaptics(player: Player | undefined, rightHand: boolean, duration: number = 500, strength: HapticStrength = HapticStrength.Strong, sharpness: HapticSharpness = HapticSharpness.Coarse) {
    if (!player) return;
    // TODO: Re-enable when haptics are not stupid expensive. They're currently costing us ~0.8ms per call.
    // (rightHand ? player.rightHand : player.leftHand).playHaptics(duration, strength, sharpness);
}

function playHapticsFromSettingsInternal(player: Player, settings: HapticsSettings) {
    playHaptics(player, settings.handedness == Handedness.Right, settings.duration, settings.strength, settings.sharpness);
}

export function playHapticsFromSettings(player: Player | undefined, settings: HapticsSettings[] | HapticsSettings | undefined) {
    if (!player || !settings) return;
    if (settings instanceof Array) settings.forEach(data => playHapticsFromSettingsInternal(player, data));
    else playHapticsFromSettingsInternal(player, settings);
}

export function playHapticsPulse(player: Player, rightHand: boolean, script: Component, pulses: number = 3, interval: number = .1, duration: number = 500, strength: HapticStrength = HapticStrength.Strong, sharpness: HapticSharpness = HapticSharpness.Coarse) {
    let pulseIndex = 0;
    const id = script.async.setInterval(() => {
        pulseIndex++;
        playHaptics(player, rightHand, duration, strength, sharpness);

        if (pulseIndex >= pulses) {
            script.async.clearTimeout(id);
        }
    }, interval * 1000);
    return id;
}

export function getHandPos(player: Player, rightHand: boolean): Vec3 {
    if (rightHand) {
        return player.rightHand.position.get().clone();
    }
    return player.leftHand.position.get().clone();
}

export function getRightOfPlayer(player: Player) {
    const forward = player.forward.get();
    const up = player.up.get();
    return Vec3.cross(up, forward);
}

export function setPlayerSprintMultiplier(player: Player, multiplier: number = 1.0) {
    player.sprintMultiplier.set(multiplier);
}

export function playersEqual(a: Player, b: Player): boolean {
    return a.id == b.id;
}

// Gizmo helpers
export function playTrailVFX(trailVFX: EntityOrUndefined) {
    trailVFX?.as(TrailGizmo)?.play();
}

export function stopTrailVFX(trailVFX: EntityOrUndefined) {
    trailVFX?.as(TrailGizmo)?.stop();
}

export function setPitch(sfx: EntityOrUndefined, pitch: number) {
    sfx?.as(AudioGizmo)?.pitch.set(pitch);
}

export function setVolume(sfx: EntityOrUndefined, volume: number) {
    sfx?.as(AudioGizmo)?.volume.set(volume);
}

export function setText(obj: EntityOrUndefined, str: string) {
    obj?.as(TextGizmo)?.text.set(str);
}

export function playAnim(obj: EntityOrUndefined) {
    obj?.as(AnimatedEntity)?.play();
}

export function stopAnim(obj: EntityOrUndefined) {
    obj?.as(AnimatedEntity)?.stop();
}

export function attachToPlayer(obj: EntityOrUndefined, player: Player, anchor: AttachablePlayerAnchor, posOffset?: Vec3, rotOffset?: Quaternion) {
    obj?.as(AttachableEntity)?.detach();
    if (posOffset) {
        obj?.as(AttachableEntity)?.socketAttachmentPosition.set(posOffset);
    }
    if (rotOffset) {
        obj?.as(AttachableEntity)?.socketAttachmentRotation.set(rotOffset);
    }

    obj?.as(AttachableEntity)?.attachToPlayer(player, anchor);
}

// For some reason, the Head Attached Group may randomly become detached from the head.
// One instance where this happens consistently is after the NUX video completes and you're put into round.
// This is a band-aid fix to ensure the group is always attached to the head.
//
// NOTE: This subscribes to the PLAYER - which is automatically cleaned up when the player leaves the world.
export function attachToPlayerOnCameraModeChanged(component: Component, obj: EntityOrUndefined, player: Player, anchor: AttachablePlayerAnchor, posOffset?: Vec3, rotOffset?: Quaternion) {
    if (obj == undefined) return;
    connectNetworkEvent(component, player, EventsNetworked.onCameraModeChanged, _ => attachToPlayer(obj, player, anchor, posOffset, rotOffset));
}

export function detach(obj: EntityOrUndefined) {
    obj?.as(AttachableEntity)?.detach();
}

export function forceGrab(obj: EntityOrUndefined, player: Player, hand: Handedness, allowRelease: boolean = true) {
    obj?.as(GrabbableEntity)?.forceHold(player, hand, allowRelease);
}

export function forceRelease(obj: EntityOrUndefined) {
    obj?.as(GrabbableEntity)?.forceRelease();
}

export function applyForce(obj: EntityOrUndefined, force: Vec3, forceMode: PhysicsForceMode = PhysicsForceMode.Force) {
    obj?.as(PhysicalEntity)?.applyForce(force, forceMode);
}

export function zeroVelocity(obj: EntityOrUndefined) {
    obj?.as(PhysicalEntity)?.zeroVelocity();
}

// Entity state helpers
export function setVisible(obj: EntityOrPlayer | undefined | null, visible: boolean) {
    if (obj instanceof Player) return;
    obj?.visible.set(visible);
}

export function setVisibilityForPlayers(obj: EntityOrUndefined, players: Player[], visibleTo: boolean = true) {
    obj?.setVisibilityForPlayers(players, visibleTo ? PlayerVisibilityMode.VisibleTo : PlayerVisibilityMode.HiddenFrom);
}

// We've had issues with Entity.setVisibilityForPlayers not updating its internal visibility list appropriately for players that enter the world after
// the visibility list has been set. This is a workaround to force the visibility list to be updated when a player enters the world, so that it's always up-to-date.
//
// NOTE: This subscribes to the ENTITY - which has ramifications for when you subscribe based on whether you're subscribing on the client or the server.
// (For example, if called on an asset that is owned by the server, it must be called on pre-start or on start and not when a virtual owner is assigned (unless cleaned up in unassignment).)
export function setVisibilityForPlayersOnPlayerEnterWorld(component: Component, obj: EntityOrUndefined, getPlayers: () => Player[], visibleTo: boolean = true) {
    if (obj == undefined) return;
    connectCodeBlockEvent(component, obj, CodeBlockEvents.OnPlayerEnterWorld, _ => {
        // Remove the server player from the list of players - this is a convenience for server-owned Components.
        const playersWithoutServerPlayer = getPlayers()
            .filter(player => player != undefined && !isServerPlayer(player, component.world));
        setVisibilityForPlayers(obj, playersWithoutServerPlayer, visibleTo);
    });
}

// We've had issues with Entity.setVisibilityForPlayers not updating its internal visibility list appropriately for head-attached objects after camera mode changes.
// This is a workaround to force the visibility list to be updated when the camera mode changes, so that it's always up-to-date.
//
// NOTE: This subscribes to the PLAYER - which is automatically cleaned up when the player leaves the world.
export function setVisibilityForPlayersOnCameraModeChanged(component: Component, obj: EntityOrUndefined, player: Player, getPlayers: () => Player[], visibleTo: boolean = true) {
    if (obj == undefined) return;
    connectNetworkEvent(component, player, EventsNetworked.onCameraModeChanged, _ => {
        // Remove the server player from the list of players - this is a convenience for server-owned Components.
        const playersWithoutServerPlayer = getPlayers()
            .filter(player => player != undefined && !isServerPlayer(player, component.world));
        setVisibilityForPlayers(obj, playersWithoutServerPlayer, visibleTo);
    });
}

export function setCollidable(obj: EntityOrPlayer | undefined | null, collision: boolean) {
    if (obj instanceof Player) return;
    obj?.collidable.set(collision);
}

export function setVisibilityAndCollidable(obj: EntityOrPlayer | undefined | null, bool: boolean) {
    setVisible(obj, bool);
    setCollidable(obj, bool);
}

export function setTrimeshTintBrightness(obj: EntityOrUndefined, brightness: number) {
    obj?.as(MeshEntity)?.style.brightness.set(brightness);
}

export function setTrimeshTintStrength(obj: EntityOrUndefined, strength: number) {
    obj?.as(MeshEntity)?.style.tintStrength.set(strength);
}

export function setTrimeshTintColor(obj: EntityOrUndefined, color: Color) {
    obj?.as(MeshEntity)?.style.tintColor.set(color);
}

export function setTrimeshTexture(obj: EntityOrUndefined, texture: TextureAsset) {
    obj?.as(MeshEntity)?.setTexture(texture);
}

export function setColor(obj: EntityOrUndefined, color: Color, isTrimesh: boolean = false) {

    if (isTrimesh) {
        setTrimeshTintColor(obj, color);
    } else {
        obj?.color.set(color);
    }
}

// POSITIONING
export function syncToBodyPart(obj: EntityOrUndefined, player: Player, bodyPart: PlayerBodyPartType, localPos: Vec3 = Vec3.zero, localRot: Quaternion = Quaternion.one) {
    obj?.moveRelativeToPlayer(player, bodyPart, localPos);
    obj?.rotateRelativeToPlayer(player, bodyPart, localRot);
}

export function setPos(obj: EntityOrUndefined, pos: Vec3, localOnly: boolean = false) {
    if (!obj) return;

    if (!localOnly || obj.parent.get() == undefined) {
        obj.position.set(pos);
    } else {
        if (obj.parent.get() == undefined) return;

        obj.position.set(obj.parent!.get()!.position.get().add(pos));
    }
}

export function setRot(obj: EntityOrUndefined, rot: Quaternion, localOnly: boolean = false) {
    if (!obj) {
        return;
    }

    if (!localOnly || obj.parent.get() == undefined) {
        obj.rotation.set(rot);
    } else {
        obj.rotation.set(obj.parent!.get()!.rotation.get().mul(rot));
    }
}

export function setScale(obj: EntityOrUndefined, scale: Vec3, localOnly: boolean = false) {
    if (!obj) {
        return;
    }

    if (!localOnly) {
        obj.scale.set(scale);
    } else {
        obj.scale.set(obj.parent!.get()!.scale.get().add(scale));
    }
}

export function setPosRot(obj: EntityOrUndefined, pos: Vec3, rot: Quaternion, localOnly: boolean = false) {
    if (!obj) {
        return;
    }

    if (!localOnly) {
        obj.position.set(pos);
        obj.rotation.set(rot);
    } else {
        setPos(obj, pos, localOnly);
        setRot(obj, rot, localOnly);
    }
}

export function setPosScale(obj: EntityOrUndefined, pos: Vec3, scale: Vec3, localOnly: boolean = false, localSpace: boolean = false) {
    setPosRotScaleOpt(obj, pos, undefined, scale, localOnly, localSpace);
}

export function setPosRotScale(obj: EntityOrUndefined, pos: Vec3, rot: Quaternion, scale: Vec3, localOnly: boolean = false) {
    if (!obj) {
        return;
    }

    if (!localOnly) {
        obj.position.set(pos);
        obj.rotation.set(rot);
        obj.scale.set(scale);
    } else {
        setPos(obj, pos, localOnly);
        setRot(obj, rot, localOnly);
        setScale(obj, scale, localOnly);
    }
}

export function setPosRotScaleOpt(obj: EntityOrUndefined, pos?: Vec3, rot?: Quaternion, scale?: Vec3, localOnly: boolean = false, localSpace: boolean = false) {
    if (!obj) {
        return;
    }

    if (!localOnly) {
        if (pos) {
            obj.position.set(pos);
        }
        if (rot) {
            obj.rotation.set(rot);
        }
        if (scale) {
            obj.scale.set(scale);
        }
    } else {
        if (pos) {
            setPos(obj, pos, localOnly);
        }
        if (rot) {
            setRot(obj, rot, localOnly);
        }
        if (scale) {
            setScale(obj, scale, localOnly);
        }
    }
}

export function lerpPos(obj: EntityOrUndefined, targetPos: Vec3, lerpSpeed: number, deltaTime: number, localOnly: boolean = false) {
    if (!localOnly) {
        obj?.position.set(Vec3.lerp(obj.position.get(), targetPos, lerpSpeed * deltaTime));
    } else if (obj) {
        let smoothedPos = Vec3.lerp(obj.position.get(), targetPos, lerpSpeed * deltaTime);
        setPos(obj, smoothedPos, localOnly)
    }
}

export function setLocalPos(obj: EntityOrUndefined, localPos: Vec3) {
    obj?.transform.localPosition.set(localPos);
}

export function setLocalRot(obj: EntityOrUndefined, localRot: Quaternion) {
    obj?.transform.localRotation.set(localRot);
}

export function setLocalScale(obj: EntityOrUndefined, localScale: Vec3) {

    obj?.transform.localScale.set(localScale);
}

export function setLocalPosRot(obj: EntityOrUndefined, localPos: Vec3, localRot: Quaternion) {

    obj?.transform.localPosition.set(localPos);
    obj?.transform.localRotation.set(localRot);
}

export function setLocalPosRotScale(obj: EntityOrUndefined, localPos: Vec3, localRot: Quaternion, localScale: Vec3) {

    obj?.transform.localPosition.set(localPos);
    obj?.transform.localRotation.set(localRot);
    obj?.transform.localScale.set(localScale);
}

export function lerpPosAndRot(obj: EntityOrUndefined, targetPos: Vec3, targetRot: Quaternion, lerpSpeed: number, deltaTime: number, localOnly: boolean = false) {

    if (!localOnly) {
        obj?.position.set(Vec3.lerp(obj.position.get(), targetPos, lerpSpeed * deltaTime));
        obj?.rotation.set(targetRot);
    } else if (obj) {
        const smoothedPosRot = getPositionRotation(obj);
        let smoothedPos = Vec3.lerp(smoothedPosRot[0], targetPos, lerpSpeed * deltaTime);
        let smoothedRot = Quaternion.slerp(smoothedPosRot[1], targetRot, lerpSpeed * deltaTime);
        setPosRot(obj, smoothedPos, smoothedRot, localOnly);
    }
}

const localTransformCache = new Map<bigint, [Vec3, Quaternion]>();

export function getCachedLocalTransform(obj: EntityOrUndefined) {
    if (!obj) return undefined;

    const cachedValue = localTransformCache.get(obj.id);
    if (cachedValue) return cachedValue;

    const posRot = [obj.position.get(), obj.rotation.get()] as [Vec3, Quaternion];
    localTransformCache.set(obj.id, posRot);
    return posRot;
}

export function setLine(line: EntityOrUndefined, start: Vec3, end: Vec3, isCenterPivot: boolean = true, localOnly: boolean = false) {
    if (!line) return;

    const dir = Vec3.sub(end, start);
    const scale = line.scale.get();
    scale.z = dir.magnitude();
    setPosRotScale(line, isCenterPivot ? Vec3.lerp(start, end, 0.5) : start, Quaternion.lookRotation(dir), scale, localOnly);
}

// Entity Helpers

/** Set's horizon level ownership if not already owned by owner for obj.*/
export function setOwner(owner: Player, ...objs: EntityOrUndefined[]) {
    objs.forEach((obj) => {
        if (obj && obj.owner.get().id != owner.id) {
            obj.owner.set(owner);
        }
    });
}

export function setWhoCanGrab(obj: EntityOrUndefined, players: Player[]) {
    obj?.as(GrabbableEntity)?.setWhoCanGrab(players);
}

const cachedExistStates = new Map<bigint, boolean>();

export function exists(obj: EntityOrUndefined | undefined): boolean {
    if (!obj) {
        return false;
    }

    if (cachedExistStates.has(obj.id)) {
        return cachedExistStates.get(obj.id)!;
    }
    const exists = obj.exists();
    cachedExistStates.set(obj.id, exists);
    return exists;
}

export function entitiesEqual(a: EntityOrUndefined, b: EntityOrUndefined): boolean {
    if (!a && !b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    return a.id == b.id; // both exist so compare ids
}

// Common Helpers
export function getRandom<T>(array: T[]) {
    return array[Math.floor(Math.random() * array.length)];
}

export function connectCodeBlockEvent<TEventArgs extends BuiltInVariableType[], TCallbackArgs extends TEventArgs>(component: Component, target: Entity | Player | undefined, event: CodeBlockEvent<TEventArgs>, callback: (...payload: TCallbackArgs) => void): EventSubscription | undefined {
    if (!target) return undefined;
    return component.connectCodeBlockEvent(target, event, callback);
}

export function sendLocalEvent<TPayload extends object, TData extends TPayload>(component: Component, target: Entity | Player | undefined, event: LocalEvent<TPayload>, data: TData): void {
    if (!target) return;
    component.sendLocalEvent(target, event, data);
}

export function sendLocalAndBroadcastEvent<TPayload extends object, TData extends TPayload>(component: Component, target: Entity | Player | undefined, event: LocalEvent<TPayload>, data: TData) {
    sendLocalEvent(component, target, event, data);
    component.sendLocalBroadcastEvent(event, data);
}

export function connectLocalEvent<TPayload extends object>(component: Component, target: Entity | Player | undefined, event: LocalEvent<TPayload>, callback: (payload: TPayload) => void): EventSubscription | undefined {
    if (!target) return undefined;
    return component.connectLocalEvent(target, event, callback);
}

export function sendNetworkEvent<TPayload extends SerializableState>(component: Component, target: Entity | Player | undefined, event: NetworkEvent<TPayload>, data: TPayload, players?: Array<Player>): void {
    if (!target) return;
    component.sendNetworkEvent(target, event, data, players);
}

export function connectNetworkEvent<TPayload extends SerializableState>(component: Component, target: Entity | Player | undefined, event: NetworkEvent<TPayload>, callback: (payload: TPayload) => void): EventSubscription | undefined {
    if (!target) return undefined;
    return component.connectNetworkEvent(target, event, callback);
}

// Biome Core Duplicates
type Class<T> = new(...args: any[]) => T;

export function getFirstComponentInSelfOrChildren<T extends Component>(entity: EntityOrUndefined) {
    if (!entity) {
        return undefined;
    }

    for (const e of [entity, ...entity.children.get()]) {
        const foundScripts = e.getComponents<T>();
        if (foundScripts.length > 0) {
            return foundScripts[0];
        }
    }
}

export function getFirstAncestorOfTypedScript<T extends Component>(entity: EntityOrUndefined, type: Class<T>, shouldPrintError: boolean = true): T | undefined {
    if (!entity) {
        return undefined;
    }

    let node: Entity = entity;
    while (true) {
        const parent = node.parent.get();
        if (!parent) {
            if (shouldPrintError) {
                console.error(entity.name.get(), 'Missing expected parent of type', type.name);
            }
            return;
        }

        const components = parent.getComponents(type);
        if (components.length > 0) {
            return components[0];
        }
        node = parent;
    }
}

export function getFirstAncestorWithTags(entity: EntityOrUndefined, tags: string[], checkSelf: boolean = true, shouldPrintError: boolean = true) {
    if (!entity) {
        return undefined;
    }

    if (checkSelf && entity.tags.get().some((tag) => tags.includes(tag))) {
        return entity;
    }

    let node: Entity = entity;
    while (true) {
        const parent = node.parent.get();
        if (!parent) {
            if (shouldPrintError) {
                console.error(entity.name.get(), 'Missing expected parent with  - ', tags.reduce((accumulatedTags, nextTag) => `${accumulatedTags}, ${nextTag}`));
            }
            return;
        }

        if (parent.tags.get().some((tag) => tags.includes(tag))) {
            return parent;
        }
        node = parent;
    }
}


export function getAncestorEntityIds(entity: EntityOrUndefined, shouldPrintError: boolean = true): bigint[] | undefined {
    if (!entity) {
        return undefined;
    }
    const ids: bigint[] = [];
    let node: Entity = entity;
    while (true) {
        const parent = node.parent.get();
        if (!parent) {
            return ids;
        }

        node = parent;
        ids.push(parent.id);
    }
}

// ASYNC
export class AsyncTimeout {
    id: number | undefined;

    constructor(readonly asyncProvider: Component) {
    }
}

export type AsyncFunction = (...args: unknown[]) => void;

export function clearAsyncTimeOut(component: Component, timeOutId: number | undefined) {
    if (timeOutId == undefined) return;

    component.async.clearTimeout(timeOutId);
}

export function clearAsyncInterval(component: Component, intervalId: number | undefined) {
    if (intervalId == undefined) return;

    component.async.clearInterval(intervalId);
}

// Only invoke after delay milliseconds has passed without any other calls to Debounce with the same Timeout id.
// This is useful for sending only the very last input from a stream of rapid-fire inputs.
export function debounceAsync(timeout: AsyncTimeout, delay: number, func: AsyncFunction, ...args: unknown[]) {
    clearAsyncTimeOut(timeout.asyncProvider, timeout.id);
    timeout.id = timeout.asyncProvider.async.setTimeout(func, delay, args);
}

// Invoke only if it hasn't been invoked within the previous delay milliseconds.
export function throttleAsync(asyncProvider: Component, timeout: AsyncTimeout, delay: number, func: AsyncFunction, ...args: unknown[]) {
    if (timeout.id == undefined) {
        func(args);
        timeout.id = asyncProvider.async.setTimeout(() => timeout.id = undefined, delay);
    }
}

// Invoke immediately, then throttle future invokes until delay milliseconds has elapsed.
// This is useful for times when a normal debounce doesn't feel responsive enough.
export function takeFirstThenDebounceAsync(asyncProvider: Component, timeout: AsyncTimeout, delay: number, func: AsyncFunction, ...args: unknown[]) {
    if (timeout.id == undefined) {
        func(args);
        timeout.id = asyncProvider.async.setTimeout(() => timeout.id = undefined, delay, args);
    } else {
        clearAsyncTimeOut(asyncProvider, timeout.id);
        timeout.id = asyncProvider.async.setTimeout(() => {
            func(args);
            timeout.id = asyncProvider.async.setTimeout(() => timeout.id = undefined, delay);
        }, delay, args);
    }
}

export type RayData = {
    raycastGizmo: Entity,
    origin: Vec3,
    rot: Quaternion,
    forward: Vec3,
}

export function getRayData(raycastGizmo: EntityOrUndefined, deviceType: PlayerDeviceType): RayData | undefined {
    if (!raycastGizmo) {
        return;
    }

    let rayOrigin = raycastGizmo.position.get();
    let rayRot = raycastGizmo.rotation.get();
    let rayForward = Quaternion.mulVec3(rayRot, Vec3.forward);

    if (deviceType != PlayerDeviceType.VR) {
        let camera = libCam.default;
        if (camera !== null) {
            // Start raycast from roughly as far as the raycast gizmo is from the camera
            // removing as this offsets the predicted grenade launcher hit position
            //let cameraToRaycast = Vec3.sub(this.props.raycastGizmo.position.get(), camera.position.get()).magnitude();
            //rayOrigin = Vec3.add(camera.position.get(), Vec3.mul(camera.forward.get(), cameraToRaycast + 1.0));
            rayForward = Vec3.normalize(Vec3.sub(camera.lookAtPosition.get(), rayOrigin));
            rayRot = Quaternion.lookRotation(rayForward);
        }
    }

    return {
        raycastGizmo: raycastGizmo,
        origin: rayOrigin,
        rot: rayRot,
        forward: rayForward,
    };
}

export function makeDefaultChangeDataHitInfo(p: Player): ChangeDataHitInfo {
    return {
        ...CHANGE_DATA_HIT_INFO_DEFAULT,
        targetData: p,
        sourceData: {
            ...SOURCE_DATA_DEFAULT,
            obj: p,
        },
    };
}
