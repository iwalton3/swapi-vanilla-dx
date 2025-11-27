/**
 * Main Application Entry Point
 */

import { Router, defineRouterOutlet, defineRouterLink } from './lib/router.js';
import login from './auth/auth.js';

// Import core components (needed immediately)
import './components/app-header.js';
import './components/notification-list.js';

// Note: All other components are lazy-loaded by the pages that use them

// Define router outlet
defineRouterOutlet();

// Setup router with lazy loading
const router = new Router({
    '/': {
        component: 'home-page',
        load: () => import('./home.js')
    },
    '/pwgen/': {
        component: 'spwg-page',
        load: () => import('./apps/pwgen/spwg.js')
    },
    '/pwgen/apwg/': {
        component: 'apwg-page',
        load: () => import('./apps/pwgen/apwg.js')
    },
    '/pwgen/v1/': {
        component: 'v1-page',
        load: () => import('./apps/pwgen/v1.js')
    },
    '/auth/': {
        component: 'auth-login',
        load: () => import('./auth/login.js')
    },
    '/auth/login/': {
        component: 'auth-login',
        load: () => import('./auth/login.js')
    },
    '/auth/logoff-all/': {
        component: 'auth-logoff-all',
        load: () => import('./auth/logoff-all.js')
    },
    '/auth/error/': {
        component: 'auth-error',
        load: () => import('./auth/auth-error.js')
    },
    '/auth/admin/': {
        component: 'user-manager',
        require: 'accountmanager',
        load: () => import('./auth/user-manager.js')  // Let component import its own deps
    },
    '/hremote/': {
        component: 'remote-control',
        require: 'root',
        load: () => import('./hremote-app/remote.js')  // Let component import its own deps
    },
    '/404': {
        component: 'page-not-found',
        load: () => import('./page-not-found.js')
    }
});

// Add capability checking hook
router.beforeEach(async ({ path, query, route }) => {
    // Check if route requires a capability
    if (route.require) {
        const requiredCapability = route.require;

        // Check if user has the required capability
        if (!login.state.has(requiredCapability)) {
            console.warn(`Route ${path} requires capability "${requiredCapability}" which user does not have`);

            // Redirect to auth error page
            router.replace('/auth/error/', {
                message: `You do not have permission to access this page. Required capability: ${requiredCapability}`
            });

            return false; // Cancel navigation
        }
    }

    return true; // Allow navigation
});

// Set the outlet element
const outlet = document.querySelector('router-outlet');
router.setOutlet(outlet);

// Define router link component
defineRouterLink(router);

// For debugging
window.router = router;
