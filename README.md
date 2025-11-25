# SWAPI Client - Vanilla JavaScript Framework

Please note: This is EXPERIMENTAL and CLAUDE-generated code. The idea behind this project
was to create a web framework as close to a modern web framework as possible that has
ZERO dependencies on NPM. In the age of code rot, supply chain vulnerabilities, and
dependency chains so big you cannot hope to review everything, sometimes it's desirable
to explore other options. This project is one such exploration.

This is a client for SWAPI (Simple Web API) built with a custom zero-dependency vanilla JavaScript framework. It features a modern HTML5 and hash-based router designed for multiple self-contained applications.

## What Makes This Special

- **Zero dependencies** - No npm packages, no build tools required
- **No build step** - Runs directly in the browser using ES6 modules
- **Modern & secure** - Built-in XSS protection, reactive state, and component system
- **Production ready** - Comprehensive test suite with 83 passing tests
- **Clean architecture** - ~2100 lines of well-documented framework code

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:9000/

That's it! No `npm install`, no build process, no dependencies.

## Project Structure

```
app/
├── core/                  # Framework (~2100 lines)
│   ├── reactivity.js     # Proxy-based reactive state
│   ├── store.js          # Store with localStorage
│   ├── template.js       # XSS-safe templates
│   ├── component.js      # Web Components system
│   ├── router.js         # Hash/HTML5 router
│   ├── vdom.js           # Virtual DOM patching
│   └── utils.js          # Utilities & notifications
├── auth/                  # Authentication system
├── apps/                  # Application modules
│   └── pwgen/            # Password generators
├── hremote-app/          # Home remote control
├── components/           # Shared UI components
├── styles/               # Global styles
├── tests/                # Test suite (83 tests)
└── index.html            # Entry point
```

## Framework Features

### Reactive State

Proxy-based reactivity system inspired by Vue 3:

```javascript
import { reactive } from './core/reactivity.js';

const state = reactive({ count: 0 });
state.count++; // Automatically triggers re-render
```

### XSS-Safe Templates

Tagged template literals with automatic context-aware escaping (inspired by [lit-html](https://lit.dev/docs/libraries/standalone-templates/)):

```javascript
import { html, raw } from './core/template.js';

// Automatically escaped - SAFE
html`<div>${userInput}</div>`

// URL sanitized automatically - SAFE
html`<a href="${userUrl}">Link</a>`

// Only explicit raw() for trusted content
html`<div>${raw(trustedApiHtml)}</div>`
```

The framework detects URL attributes (`href`, `src`, etc.) and sanitizes them automatically. No manual wrappers needed!

**Boolean Attributes**: Use `true`/`undefined` in attribute values for clean conditional attributes:

```javascript
// Boolean attributes: true adds the attribute, undefined removes it
const isDisabled = loading;
html`<button disabled="${isDisabled}">Submit</button>`
// When loading=true  → <button disabled="">Submit</button>
// When loading=false → <button>Submit</button>

// Works with all boolean attributes
html`<input type="checkbox" checked="${isChecked}">`
html`<option value="1" selected="${isSelected}">Option</option>`

// In lists
${each(options, opt => {
    const selected = opt === currentValue ? true : undefined;
    return html`<option selected="${selected}">${opt}</option>`;
})}

// String values still work normally
html`<option selected="${'true'}">` → <option selected="true">  // String "true"
html`<option selected="${true}">` → <option selected="">         // Boolean true
```

### Component System

Web Components-based with Shadow DOM support:

```javascript
import { defineComponent } from './core/component.js';
import { html } from './core/template.js';

defineComponent('my-component', {
    data() {
        return {
            count: 0,
            message: 'Hello'
        };
    },

    template() {
        return html`
            <div>
                <p>${this.state.message}: ${this.state.count}</p>
                <button on-click="increment">+1</button>
            </div>
        `;
    },

    methods: {
        increment() {
            this.state.count++;
        }
    },

    styles: `
        :host {
            display: block;
            padding: 1rem;
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            cursor: pointer;
        }
    `
});
```

### Router

Supports both hash routing (default) and HTML5 routing:

```javascript
import { Router } from './core/router.js';

const router = new Router({
    '/': { component: 'home-page' },
    '/about': { component: 'about-page' },
    '/admin': {
        component: 'admin-page',
        require: 'admin' // Capability-based access control
    }
});

// Programmatic navigation
router.navigate('/about');
router.navigate('/search', { q: 'test', page: '2' });

// Declarative links
html`<router-link to="/about">About</router-link>`
```

### Virtual DOM

Efficient DOM patching that preserves element references:

```javascript
import { patchHTML } from './core/vdom.js';

const target = document.getElementById('app');
patchHTML(target, html`<div>New content</div>`);
```

### Store with Persistence

Reactive stores with optional localStorage persistence:

```javascript
import { createStore, persistentStore } from './core/store.js';

// Simple store
const counter = createStore({ count: 0 });

// Persistent store (automatically syncs to localStorage)
const userPrefs = persistentStore('user-prefs', { theme: 'light', lang: 'en' });

// Subscribe to changes
userPrefs.subscribe(state => {
    console.log('Preferences updated:', state);
});

// Update store (automatically persists to localStorage)
userPrefs.set({ theme: 'dark', lang: 'en' });
```

## HTML5 Routing

The router uses hash routing (`/#/`) by default for easier deployment. To use HTML5 routing, simply add a `<base>` tag to the HTML:

```html
<base href="/app/">
```

The router will automatically switch to real paths and redirect all hash routes to clean URLs.

### Server Configuration for HTML5 Routing

**Apache** (`.htaccess` or directory config):
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
try_files $uri $uri/ /index.html;
```

## Running Tests

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:8000/tests/

All 83 tests should pass, covering:
- Reactive state system
- Template system with XSS protection
- Virtual DOM patching
- Router (hash & HTML5 modes)
- Component lifecycle and event binding
- Authentication flow
- Store persistence

## Best Practices

### Security Guidelines

#### XSS Protection

Always use the `html` template tag - never concatenate strings:

```javascript
// ✅ DO: Use html template tag
html`<div>${userInput}</div>`

// ❌ DON'T: Concatenate strings
element.innerHTML = '<div>' + userInput + '</div>'
```

#### Input Validation

Validate and sanitize all user input:

```javascript
// Validate format
if (!/^[a-zA-Z0-9]+$/.test(username)) {
    throw new Error('Invalid username format');
}

// Sanitize numbers
const count = Math.max(1, Math.min(100, parseInt(userInput, 10) || 10));

// Validate URLs
const isValidUrl = (url) => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};
```

#### CSRF Protection

The framework includes CSRF token support. Add a meta tag:

```html
<meta name="csrf-token" content="your-token-here">
```

The `fetchJSON` utility automatically includes it in requests.

### Coding Standards

#### Naming Conventions

- **Component names**: `kebab-case` (required for custom elements)
- **Method names**: `camelCase`
- **Private properties**: Prefix with `_`
- **Constants**: `UPPER_SNAKE_CASE`

#### Error Handling

Always handle errors gracefully:

```javascript
async fetchData() {
    try {
        const data = await api.getData();
        this.state.data = data;
    } catch (error) {
        console.error('[Component] Failed to fetch data:', error);
        this.state.error = 'Failed to load data. Please try again.';
    } finally {
        this.state.loading = false;
    }
}
```

#### Constants Over Magic Numbers

```javascript
const DEBOUNCE_DELAY = 300;
const MAX_PASSWORD_LENGTH = 128;

debounce(handleSearch, DEBOUNCE_DELAY);
```

### Common Patterns

#### Form with Validation

```javascript
defineComponent('login-form', {
    data() {
        return {
            email: '',
            password: '',
            errors: {},
            loading: false
        };
    },

    methods: {
        validate() {
            const errors = {};

            if (!this.state.email) {
                errors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.email)) {
                errors.email = 'Invalid email format';
            }

            if (!this.state.password || this.state.password.length < 8) {
                errors.password = 'Password must be at least 8 characters';
            }

            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        },

        async handleSubmit() {
            if (!this.validate()) return;

            try {
                this.state.loading = true;
                await api.login(this.state.email, this.state.password);
                router.navigate('/dashboard');
            } catch (error) {
                this.state.errors.form = error.message;
            } finally {
                this.state.loading = false;
            }
        }
    },

    template() {
        return html`
            <form on-submit-prevent="handleSubmit">
                <input x-model="email" type="email" placeholder="Email">
                ${this.state.errors.email ? html`<span class="error">${this.state.errors.email}</span>` : ''}

                <input x-model="password" type="password" placeholder="Password">
                ${this.state.errors.password ? html`<span class="error">${this.state.errors.password}</span>` : ''}

                <button type="submit" disabled="${this.state.loading}">
                    ${this.state.loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        `;
    }
});
```

## Browser Compatibility

Requires modern browsers with ES6+ support:
- Chrome/Edge 61+
- Firefox 63+
- Safari 10.1+

**No IE11 support** - This is by design (IE11 reached end-of-life in 2022)

## Development

The framework requires no build tools. Just edit files and refresh the browser!

For detailed framework documentation and conventions, see `CLAUDE.md`.

## Deployment

Since there's no build step, deployment is simple:

1. Download `api.js` from your SWAPI server:
   ```bash
   wget https://your-server.com/spa-api/.js -O app/api.js
   ```

2. Copy the `app/` directory to your web server

3. Configure server routing if using HTML5 mode (see above)

That's it!

## Inspiration

This framework was inspired by:
- **[lit-html](https://lit.dev/docs/libraries/standalone-templates/)** - Tagged template literals for HTML
- **Vue 3** - Proxy-based reactivity system
- **Svelte** - Component-first architecture (this project is a migration from Svelte)
- **Web Components** - Native browser APIs

## License

See LICENSE.md
