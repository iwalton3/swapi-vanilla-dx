/**
 * LogoffAll - Confirmation page for logging off all sessions
 */
import { defineComponent } from '../core/component.js';
import { html } from '../core/template.js';
import login from './auth.js';
import { notify } from '../core/utils.js';
import '../components/icon.js';

export default defineComponent('auth-logoff-all', {
    methods: {
        async logoffAll() {
            const state = login.state;
            await state.logoff_all();
            notify('Logoff successful.');
            if (window.router) {
                window.router.navigate('/');
            }
        }
    },

    template() {
        return html`
            <div>
                <h1>Logoff All</h1>
                <p>Are you sure? This will log you off from every device you are currently using.</p>
                <p>
                    <x-icon icon="leave" alt="logoff all"></x-icon>
                    <button class="link" on-click="logoffAll">Log Off All Browsers</button>
                </p>
                <p>
                    <x-icon icon="cancel" alt="cancel"></x-icon>
                    <router-link to="/" class="link">Cancel</router-link>
                </p>
            </div>
        `;
    }
});
