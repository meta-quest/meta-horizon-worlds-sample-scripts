
import { CodeBlockEvents, Component, PropTypes, TriggerGizmo } from 'horizon/core';
import { playSFXForPlayer, stopSFXForPlayer } from 'UtilsFX';

export class SFXTriggerSpace extends Component<typeof SFXTriggerSpace> {
    static propsDefinition = {
        sfx: {type: PropTypes.Entity},
    };

    preStart() {
        if (!this.entity.as(TriggerGizmo)) throw Error('This component only works on TriggerGizmos');
        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, player => playSFXForPlayer(this.props.sfx, player));
        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitTrigger, player => stopSFXForPlayer(this.props.sfx, player));
    }

    start() {
    }
}

Component.register(SFXTriggerSpace);
