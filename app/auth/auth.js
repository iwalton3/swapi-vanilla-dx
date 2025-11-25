/**
 * Authentication System
 * Manages user login, capabilities, and sessions
 */
import { createStore } from '../core/store.js';
import * as api from '../api.js';

class Login {
    constructor() {
        this.capabilities = new Set();
        this.user = null;
        this.partialLogin = null;
        this.updated = null;
    }

    /**
     * Check if user has a capability
     * @param {string} capability - Capability name
     * @returns {boolean}
     */
    has(capability) {
        return this.capabilities.has(capability);
    }

    /**
     * Send one-time password to user's email
     * @param {string} user - Email address
     */
    async send_otp(user) {
        await api.send_otp(user);
        this.partialLogin = user;
        if (this.updated) this.updated(this);
    }

    /**
     * Login with OTP code
     * @param {string} otp - One-time password
     * @returns {boolean} Success
     */
    async login(otp) {
        if (!this.partialLogin) return false;

        const { success } = await api.login(this.partialLogin, otp);
        this.partialLogin = null;

        if (success) {
            await this.upd();
            return true;
        } else {
            if (this.updated) this.updated(this);
            return false;
        }
    }

    /**
     * Log off current session
     */
    async logoff() {
        await api.logoff();
        await this.upd();
    }

    /**
     * Log off all sessions
     */
    async logoff_all() {
        await api.logoff_all();
        await this.upd();
    }

    /**
     * Update user details and capabilities
     */
    async upd() {
        const { capabilities, user } = await api.getDetails();
        this.capabilities = new Set(capabilities);
        this.user = user;
        if (this.updated) this.updated(this);
    }
}

/**
 * Create reactive login store
 */
function loginStore() {
    const login = new Login();
    const store = createStore(login);

    login.updated = (value) => store.set(value);

    // Initialize - with error handling for initial auth sync
    login.upd().catch(error => {
        console.error('[Auth] Failed to initialize auth state:', error);
        // Set default unauthenticated state on error
        login.user = null;
        login.capabilities = new Set();
        store.set(login);
    });

    return store;
}

export default loginStore();
