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

import {Asset, TextureAsset} from 'horizon/core';
import {ImageSource} from 'horizon/ui';

export type AssetData = {
    asset: AssetEx,
    xsAsset?: AssetEx,
    displayName?: string,
}

export type AssetIdAndVersion = {
    id: bigint
    versionId: bigint
}

export const LATEST_VERSION_ID_STR = '0';

/**
 * This is a mechanical way of updating the asset versions.
 *
 * To add asset versions:
 *
 * 1. Introduce new parameter to the constructors for classes that derive from AssetExData (i.e. AssetEx and TextureImageAssetEx)
 * 2. Call super() on the constructors with the new versionId param that you just added.
 * 3. Fix every compilation breakage in the code, with the desired new versions of the assets. This step purposely requires populating every asset version
 * 4. Test the game
 *
 * To remove asset versions:
 *
 * 1. Refactor -> Change Signature on the constructors of the classes that derive from AssetExData (i.e. AssetEx and TextureImageAssetEx), removing any old version fields from the constructor.
 */
class AssetExData {
    public assetId: bigint;
    public versionId: bigint;

    protected constructor(assetId: string, versionId?: string) {
        this.assetId = BigInt(assetId);
        this.versionId = BigInt(versionId ?? LATEST_VERSION_ID_STR);
    }

    getAssetIdAndVersion(): AssetIdAndVersion {
        return {
            id: this.assetId,
            versionId: this.versionId
        };
    }
}

export class AssetEx extends AssetExData {
    static new(assetId: string) {
        return new AssetEx(assetId);
    }

    static latest(assetId: string) {
        return new AssetEx(assetId, '0');
    }

    getAsset() {
        const idAndVersionId = this.getAssetIdAndVersion();
        return new Asset(idAndVersionId.id, idAndVersionId.versionId);
    }
}

const TEXTURE_ASSET_IMAGE_SOURCE_CACHE = new Map<string, ImageSource>();

export class TextureImageAssetEx extends AssetExData {
    readonly imageSource!: ImageSource;

    static new(assetId: string) {
        return new TextureImageAssetEx(assetId);
    }

    static latest(assetId: string) {
        return new TextureImageAssetEx(assetId, '0');
    }

    private constructor(assetId: string, versionId?: string) {
        super(assetId, versionId);

        if (TEXTURE_ASSET_IMAGE_SOURCE_CACHE.has(assetId)) {
            this.imageSource = TEXTURE_ASSET_IMAGE_SOURCE_CACHE.get(assetId)!;
        }

        const idAndVersionId = this.getAssetIdAndVersion();
        this.imageSource = ImageSource.fromTextureAsset(new TextureAsset(idAndVersionId.id, idAndVersionId.versionId));
        TEXTURE_ASSET_IMAGE_SOURCE_CACHE.set(assetId, this.imageSource);
    }
}
