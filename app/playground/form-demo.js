/**
 * Form Demo - Demonstrates form handling and validation
 */
import { defineComponent } from '../core/component.js';
import { html, when } from '../core/template.js';
import { notify } from '../core/utils.js';

export default defineComponent('form-demo', {
    data() {
        return {
            username: '',
            email: '',
            errors: {},
            submitted: false
        };
    },

    methods: {
        handleSubmit(e) {
            e.preventDefault();

            // Validation
            const errors = {};
            if (!this.state.username || this.state.username.length < 3) {
                errors.username = 'Username must be at least 3 characters';
            }
            if (!this.state.email || !this.isValidEmail(this.state.email)) {
                errors.email = 'Please enter a valid email';
            }

            this.state.errors = errors;

            if (Object.keys(errors).length === 0) {
                notify(`Form submitted! User: ${this.state.username}`, 'info', 3);
                this.state.submitted = true;
                setTimeout(() => {
                    this.state.submitted = false;
                    this.state.username = '';
                    this.state.email = '';
                }, 2000);
            } else {
                notify('Please fix form errors', 'error', 3);
            }
        },

        handleUsernameChange(e) {
            this.state.username = e.target.value;
            if (this.state.errors.username) {
                delete this.state.errors.username;
                this.state.errors = { ...this.state.errors };
            }
        },

        handleEmailChange(e) {
            this.state.email = e.target.value;
            if (this.state.errors.email) {
                delete this.state.errors.email;
                this.state.errors = { ...this.state.errors };
            }
        },

        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
    },

    template() {
        return html`
            <h2>Form Demo</h2>
            <p>Form handling with validation</p>

            ${when(this.state.submitted,
                html`<div style="padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 15px;">
                    ✓ Form submitted successfully!
                </div>`,
                html`<form on-submit="handleSubmit">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Username:</label>
                        <input
                            type="text"
                            value="${this.state.username}"
                            on-input="handleUsernameChange"
                            style="width: 100%; box-sizing: border-box;">
                        ${when(this.state.errors.username,
                            html`<div style="color: #dc3545; font-size: 0.85em; margin-top: 3px;">
                                ${this.state.errors.username}
                            </div>`,
                            html``
                        )}
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Email:</label>
                        <input
                            type="email"
                            value="${this.state.email}"
                            on-input="handleEmailChange"
                            style="width: 100%; box-sizing: border-box;">
                        ${when(this.state.errors.email,
                            html`<div style="color: #dc3545; font-size: 0.85em; margin-top: 3px;">
                                ${this.state.errors.email}
                            </div>`,
                            html``
                        )}
                    </div>

                    <button type="submit">Submit</button>
                </form>`
            )}
        `;
    },

    styles: `
        :host {
            display: block;
        }
    `
});
