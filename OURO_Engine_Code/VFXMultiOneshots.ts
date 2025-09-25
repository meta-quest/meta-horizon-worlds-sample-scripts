
import {Component, ParticleGizmo, PropTypes} from 'horizon/core';

/**
 * This class can be used in substitution of a single ParticleGizmo.
 *
 * Only use this for oneshots, as it controlling the lifecycle of many VFX is hard
 */
export class VFXMultiOneshots extends Component<typeof VFXMultiOneshots> {
    static propsDefinition = {
        vfx0: {type: PropTypes.Entity},
        vfx1: {type: PropTypes.Entity},
        vfx2: {type: PropTypes.Entity},
        vfx3: {type: PropTypes.Entity},
        vfx4: {type: PropTypes.Entity},
        vfx5: {type: PropTypes.Entity},
        vfx6: {type: PropTypes.Entity},
        vfx7: {type: PropTypes.Entity},
    };

    private allVFXs: ParticleGizmo[] = [];
    private i = 0;

    start() {
        this.allVFXs = [
            this.props.vfx0,
            this.props.vfx1,
            this.props.vfx2,
            this.props.vfx3,
            this.props.vfx4,
            this.props.vfx5,
            this.props.vfx6,
            this.props.vfx7
        ].map(prop => prop?.as(ParticleGizmo))
            .filter(prop => prop) as ParticleGizmo[];
    }

    next(oneshot?: boolean) {
        if (!oneshot) throw Error(`${this.entity.name}[VFXMultiOneshots] can only be used with oneshots`);

        const nextVFX = this.i;
        this.i = (this.i + 1) % this.allVFXs.length;
        return this.allVFXs[nextVFX];
    }
}

Component.register(VFXMultiOneshots);
