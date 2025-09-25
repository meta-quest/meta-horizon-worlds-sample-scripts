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

// Pool Class
export class Pool<T> {
    all: T[] = [];
    available: T[] = [];
    active: T[] = [];

    hasAvailable() {
        return this.available.length > 0;
    }

    getNextAvailable() {
        if (this.hasAvailable()) {
            const available = this.available.shift()!;
            if (!this.active.includes(available)) {
                this.active.push(available);
            }
            return available;
        }
    }

    addToPool(t: T) {
        if (!this.all.includes(t)) {
            this.all.push(t);
        }

        if (!this.available.includes(t)) {
            this.available.push(t);
        }
    }

    returnToPool(t: T) {
        if (this.active.includes(t)) {
            this.active.splice(this.active.indexOf(t), 1);
        }
        if (!this.available.includes(t)) {
            this.available.push(t);
        }
    }

    deleteFromPool(t: T) {
        if (this.available.includes(t)) {
            this.available.splice(this.available.indexOf(t), 1);
        }

        if (this.active.includes(t)) {
            this.active.splice(this.active.indexOf(t), 1);
        }

        if (this.all.includes(t)) {
            this.all.splice(this.all.indexOf(t), 1);
        }
    }

    resetAvailability() {
        this.available = this.all.slice();
    }
}
