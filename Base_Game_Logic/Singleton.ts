// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>>

import { Behaviour } from 'Behaviour';
import { ComponentWithConstructor, SerializableState } from 'horizon/core';

type SingletonT<T> = {
  new() : T;
  instance: T;
};

export abstract class Singleton<T extends ComponentWithConstructor<Record<string, unknown>>, TSerializableState extends
SerializableState = SerializableState> extends Behaviour<T> {

  // <TODO>
  // (On creating a new Singleton class) The derived class must declare an instance of its type.
  // It also needs to be assigned to an empty object
  // </TODO>

  public static getInstance<T>(this: SingletonT<T>) : T {
    if (!this.instance) {
      this.instance = new this();
    }
    return this.instance;
  }
}
