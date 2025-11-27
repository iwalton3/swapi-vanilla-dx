/**
 * AuthError - Error page when permission is missing
 */
import { defineComponent } from '../lib/framework.js';
import { html } from '../lib/framework.js';
import './login-component.js';

export default defineComponent('auth-error', {
    data() {
        return {
            message: ''
        };
    },

    mounted() {
        // Get message from URL query parameters
        if (window.router && window.router.currentRoute) {
            const query = window.router.currentRoute.state.query;
            if (query && query.message) {
                this.state.message = query.message;
            } else {
                this.state.message = 'You need to log in to access this page.';
            }
        } else {
            this.state.message = 'You need to log in to access this page.';
        }
    },

    template() {
        return html`
            <div>
                <h1>Permission Denied</h1>
                <p>${this.state.message || 'You need to log in to access this page.'}</p>
                <div class="section">
                    <h3>Login</h3>
                    <login-component></login-component>
                </div>
            </div>
        `;
    }
});
