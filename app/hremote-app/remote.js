/**
 * Remote Control Component
 * Displays hierarchical action tree with sections and areas
 */

import { defineComponent } from '../lib/framework.js';
import { get_actions_tree } from '../api.js';
import { html, each, when } from '../lib/framework.js';
import RemoteButton from './remote-button.js';

export default defineComponent('remote-control', {
    data() {
        return {
            controls: []
        };
    },

    mounted() {
        this.loadControls();
    },

    methods: {
        async loadControls() {
            try {
                this.state.controls = await get_actions_tree();
            } catch (error) {
                console.error('Failed to load action tree:', error);
            }
        }
    },

    styles: `
        .section {
            margin-bottom: 5px;
            margin-top: 20px;
            padding-bottom: 2px;
            border-bottom: solid 1px;
            font-weight: bold;
            font-size: 30px;
        }

        .area {
            margin-bottom: 10px;
            clear: both;
            overflow: auto;
        }

        .buttons {
            float: right;
        }

        .buttons remote-button {
            display: inline-block;
            margin-left: 5px;
        }

        .title {
            font-size: 20px;
            line-height: 30px;
        }
    `,

    template() {
        return html`
            ${each(this.state.controls, (control, sectionNo) => {
                if (control.type === "section") {
                    return html`<div class="section">${control.name}</div>`;
                } else {
                    return html`
                        <div class="area">
                            <span class="title">${control.name}</span>
                            <span class="buttons">
                                ${each(control.actions, (action, actionNo) => html`
                                    <remote-button
                                        sectionNo="${sectionNo}"
                                        actionNo="${actionNo}"
                                        action="${action}">
                                    </remote-button>
                                `)}
                            </span>
                        </div>
                    `;
                }
            })}
        `;
    }
});
