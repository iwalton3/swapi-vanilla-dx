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
        // Map severity names to actual icon file names
        const iconMap = {
            'success': 'info',  // Use info icon for success (no dedicated success icon)
            'warning': 'warn',  // Map warning to warn.png
            'info': 'info',
            'error': 'error'
        };

        const iconName = iconMap[this.props.icon] || this.props.icon;

        return html`
            <img src="${`icons-sm/${iconName}.png`}"
                 srcset="${`icons-sm/${iconName}2x.png 2x`}"
                 alt="${this.props.alt}">
        `;
    }
});
