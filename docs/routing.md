# Router

Complete guide to client-side routing with the framework.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Defining Routes](#defining-routes)
- [Lazy Loading](#lazy-loading)
- [Navigation](#navigation)
- [HTML5 Routing](#html5-routing)
- [Route Guards](#route-guards)

## Basic Setup

```javascript
import { Router, defineRouterOutlet, defineRouterLink } from './lib/router.js';

// Define router outlet component
defineRouterOutlet();

// Create router with routes
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/about/': {
        component: 'about-page'
    },
    '/users/:id/': {
        component: 'user-profile'
    }
});

// Set the outlet element
router.setOutlet(document.querySelector('router-outlet'));

// Define router link component
defineRouterLink(router);
```

**In your HTML:**
```html
<router-outlet></router-outlet>
```

## Defining Routes

Routes are defined in `app.js` or your main entry file:

```javascript
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    },
    '/users/:id/': {
        component: 'user-profile'
    },
    '/search/': {
        component: 'search-page'
    }
});
```

### Route Parameters

Access route parameters in your component:

```javascript
defineComponent('user-profile', {
    mounted() {
        // Access route params from URL
        const userId = this.getUserIdFromURL();
        this.loadUser(userId);
    },

    methods: {
        getUserIdFromURL() {
            // Parse from window.location or router state
            const path = window.location.hash.replace('#', '') || window.location.pathname;
            const match = path.match(/\/users\/(\d+)\//);
            return match ? match[1] : null;
        }
    }
});
```

## Lazy Loading

For better performance, routes can be lazy-loaded using dynamic imports. This improves Time to First Contentful Paint by only loading the requested route initially:

```javascript
const router = new Router({
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Lazy load on demand
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin',
        load: () => import('./admin.js')  // Component loads its own dependencies
    },
    '/users/:id/': {
        component: 'user-profile',
        load: () => import('./user-profile.js')
    }
});
```

**How it works:**
1. When a route is visited for the first time, the router calls the `load` function
2. The component module is dynamically imported
3. Component is cached in `router.loadedComponents` Set
4. Subsequent visits to the same route are instant (no re-download)

**Benefits:**
- Only the initial route loads on page load
- Other routes load on-demand when navigated to
- Components manage their own dependencies via import statements
- ES module caching ensures no duplicate downloads

**Component dependencies:**

Each lazy-loaded component should import its own dependencies:

```javascript
// In home.js
import { defineComponent } from './lib/framework.js';
import './components/tiles.js';     // Component imports what it needs
import './auth/user-tools.js';

export default defineComponent('home-page', {
    // ...
});
```

The browser's ES module system automatically caches all imports, so there's no performance penalty for components importing their dependencies.

## Navigation

### Declarative Navigation

Use `router-link` for navigation:

```javascript
<router-link to="/about/">About</router-link>
<router-link to="/users/123/">User Profile</router-link>
```

### Programmatic Navigation

Navigate via JavaScript:

```javascript
import { Router } from './lib/router.js';

// Assuming router is accessible (e.g., global or imported)
methods: {
    goToProfile(userId) {
        router.navigate(`/users/${userId}/`);
    },

    goToSearch(query) {
        router.navigate('/search/', { q: query, page: '1' });
    }
}
```

**With query parameters:**
```javascript
router.navigate('/search/', { q: 'test', page: '2' });
// Results in: /search/?q=test&page=2
```

## HTML5 Routing

The router uses hash routing (`/#/`) by default. To use HTML5 routing, add a `<base>` tag:

```html
<base href="/app/">
```

The router automatically:
- Switches to real paths (no `#`)
- Redirects hash routes to clean URLs
- Handles browser back/forward buttons
- Falls back to hash routing if no `<base>` tag

### Server Configuration for HTML5 Routing

**Apache** (`.htaccess`):
```apache
RewriteEngine on
RewriteCond %{REQUEST_FILENAME} -s [OR]
RewriteCond %{REQUEST_FILENAME} -l [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^.*$ - [NC,L]
RewriteRule ^(.*) index.html [NC,L]
```

**Nginx**:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Python test server** (for development):

```bash
cd app
python3 test-server.py
```

This serves the app with proper routing support on http://localhost:9000/

## Route Guards

### Capability-Based Access Control

Require specific capabilities for routes:

```javascript
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Only users with 'admin' capability
    },
    '/moderator/': {
        component: 'moderator-page',
        require: 'moderator'
    }
});
```

**How it works:**
- Router checks if user has required capability before rendering route
- If user lacks capability, router may redirect or show access denied
- Capabilities are checked via your authentication system

**Setting up capabilities:**

The capability check integrates with your authentication store:

```javascript
// In auth/auth.js
const login = createStore({
    user: null,
    capabilities: [],

    // ... auth methods
});

// Router uses this to check capabilities
router.checkCapability = (required) => {
    return login.state.capabilities.includes(required);
};
```

### Custom Route Guards

You can implement custom route guards by extending the router:

```javascript
router.beforeNavigate = (to, from) => {
    // Return false to prevent navigation
    if (to === '/private/' && !isAuthenticated()) {
        router.navigate('/login/');
        return false;
    }
    return true;
};
```

## Best Practices

### Route Organization

```javascript
// ✅ GOOD - Organized by feature
const router = new Router({
    // Public routes
    '/': { component: 'home-page', load: () => import('./home.js') },
    '/about/': { component: 'about-page', load: () => import('./about.js') },

    // User routes
    '/users/': { component: 'user-list', load: () => import('./users/list.js') },
    '/users/:id/': { component: 'user-profile', load: () => import('./users/profile.js') },

    // Admin routes (protected)
    '/admin/': { component: 'admin-page', require: 'admin', load: () => import('./admin/index.js') },
    '/admin/users/': { component: 'admin-users', require: 'admin', load: () => import('./admin/users.js') }
});
```

### Use Lazy Loading for Large Apps

```javascript
// ✅ GOOD - Lazy load all routes
const router = new Router({
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Only loads when visited
    },
    // ... more routes
});
```

### Trailing Slashes

Be consistent with trailing slashes:

```javascript
// ✅ GOOD - Consistent trailing slashes
'/about/'
'/users/:id/'

// ❌ BAD - Inconsistent
'/about'
'/users/:id/'
```

## Debugging

Enable router debugging:

```javascript
const router = new Router({
    // ... routes
}, {
    debug: true  // Logs route changes
});
```

## See Also

- [components.md](components.md) - Component development patterns
- [api-reference.md](api-reference.md) - Complete API reference
