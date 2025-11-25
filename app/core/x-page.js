/**
 * Simple page wrapper component
 * Provides consistent page styling without the full header
 */
import { defineComponent } from './component.js';
import { html } from './template.js';

export default defineComponent('x-page', {
    template() {
        return html`
            <div class="page-content">
                <slot></slot>
            </div>
        `;
    },

    styles: `
        .page-content {
            margin: 0 auto;
            max-width: 700px;
            padding: 20px 0;
        }
    `
});
