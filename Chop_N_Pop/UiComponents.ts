// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { loadImageFromTexture, type UITextureProps } from "GameUtils";
import { Color, ComponentWithConstructor, Entity, PropTypes, SerializableState } from "horizon/core";
import { Binding, Text, UIComponent, View } from "horizon/ui";

export class UiComponentsRegistry{
  private static componentMap:
      Map<bigint,
      UIComponent<
              ComponentWithConstructor<Record<string, unknown>>,
              SerializableState>>;

  static {
    UiComponentsRegistry.componentMap = new Map<
        bigint,
        UIComponent<
            ComponentWithConstructor<Record<string, unknown>>,
            SerializableState>>();
  }

  public static RegisterComponent(
      id: bigint,
      behaviour: UIComponent<
          ComponentWithConstructor<Record<string, unknown>>,
          SerializableState>) {
            UiComponentsRegistry.componentMap.set(id, behaviour);
  }

  public static GetComponent<TComponent>(entity: Entity | undefined | null): TComponent |
      undefined {
    if (entity == undefined || entity == null) {
      console.log("GetBehaviour: Entity is undefined or null");
      return undefined;
    }
    return UiComponentsRegistry.componentMap.get(entity.id) as unknown as TComponent;
  }

}

///////////////////////////////////////////////////////////////////////////////

export class AmmoHud extends UIComponent<UITextureProps> {
  panelHeight = 80;
  panelWidth = 200;
  static propsDefinition = {
    textureAsset: { type: PropTypes.Asset },
  };

  strPlayerAmmoTotal = new Binding<string>('0');
  colorAmmo = new Binding<Color>(Color.white);

  public updateAmmo(ammo: number, color : Color) {
    this.strPlayerAmmoTotal.set(ammo.toString());
    this.colorAmmo.set(color);
  }

  public initializeUI() {
    UiComponentsRegistry.RegisterComponent(this.entity.id, this);

    return View({
      children: [
        View({
          children: [
            loadImageFromTexture(this.props.textureAsset, { height: 64, width: 64 }),
          ],
          style: {
            display: 'flex',
            width: 80,
          },
        }),
        View({
          children: [
            Text({text: this.strPlayerAmmoTotal, style: {
              fontFamily: "Optimistic",
              color: this.colorAmmo,
              fontWeight: "700",
              fontSize: 40,
            }}),
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
        transform: [{scale: 1.0}],
      },
    });
  }
}
UIComponent.register(AmmoHud);

///////////////////////////////////////////////////////////////////////////////

export class HealthHud extends UIComponent<UITextureProps> {
  panelHeight = 80;
  panelWidth = 200;
  static propsDefinition = {
    textureAsset: { type: PropTypes.Asset },
  };

  strPlayerAmmoTotal = new Binding<string>('100');
  colorAmmo = new Binding<Color>(Color.white);

  public updateHealth(hp: number, color: Color) {
    this.strPlayerAmmoTotal.set(hp.toString());
    this.colorAmmo.set(color);
  }

  initializeUI() {
    UiComponentsRegistry.RegisterComponent(this.entity.id, this);

    return View({
      children: [
        View({
          children: [
            Text({text: this.strPlayerAmmoTotal, style: {
              fontFamily: "Optimistic",
              color: this.colorAmmo,
              fontWeight: "700",
              fontSize: 40,
            }}),
          ],
          style: {
            display: 'flex',
            flexGrow: 1,
            paddingRight: 10,
          },
        }),
        View({
          children: [
            loadImageFromTexture(this.props.textureAsset, { height: 64, width: 64 }),
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
        transform: [{scale: 1.0}],
      },
    });
  }
}
UIComponent.register(HealthHud);
