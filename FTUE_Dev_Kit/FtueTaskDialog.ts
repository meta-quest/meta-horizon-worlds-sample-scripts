// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueTaskUI } from 'FtueTask';
import { AudioGizmo, Player, PropTypes, TextureAsset} from 'horizon/core';
import { UIComponent, View, Text, Pressable, Callback, Image, ImageSource, TextStyle, ViewStyle, UINode, Binding } from "horizon/ui";

export class FtueTaskDialog extends FtueTaskUI<typeof FtueTaskDialog> {
  static propsDefinition = {
    ...FtueTaskUI.propsDefinition,
    titleText: {type: PropTypes.String},
    messageText: {type: PropTypes.String},
    imageAssetId: {type: PropTypes.String},
    buttonText: {type: PropTypes.String},
    dialogAppearSfx: {type: PropTypes.Entity},
  };

  public panelWidth = 720;
  public panelHeight = 720;

  titleBinding: Binding<string> = new Binding<string>("TITLE");
  descriptionBinding: Binding<string> = new Binding<string>("DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION DESCRIPTION ");
  imageBinding: Binding<ImageSource> = new Binding<ImageSource>(ImageSource.fromTextureAsset(new TextureAsset(BigInt(745435914391408))));
  hasImage: Binding<boolean> = new Binding<boolean>(true);

  private player: Player | undefined;

  start() {
    super.start();
    this.entity.visible.set(false);
  }

  onTaskStart(player: Player): void {
    this.entity.visible.set(true);
    this.props.dialogAppearSfx?.as(AudioGizmo).play();
    this.player = player;

    this.titleBinding.set(this.props.titleText, [player]);
    this.descriptionBinding.set(this.props.messageText, [player]);

    if(this.props.imageAssetId.length > 0){
      this.imageBinding.set(ImageSource.fromTextureAsset(new TextureAsset(BigInt(this.props.imageAssetId))), [player]);
      this.hasImage.set(true, [player]);
    } else {
      this.hasImage.set(false, [player]);
    }
  }

  onTaskComplete(player: Player): void {
    this.entity.visible.set(false);
  }

  completeTaskWithPlayer()
  {
    this.complete(this.player!);
  }

  initializeUI() {
    return View({
      children: [
        Text({ text: this.titleBinding, style: titleTextStyle }),
        UINode.if((this.props.imageAssetId.length > 0),
          Image({ source: this.imageBinding, style: imageStyle }),
        ),
        Text({text: this.descriptionBinding, style: descriptionTextStyle}),
        Pressable({
          children: Text({
            text: this.props.buttonText,
          }),
          onClick: this.completeTaskWithPlayer.bind(this),
          style: buttonStyle,
        })
      ],
      style: viewStyle
    });
  }
}
UIComponent.register(FtueTaskDialog);

// Custom UI code
const viewStyle: ViewStyle = {
  top: '5%',
  left: '20%',
  width: '60%',
  height: '90%',
  padding: 10,
  alignContent: 'center',
  alignItems: 'center',
  backgroundColor: 'beige',
  borderColor: 'white',
  borderRadius: 10,
  borderWidth: 7,
}

const textStyle: TextStyle = {
  color: "black",
  textAlign: "center",
  fontFamily: 'Roboto',
  fontWeight: "bold",
  position: "relative",
  margin: 6
}

const titleTextStyle: TextStyle = {
  ...textStyle,
  fontSize: 80,
}

const descriptionTextStyle: TextStyle = {
  ...textStyle,
  fontSize: 50,
}

const imageStyle: ViewStyle = {
  position: "relative",
  height: "50%",
  aspectRatio: 1/1,
}

const buttonStyle: ViewStyle = {
  ...textStyle,
  position: "relative",
  borderRadius: 10,
  borderWidth: 3,
  borderColor: "black",
  backgroundColor: "gray",
  height: "10%",
  width: "50%",
  alignItems: "center",
  justifyContent: "center",
}
