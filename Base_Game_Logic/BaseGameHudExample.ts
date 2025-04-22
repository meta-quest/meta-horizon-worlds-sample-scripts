// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Color, Component, PropTypes, TextureAsset } from 'horizon/core';
import { IHudInstance } from 'IHudInstance';
import { UITexture } from "Utils";
import { Binding, Text, UIComponent, View } from "horizon/ui";
import { PlayerSaveData, PlayerUnsavedData } from 'PlayerData';
import { PooledEntity } from 'PooledEntity';

class BaseGameHudExample extends PooledEntity<typeof BaseGameHudExample> implements IHudInstance{
  static propsDefinition = {
    ...PooledEntity.propsDefinition,
    ammoUI: { type: PropTypes.Entity },
    lowAmmoThreshold: { type: PropTypes.Number, default: 5 },
    hpUI: { type: PropTypes.Entity },
    lowHpThreshold: { type: PropTypes.Number, default: 15 },
    lowResourceColor: { type: PropTypes.Color, default: new Color(0.7, 0.1, 0.1) },
  };

  private ammoUi: AmmoHud | undefined = undefined;
  private hpUi: HealthHud | undefined = undefined;
  private ready: boolean = false;

  BStart() {
    super.BStart();
    this.ammoUi = this.props.ammoUI?.getComponents(AmmoHud)[0];
    this.hpUi = this.props.hpUI?.getComponents(HealthHud)[0];
    this.ready = true;
  }

  public updateHud(data: PlayerSaveData & PlayerUnsavedData) {
    const ammoColor = data.ammo <= this.props.lowAmmoThreshold ? this.props.lowResourceColor : Color.white;
    const hpColor = data.hp <= this.props.lowHpThreshold ? this.props.lowResourceColor : Color.white;

    this.ammoUi?.updateAmmo(data.ammo, ammoColor);
    this.hpUi?.updateHealth(data.hp, hpColor);
  }
}
Component.register(BaseGameHudExample);

///////////////////////////////////////////////////////////////////////////////

class AmmoHud extends UIComponent<typeof AmmoHud> {
  static propsDefinition = {
    textureAsset: { type: PropTypes.Asset },
  }

  panelHeight = 80;
  panelWidth = 200;

  strPlayerAmmoTotal = new Binding<string>('0');
  colorAmmo = new Binding<Color>(Color.white);

  public updateAmmo(ammo: number, color: Color) {
    console.log("Updating ammo to: ", ammo);
    this.strPlayerAmmoTotal.set(ammo.toString());
    this.colorAmmo.set(color);
  }

  public initializeUI() {
    return View({
      children: [
        View({
          children: [
            UITexture.fromAsset(this.props.textureAsset!, { height: 64, width: 64 }),
          ],
          style: {
            display: 'flex',
            width: 80,
          },
        }),
        View({
          children: [
            Text({
              text: this.strPlayerAmmoTotal, style: {
                fontFamily: "Optimistic",
                color: this.colorAmmo,
                fontWeight: "700",
                fontSize: 40,
              }
            }),
          ],
          style: {
            display: 'flex',
            flexGrow: 1,
          },
        })
      ],
      style: {
        position: 'absolute',
        height: 70,
        width: 120,
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#rgba(0,0,0,0)',
        left: 40,
        top: '20%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        transform: [{ scale: 1.0 }],
      },
    });
  }
}
UIComponent.register(AmmoHud);

///////////////////////////////////////////////////////////////////////////////

class HealthHud extends UIComponent<typeof HealthHud> {
  static propsDefinition = {
    textureAsset: { type: PropTypes.Asset },
  }

  panelHeight = 80;
  panelWidth = 200;

  strPlayerHealthTotal = new Binding<string>('100');
  colorHealth = new Binding<Color>(Color.white);

  public updateHealth(hp: number, color: Color) {
    console.log("Updating health to: ", hp);
    this.strPlayerHealthTotal.set(hp.toString());
    this.colorHealth.set(color);
  }

  public initializeUI() {
    return View({
      children: [
        View({
          children: [
            Text({
              text: this.strPlayerHealthTotal, style: {
                fontFamily: "Optimistic",
                color: this.colorHealth,
                fontWeight: "700",
                fontSize: 40,
              }
            }),
          ],
          style: {
            display: 'flex',
            flexGrow: 1,
            paddingRight: 10,
          },
        }),
        View({
          children: [
            UITexture.fromAsset(this.props.textureAsset!, { height: 64, width: 64 }),
          ],
          style: {
            display: 'flex',
            width: 80,
          },
        })
      ],
      style: {
        position: 'absolute',
        height: 70,
        width: 120,
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#rgba(0,0,0,0)',
        right: 30,
        top: '20%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        transform: [{ scale: 1.0 }],
      },
    });
  }
}
UIComponent.register(HealthHud);
