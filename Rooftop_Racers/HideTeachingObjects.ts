// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import * as hz from 'horizon/core';
import { PropTypes} from 'horizon/core';

class HideTeachingObjects extends hz.Component<typeof HideTeachingObjects> {
  static propsDefinition = {
    target: { type: PropTypes.Entity },
    visible: { type: PropTypes.Boolean, default: false }
  };

  start() {
    const target = this.props.target!;
    target.visible.set(this.props.visible)
  }
}
hz.Component.register(HideTeachingObjects);
