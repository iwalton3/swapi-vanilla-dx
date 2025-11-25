/**
 * Notification List Component
 * Displays toast notifications in the bottom-right corner
 */
import { defineComponent } from '../core/component.js';
import { html, when, each, raw } from '../core/template.js';
import { notifications } from '../core/utils.js';
import './icon.js';

export default defineComponent('notification-list', {
    data() {
        return {
            notifications: []
        };
    },

    mounted() {
        // Subscribe to notifications store
        this.unsubscribe = notifications.subscribe(state => {
            this.state.notifications = state.list;
        });
    },

    unmounted() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    },

    template() {
        if (this.state.notifications.length === 0) {
            return html``;
        }

        return html`
            <div class="notify-list">
                ${each(this.state.notifications, notification => html`
                    <div class="notify ${notification.severity}">
                        <x-icon icon="${notification.severity}" alt="${notification.severity}"></x-icon>
                        <span role="alert">${notification.message}</span>
                    </div>
                `)}
            </div>
        `;
    }
});
