// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

export enum StateCallbacks{
  None,
  OnEnter,
  OnUpdate,
  OnExit,
}

export class StateCallbackConfig{
  public callbackType;
  public callback:Function;

  constructor(callbackType:StateCallbacks, callback:Function) {
    this.callbackType = callbackType;
    this.callback = callback;
  }
}

export class NextStateEdges
{
  public condition:Function;
  public possibleStates:[string, number][];

  constructor(condition:Function, possibleStates = Array<[string, number]>(0)){
    this.condition = condition;
    this.possibleStates = possibleStates;
  }
}

export class StateConfigRecord{
  public name:string;
  public callbacks:StateCallbackConfig[];
  public nextStateEdges:NextStateEdges[];

  constructor(name:string, callbacks = Array<StateCallbackConfig>(0), nextStateEdges = Array<NextStateEdges>(0)) {
    this.name = name;
    this.callbacks = callbacks;
    this.nextStateEdges = nextStateEdges;
  }
}

class State{
  // State
  public name:string;
  public onEnterCallback:Function;
  public onUpdateCallback:Function;
  public onExitCallback:Function;

  // Flow
  public nextStateEdges:NextStateEdges[];

  constructor(name:string,
    onEnterCallback = function(){}, onUpdateCallback = function(deltaTime:Number){}, onExitCallback = function(){},
    nextStateEdges = Array<NextStateEdges>(0)) {
      this.name = name;
      this.onEnterCallback = onEnterCallback;
      this.onUpdateCallback = onUpdateCallback;
      this.onExitCallback = onExitCallback;
      this.nextStateEdges = nextStateEdges;
    }
  }

  export class StateMachine{
    private stateMap:Map<string, State>;
    private isLogging:boolean;
    public currentState:State | undefined;
    public isActive:boolean;
    public timer:number;

    constructor(stateArray:string[], configArray:StateConfigRecord[], enableLogging = false) {
      this.stateMap = new Map<string, State>();
      stateArray.forEach(stateName => {
        this.stateMap.set(stateName, new State(stateName));
      });
      this.isActive = false;
      this.timer = -1;
      this.isLogging = enableLogging;

      this.config(configArray);
    }

    public changeState(stateName:string) {
      if (this.isLogging)
        console.log("State: ", this.currentState?.name, "->", stateName);

      if (this.currentState?.name == stateName)
        return;

      var nextState = this.stateMap.get(stateName);

      if (nextState != undefined) {
        // Pause while we change state (Good practice, should be single threaded)
        this.isActive = false;

        // Cleanup last state
        if (this.currentState != undefined) {
          this.currentState.onExitCallback();
        }

        // Prime next state
        this.currentState = nextState
        this.currentState.onEnterCallback();

        // Reset timer
        this.timer = 0;

        // Activate
        this.isActive = true;
      } else {
        console.warn("State not found: " + stateName);
      }
    }

    public update(deltaTime:number) {
      // Don't update unecessarily
      if(!this.isActive || this.currentState == undefined){
        return;
      }

      // Update the timer
      this.timer += deltaTime;

      // Update the current state
      this.currentState.onUpdateCallback(deltaTime);

      // Check for next state conditions
      for (var i = 0; i < this.currentState.nextStateEdges.length; i++) {
        if (this.currentState.nextStateEdges[i].condition()) {
          this.chooseNextState(this.currentState.nextStateEdges[i].possibleStates);
          return;
        }
      }
    }

    private config(configArray:StateConfigRecord[]) {
      configArray.forEach( config => {
        var state = this.stateMap.get(config.name);

        if (state != undefined) {
          config.callbacks.forEach((callbackConfig) => {
            switch (callbackConfig.callbackType) {
              case StateCallbacks.OnEnter:
              state!.onEnterCallback = callbackConfig.callback;
              break;
              case StateCallbacks.OnUpdate:
              state!.onUpdateCallback = callbackConfig.callback;
              break;
              case StateCallbacks.OnExit:
              state!.onExitCallback = callbackConfig.callback;
              break;
            }
          });
          state.nextStateEdges = config.nextStateEdges;
        }
      });
    }

    private chooseNextState(possibleStates:[string, number][]){
      // Deal with the easy cases
      if (this.currentState == undefined || possibleStates.length == 0){
        this.currentState = undefined;
        this.isActive = false;
        return;
      } else if (possibleStates.length == 1){
        this.changeState(possibleStates[0][0]);
        return;
      }

      // Calculate the total odds of all the states
      var totalOdds = 0;
      possibleStates.forEach((state) => {
        totalOdds += state[1];
      });

      // Randomly select a state based on the odds
      var totalOdds = Math.random() * totalOdds;

      // Walk up the odds array and find the state that we should transition to
      for (var i = 0; i < possibleStates.length; i++) {
        totalOdds -= possibleStates[i][1];
        if (totalOdds <= 0){
          this.changeState(possibleStates[i][0]);
          return;
        }
      }

      console.error("Error: Something is very wrong with the state machine");
    }
  }
