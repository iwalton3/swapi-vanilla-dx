/**
 * Notification Demo - Demonstrates notification system
 */
import { defineComponent } from '../core/component.js';
import { html, each } from '../core/template.js';
import { notify } from '../core/utils.js';

export default defineComponent('notification-demo', {
    data() {
        return {
            message: 'Test notification',
            severity: 'info',
            duration: 3
        };
    },

    methods: {
        showNotification() {
            notify(this.state.message, this.state.severity, this.state.duration);
        },

        showInfo() {
            notify('This is an info message', 'info', 3);
        },

        showSuccess() {
            notify('Operation completed successfully!', 'success', 3);
        },

        showWarning() {
            notify('Warning: Please review your settings', 'warning', 4);
        },

        showError() {
            notify('Error: Something went wrong', 'error', 5);
        },

        showMultiple() {
            notify('First notification', 'info', 3);
            setTimeout(() => notify('Second notification', 'success', 3), 500);
            setTimeout(() => notify('Third notification', 'warning', 3), 1000);
        },

        handleMessageChange(e) {
            this.state.message = e.target.value;
        },

        handleSeverityChange(e) {
            this.state.severity = e.target.value;
        },

        handleDurationChange(e) {
            this.state.duration = parseInt(e.target.value) || 3;
        }
    },

    template() {
        return html`
            <h2>Notification Demo</h2>
            <p>Trigger various notification types</p>

            <h3>Quick Actions</h3>
            <div class="controls">
                <button on-click="showInfo">Info</button>
                <button on-click="showSuccess" style="background: #28a745;">Success</button>
                <button on-click="showWarning" style="background: #ffc107;">Warning</button>
                <button on-click="showError" style="background: #dc3545;">Error</button>
                <button on-click="showMultiple" class="secondary">Show Multiple</button>
            </div>

            <h3>Custom Notification</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">Message:</label>
                <input
                    type="text"
                    value="${this.state.message}"
                    on-input="handleMessageChange"
                    style="width: 100%; box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="display: block; margin-bottom: 5px;">Severity:</label>
                    <select on-change="handleSeverityChange" value="${this.state.severity}" style="width: 100%;">
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 5px;">Duration (seconds):</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value="${this.state.duration}"
                        on-input="handleDurationChange"
                        style="width: 100%; box-sizing: border-box;">
                </div>
            </div>

            <button on-click="showNotification" style="width: 100%;">Show Custom Notification</button>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        h3 {
            margin-top: 20px;
            margin-bottom: 10px;
        }
    `
});
