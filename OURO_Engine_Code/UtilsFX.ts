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

import { DEBUG_VFX_LOGS_ENABLED } from 'ConstsDebugging';
import {
    AudibilityMode,
    AudioGizmo,
    Color,
    Component,
    Entity,
    ParticleFXPlayOptions,
    ParticleFXSetParameterOptions,
    ParticleFXSetParametersAndPlayOptions,
    ParticleFXSetParametersOptions,
    ParticleFXStopOptions,
    ParticleGizmo,
    Player,
    Quaternion,
    Vec3
} from 'horizon/core';
import { doOrDelayOneFrame, EntityOrUndefined, exists, getHzObj, setOwner, setPos, setRot, toStringSafe } from 'UtilsGameplay';
import { isEmpty } from 'UtilsTypescript';
import { VFXMultiOneshots } from 'VFXMultiOneshots';

export class Vec2 {
    constructor(public x: number, public y: number) {
    }

    static equals(vecA: Vec2, vecB: Vec2): boolean {
        return vecA.x == vecB.x && vecA.y == vecB.y;
    }
}

export class ColorWithAlpha {
    constructor(public r: number, public g: number, public b: number, public a: number) {
    }

    static equals(colorA: ColorWithAlpha, colorB: ColorWithAlpha): boolean {
        return colorA.r == colorB.r && colorA.g == colorB.g && colorA.b == colorB.b && colorA.a == colorB.a;
    }
}

export type GameFX = {
    allVFX?: Entity,
    playerVFX?: Entity,
    othersVFX?: Entity,

    allSFX?: Entity,
    allSFXFade?: number,

    playerSFX?: Entity,
    playerSFXFade?: number,

    otherSFX?: Entity,
    otherSFXFade?: number,
}

export interface GameFXProps {
    player?: Player;
    rot?: Quaternion;
    vfxProps?: GameVFXProps;
}

export interface GameVFXProps {
    oneShot?: boolean;
    /** array of VFX Parameter sets
     * @see createVFXParameter
     * */
    parameters?: VFXParameterData[];
}

export function gameFXExistsAny(fx: GameFX) {
    return exists(fx.allVFX) || exists(fx.allSFX) || exists(fx.playerSFX) || exists(fx.otherSFX) || exists(fx.playerVFX);
}

export function setOwnerGameFX(fx: GameFX, player: Player) {
    setOwner(
        player,
        fx.allVFX,
        fx.allSFX,
        fx.playerVFX,
        fx.playerSFX,
        fx.othersVFX,
        fx.otherSFX,
    );
}

// GAME FX
export function playGameFX(fx: GameFX, props: GameFXProps = {}) {
    playGameFXAt(fx, undefined, props);
}

export function playGameFXAt(fx: GameFX, position: Vec3 | undefined, props: GameFXProps = {}) {
    const allFx = fx.allSFX || fx.allVFX;
    const targetedSfx = fx.playerSFX || fx.otherSFX;
    const targetedVfx = fx.playerVFX || fx.othersVFX;
    const targetedFx = targetedSfx || targetedVfx;
    if (!allFx && !targetedFx) return;

    if (targetedFx && !props.player) console.error(`playGameFX played with targetedVFX [${targetedFx.name.get()}], without a player parameter, likely misconfiguration`);
    if (fx.allSFX && targetedSfx) console.error(`playGameFX has both an allSFX[${fx.allSFX?.name.get()}] and a targetedSFX [${targetedSfx.name.get()}] likely misconfiguration`);
    if (fx.allVFX && targetedVfx) console.error(`playGameFX has both an allVFX[${fx.allSFX?.name.get()}] and a targetedVFX [${targetedVfx.name.get()}] likely misconfiguration`);

    const options = {oneShot: props.vfxProps?.oneShot, position, rotation: props.rot};
    const parameters = props.vfxProps?.parameters;

    setVFXParametersAndPlay(fx.allVFX, options, parameters);
    playSFXForEveryone(fx.allSFX, {...options, fadeDurationSeconds: fx.allSFXFade});

    if (!props.player) return;

    setVFXParametersAndPlay(fx.playerVFX, {...options, players: [props.player]}, parameters);
    playSFXForPlayer(fx.playerSFX, props.player, {...options, fadeDurationSeconds: fx.playerSFXFade});

    const otherPlayers = getHzObj().world.getPlayers().filter((value) => value != props.player);
    setVFXParametersAndPlay(fx.othersVFX, {...options, players: otherPlayers}, parameters);
    playSFXForPlayers(fx.otherSFX, otherPlayers, {...options, fadeDurationSeconds: fx.otherSFXFade});
}

export function stopGameFX(fx: GameFX, player?: Player, HZ_OBJ?: Component) {
    stopVFXForEveryone(fx.allVFX);
    stopSFXForEveryone(fx.allSFX, {fadeDurationSeconds: fx.allSFXFade});
    if (player) {
        stopVFXForPlayer(fx.playerVFX, player);
        stopSFXForPlayer(fx.playerSFX, player, {fadeDurationSeconds: fx.playerSFXFade});

        if (!HZ_OBJ) {
            return;
        }

        const players = HZ_OBJ.world.getPlayers().filter((value) => value.id != player.id);

        if (fx.othersVFX) {
            stopVFXForPlayers(fx.othersVFX, players);
        }

        if (fx.otherSFX) {
            stopSFXForPlayers(fx.otherSFX, players, {fadeDurationSeconds: fx.otherSFXFade});
        }
    }
}

// FX
type TransformOpts = {
    position?: Vec3,
    rotation?: Quaternion,
    localOnly?: boolean,
}

// SFX
export type AudioOpts = {
    fadeDurationSeconds?: number; // defaults to 0 in Horizon
    audibilityMode?: AudibilityMode; // defaults to AudibleTo in Horizon
}

export const FULL_VOLUME = 1;
export const NO_VOLUME = 0;

export function setVolumeForPlayer(entity: EntityOrUndefined, player: Player, volume: number, opts: AudioOpts) {
    const audioGizmo = entity?.as(AudioGizmo);
    if (!audioGizmo) return;

    audioGizmo.volume.set(
        volume,
        {
            audibilityMode: opts.audibilityMode,
            fade: opts.fadeDurationSeconds ?? 0,
            players: [player]
        }
    );
}

export type PlayAudioOpts = AudioOpts & TransformOpts

export function playSFXForEveryone(entity: EntityOrUndefined, opts: PlayAudioOpts = {}) {
    playSFXInternal(entity, [], opts);
}

export function playSFXForPlayer(entity: EntityOrUndefined, player: Player, opts: PlayAudioOpts = {}) {
    playSFXInternal(entity, [player], opts);
}

export function playSFXForPlayers(entity: EntityOrUndefined, players: Player[], opts: PlayAudioOpts = {}) {
    if (players.length == 0) return;

    playSFXInternal(entity, players, opts);
}

function playSFXInternal(entity: EntityOrUndefined, players: Player[], opts: PlayAudioOpts) {
    const audioGizmo = entity?.as(AudioGizmo);
    if (!audioGizmo) return;

    if (opts.position) setPos(audioGizmo, opts.position, opts.localOnly);
    if (opts.rotation) setRot(audioGizmo, opts.rotation, opts.localOnly);

    doOrDelayOneFrame(!opts.position && !opts.rotation, () => audioGizmo.play({fade: opts.fadeDurationSeconds ?? 0, players: players, audibilityMode: opts.audibilityMode}));
}

export function stopSFXForEveryone(entity: EntityOrUndefined, opts: AudioOpts = {}) {
    stopSFXInternal(entity, [], opts);
}

export function stopSFXForPlayer(entity: EntityOrUndefined, player: Player, opts: AudioOpts = {}) {
    stopSFXInternal(entity, [player], opts);
}

export function stopSFXForPlayers(entity: EntityOrUndefined, players: Player[], opts: AudioOpts = {}) {
    if (players.length == 0) return;

    stopSFXInternal(entity, players, opts);
}

function stopSFXInternal(entity: EntityOrUndefined, players: Player[], opts: AudioOpts) {
    if (!entity) return;

    entity.as(AudioGizmo).stop({fade: opts.fadeDurationSeconds ?? 0, players: players, audibilityMode: opts.audibilityMode});
}

// VFX
type ParticleOpts = {
    oneShot?: boolean // defaults to false in Horizon
}

type PlayParticleOpts = ParticleOpts & TransformOpts

export function playVFXForEveryone(entity: EntityOrUndefined, opts: PlayParticleOpts = {}) {
    playVFXInternal(entity, opts);
}

export function playVFXForPlayer(entity: EntityOrUndefined, player: Player, opts: PlayParticleOpts = {}) {
    playVFXInternal(entity, opts, [player]);
}

export function playVFXForPlayers(entity: EntityOrUndefined, opts: PlayParticleOpts = {}, players: Player[]) {
    if (players.length == 0) return;

    playVFXInternal(entity, opts, players);
}

function playVFXInternal(entity: EntityOrUndefined, opts: PlayParticleOpts, players?: Player[]) {
    let particleGizmo: ParticleGizmo | undefined;
    const multi = entity?.getComponents(VFXMultiOneshots);
    if (multi?.length) {
        particleGizmo = multi[0].next(opts.oneShot);
    } else {
        particleGizmo = entity?.as(ParticleGizmo);
    }
    if (!particleGizmo) return;

    if (!opts.localOnly) {
        // this call is optimized with a built in set and rotate... but doesn't support localOnly at the moment.
        playVFXInternal2(particleGizmo, opts, players);
        return;
    }

    if (opts.position) setPos(particleGizmo, opts.position, opts.localOnly);
    if (opts.rotation) setRot(particleGizmo, opts.rotation, opts.localOnly);

    const options: ParticleFXPlayOptions = {oneShot: opts.oneShot};
    if (players && players.length > 0) {
        options.players = players;
    }

    doOrDelayOneFrame(!opts.position && !opts.rotation, () => particleGizmo!.play(options));
}

// Retire playVFXInternal once we also support local only transform parameters
function playVFXInternal2(particleGizmo: ParticleGizmo, opts: PlayParticleOpts, players?: Player[]) {
    setVFXParameterValuesAndPlay(particleGizmo, {
        ...opts,
        players,
        parameters: []
    }).then(
        _ => {
        },
        error => console.error(`VFX[${particleGizmo.name.get()}] failed playVFXInternal2: ${error}`)
    );
}

export function stopVFXForEveryone(entity: EntityOrUndefined) {
    stopVFXInternal(entity, []);
}

export function stopVFXForPlayer(entity: EntityOrUndefined, player: Player) {
    stopVFXInternal(entity, [player]);
}

export function stopVFXForPlayers(entity: EntityOrUndefined, players: Player[]) {
    if (players.length == 0) return;

    stopVFXInternal(entity, players);
}

function stopVFXInternal(entity: EntityOrUndefined, players: Player[]) {
    if (!entity) return;

    const options: ParticleFXStopOptions = {};
    if (players.length > 0) {
        options.players = players;
    }
    entity.as(ParticleGizmo).stop(options);
}

//  VFX Parameters
export type ValidVFXParameterTypes = number | boolean | Vec3 | Vec2 | Color | ColorWithAlpha;

export type VFXParameterData = {
    key: string,
    value: ValidVFXParameterTypes
}

export function createVFXParameter(name: string, value: ValidVFXParameterTypes): VFXParameterData {
    return {key: name, value: value};
}

// TODO - @fooj whack the onComplete

export async function setVFXParameter(vfx: EntityOrUndefined, key: string, value: ValidVFXParameterTypes) {
    return setVFXParameters(vfx, [[key, value]]);
}

export async function setVFXParameters(vfx: EntityOrUndefined, parameters?: (VFXParameterData | [string, ValidVFXParameterTypes])[], onComplete?: () => void) {
    const vfxParametersArray = getVFXParametersArray(parameters);
    const particleGizmo = vfx?.as(ParticleGizmo);
    if (!particleGizmo || vfxParametersArray.length == 0) {
        onComplete?.();
        return;
    }

    if (DEBUG_VFX_LOGS_ENABLED) console.log(`${toStringSafe(vfx)} setting ${vfxParametersArray?.length} properties:\n${vfxParametersArray.map(vfxParameter => `${vfxParameter.name}: ${vfxParameter.value}`).join('\n')}`);

    return setVFXParameterValues(particleGizmo, {parameters: vfxParametersArray})
        .then(() => onComplete?.())
        .catch(error => console.error(`VFX[${vfx?.name.get()}] Failed to setAllVFXParameters: ${error}`));
}

export function setVFXParametersAndPlay(vfx: EntityOrUndefined, options: Partial<ParticleFXSetParametersAndPlayOptions>, parameters?: (VFXParameterData | [string, ValidVFXParameterTypes])[]) {
    const vfxParametersArray = getVFXParametersArray(parameters);
    const particleGizmo = vfx?.as(ParticleGizmo);
    if (!particleGizmo) {
        return;
    }

    if (DEBUG_VFX_LOGS_ENABLED) console.log(`${toStringSafe(vfx)} setting ${vfxParametersArray?.length} properties and playing:\n${vfxParametersArray.map(vfxParameter => `${vfxParameter.name}: ${vfxParameter.value}`).join('\n')}`);

    return setVFXParameterValuesAndPlay(particleGizmo, {...options, parameters: vfxParametersArray})
        .catch(error => console.error(`VFX[${vfx?.name.get()}] Failed to setVFXParametersAndPlay: ${error}`));
}

function getVfxParameterType(value: ValidVFXParameterTypes): number | boolean | number[] {
    if (typeof value == 'number' || typeof value == 'boolean') return value;
    if (value instanceof Vec2) return [value.x, value.y];
    if (value instanceof Vec3) return [value.x, value.y, value.z];
    if (value instanceof Color) return [value.r, value.g, value.b];
    if (value instanceof ColorWithAlpha) return [value.r, value.g, value.b, value.a];
    throw Error(`Unsupported ValidVFXParameterTypes: ${value}`);
}

export function getVFXParametersArray(parameters?: (VFXParameterData | [string, ValidVFXParameterTypes])[]) {
    if (!parameters) return [];
    return parameters.map(parameter => Array.isArray(parameter) ? {key: parameter[0], value: parameter[1]} : parameter)
        .filter(data => !isEmpty(data.key))
        .map(parameter => ({
                name: parameter.key.trim(),
                value: getVfxParameterType(parameter.value)
            })
        );
}

export async function setVFXParameterValues(particleGizmo: ParticleGizmo, options: ParticleFXSetParametersOptions) {
    let paramOptions : ParticleFXSetParameterOptions = {players: options.players};
    let promises : Promise<void>[] = [];

    options.parameters.forEach(parameter => {
        promises.push(particleGizmo.setVFXParameterValue(parameter.name, parameter.value, paramOptions));
    });

    return Promise.all(promises);
}

export async function setVFXParameterValuesAndPlay(particleGizmo: ParticleGizmo, options: ParticleFXSetParametersAndPlayOptions) {
    let paramValues : ParticleFXSetParametersOptions = {players: options.players, parameters: options.parameters};
    let promises : Promise<void>[] = [];

    return setVFXParameterValues(particleGizmo, paramValues).then( () => {
        particleGizmo.position.set(options.position ?? particleGizmo.position.get());
        particleGizmo.rotation.set(options.rotation ?? particleGizmo.rotation.get());
        return particleGizmo.play({oneShot: options.oneShot, players: options.players});
    });
}
