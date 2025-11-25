/**
 * LazySelectBox Component - Inline editable select
 * Shows value as text, becomes dropdown on hover/click
 */
import { defineComponent } from '../core/component.js';
import { html, each, when } from '../core/template.js';

export default defineComponent('x-lazy-select-box', {
    props: {
        options: [],
        value: ''
    },

    data() {
        return {
            focus: false,
            editing: false
        };
    },

    methods: {
        edit() {
            this.state.focus = true;
        },

        abandon() {
            this.state.focus = false;
        },

        commit(e) {
            // Stop the native change event from bubbling
            e.stopPropagation();

            const newValue = e.target.value;
            this.props.value = newValue;
            this.state.focus = false;
            this.state.editing = false;

            // Dispatch custom change event with detail
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                detail: { value: newValue }
            }));
        },

        startEditing() {
            this.state.editing = true;
        }
    },

    template() {
        const showSelect = this.state.focus || this.state.editing;

        // Parse options if they're a JSON string
        let optionsList = this.props.options;
        if (typeof optionsList === 'string') {
            try {
                optionsList = JSON.parse(optionsList);
            } catch (e) {
                optionsList = [];
            }
        }

        return when(showSelect, html`
            <span on-mouseenter="edit" on-click="edit" on-mouseleave="abandon">
                <select on-change="commit" on-click="startEditing">
                    ${each(optionsList, option => {
                        const selected = option === this.props.value ? true : undefined;
                        return html`<option value="${option}" selected="${selected}">${option}</option>`;
                    })}
                </select>
            </span>
        `, html`
            <span on-mouseenter="edit" on-click="edit" on-mouseleave="abandon">
                ${this.props.value}
            </span>
        `);
    }
});
