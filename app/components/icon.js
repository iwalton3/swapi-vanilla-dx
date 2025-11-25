/**
 * Icon Component - Displays icons with retina support
 */
import { defineComponent } from '../core/component.js';
import { html } from '../core/template.js';

export default defineComponent('x-icon', {
    props: {
        icon: '',
        alt: ''
    },

    template() {
        return html`
            <img src="${`icons-sm/${this.props.icon}.png`}"
                 srcset="${`icons-sm/${this.props.icon}2x.png 2x`}"
                 alt="${this.props.alt}">
        `;
    }
});
