/**
 * SelectBox Component - Simple select dropdown
 */
import { defineComponent } from '../core/component.js';
import { html, each } from '../core/template.js';

export default defineComponent('x-select-box', {
    props: {
        options: [],
        value: ''
    },

    methods: {
        handleChange(e) {
            // Update value and dispatch custom event
            const newValue = e.target.value;
            this.props.value = newValue;

            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,  // Allow event to cross shadow DOM boundaries
                detail: { value: newValue }
            }));
        }
    },

    template() {
        // Handle both arrays and JSON strings for options
        let optionsList = this.props.options;

        if (typeof optionsList === 'string') {
            try {
                optionsList = JSON.parse(optionsList);
            } catch (e) {
                optionsList = [];
            }
        }

        // Ensure options is an array
        if (!Array.isArray(optionsList)) {
            optionsList = [];
        }

        // Convert value to string for comparison (since HTML attributes are strings)
        const valueStr = String(this.props.value);

        return html`
            <select on-change="handleChange" value="${this.props.value}">
                ${each(optionsList, option => {
                    const optionStr = String(option);
                    return html`<option value="${optionStr}">${option}</option>`;
                })}
            </select>
        `;
    },

    styles: `
        select {
            font-family: inherit;
            font-size: 14px;
            padding: 8px;
            border-radius: 4px;

            /* Use CSS variables for theming */
            background-color: var(--input-bg, white);
            border: 1px solid var(--input-border, #ddd);
            color: var(--input-text, #000);
        }

        select:focus {
            outline: none;
            border-color: var(--input-focus-border, #0066cc);
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        select:hover:not(:disabled) {
            background-color: var(--input-hover-bg, #f5f5f5);
        }
    `
});
