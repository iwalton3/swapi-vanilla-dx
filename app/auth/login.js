/**
 * Login Page
 */
import { defineComponent } from '../lib/framework.js';
import { html } from '../lib/framework.js';
import './login-component.js';

export default defineComponent('auth-login', {
    template() {
        return html`
            <div>
                <h1>Login</h1>
                <login-component after="/"></login-component>
            </div>
        `;
    }
});
