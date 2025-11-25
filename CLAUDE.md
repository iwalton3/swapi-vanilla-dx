# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a web application that uses a **custom zero-dependency vanilla JavaScript framework** (in `/app/`) as a replacement for the original Svelte implementation (in `/src/`). The application is a client for the SWAPI (Simple Web API) server with authentication, various tools (password generators, remote control, location tool, home automation), and supports both modern browsers and legacy browsers with polyfills.

## Custom Framework (`/app/` directory)

The `/app/` directory contains a completely custom web framework built from scratch with zero dependencies. **All new development should use this framework, NOT Svelte.**

### Framework Architecture

- **Zero dependencies** - Pure vanilla JavaScript, no npm packages
- **Reactive state management** - Vue 3-style proxy-based reactivity
- **Web Components** - Built on native Custom Elements API
- **Virtual DOM** - Efficient DOM patching with element preservation
- **Router** - Hash-based and HTML5 routing with capability checks
- **Stores** - Reactive stores with localStorage persistence
- **Template system** - Tagged template literals with helpers (`html`, `when`, `each`, `raw`)

### Project Structure

```
app/
├── core/               # Framework core
│   ├── component.js    # Component definition system
│   ├── reactivity.js   # Reactive proxy system
│   ├── vdom.js         # Virtual DOM implementation
│   ├── router.js       # Routing system
│   ├── store.js        # State management
│   ├── template.js     # Template helpers
│   ├── utils.js        # Utility functions (notify, darkTheme, etc.)
│   ├── app-header.js   # App header component
│   └── x-page.js       # Page wrapper component
├── components/         # Reusable UI components
│   ├── icon.js
│   ├── select-box.js
│   ├── lazy-select-box.js
│   ├── tiles.js
│   └── notification-list.js
├── auth/              # Authentication system
├── apps/              # Application modules (pwgen, etc.)
├── hremote-app/       # Home remote control
├── locationtool-app/  # Location tracking
├── hometool-app/      # Home automation
├── styles/            # Global CSS
│   └── global.css
└── tests/             # Comprehensive unit tests
```

## Component Development

### ✅ CORRECT Component Pattern

```javascript
import { defineComponent } from './core/component.js';
import { html, when, each } from './core/template.js';

export default defineComponent('my-component', {
    // Props (attributes) - automatically observed
    props: {
        title: 'Default Title',
        count: 0
    },

    // Local reactive state
    data() {
        return {
            message: 'Hello',
            items: []
        };
    },

    // Lifecycle: called after component is added to DOM
    mounted() {
        this.loadData();
    },

    // Lifecycle: called after each render
    afterRender() {
        // Sync input values, set up non-reactive DOM state
    },

    // Lifecycle: called before component is removed
    unmounted() {
        // Cleanup subscriptions, timers
    },

    // Methods accessible via this.methodName()
    methods: {
        async loadData() {
            this.state.items = await fetchData();
        },

        handleClick(e) {
            e.preventDefault();
            this.state.message = 'Clicked!';
        }
    },

    // Template using tagged template literals
    template() {
        return html`
            <div class="container">
                <h1>${this.props.title}</h1>
                <p>${this.state.message}</p>
                <button on-click="handleClick">Click Me</button>
            </div>
        `;
    },

    // Scoped styles (Shadow DOM is used by default)
    styles: `
        .container {
            padding: 20px;
        }

        /* Use CSS variables for theming (penetrates Shadow DOM) */
        .container {
            background-color: var(--input-bg, white);
            color: var(--input-text, #000);
        }
    `
});

// If you need light DOM (rare), explicitly disable Shadow DOM:
export default defineComponent('light-dom-component', {
    useShadowDOM: false,  // Opt out of Shadow DOM
    template() {
        return html`<div>I use light DOM</div>`;
    }
});
```

## Shadow DOM Architecture

**IMPORTANT**: All components use Shadow DOM by default for proper encapsulation and to prevent parent VDOM operations from accidentally removing component internals.

### Why Shadow DOM is Default

Without Shadow DOM, a component's rendered elements live in the light DOM where:
- ❌ Parent VDOM diffing can accidentally remove them
- ❌ CSS from the page can leak in and break styling
- ❌ Component internals are exposed and fragile

With Shadow DOM (default):
- ✅ Component internals are protected from parent VDOM
- ✅ Styles are scoped and don't leak
- ✅ Components are self-contained and robust

### Theming Across Shadow DOM

Use **CSS custom properties (variables)** which penetrate Shadow DOM boundaries:

```javascript
// In component styles
styles: `
    select {
        background-color: var(--input-bg, white);
        border: 1px solid var(--input-border, #ddd);
        color: var(--input-text, #000);
    }
`

// In global.css
body {
    --input-bg: white;
    --input-border: #ddd;
    --input-text: #000;
}

body.dark {
    --input-bg: #353535;
    --input-border: #555;
    --input-text: #ccc;
}
```

### Light DOM (Rare Cases)

Only disable Shadow DOM if you specifically need light DOM (e.g., for SEO or form participation):

```javascript
export default defineComponent('my-component', {
    useShadowDOM: false,  // Opt out - use with caution!
    template() {
        return html`<div>Light DOM content</div>`;
    }
});
```

## Event Binding - CRITICAL

### ✅ ALWAYS Use on-* Attributes

**NEVER use inline onclick or addEventListener in templates!** Always use the framework's `on-*` event binding:

```javascript
template() {
    return html`
        <button on-click="handleClick">Click</button>
        <form on-submit-prevent="handleSubmit">
            <input type="text" on-change="handleChange">
            <select on-change="handleSelect">
                <option>Option 1</option>
            </select>
        </form>
        <div on-mouseenter="handleHover" on-mouseleave="handleLeave">
            Hover me
        </div>
    `;
}
```

**Available event bindings:**
- `on-click` - Click events
- `on-change` - Change events
- `on-submit` - Form submission (you must call `e.preventDefault()`)
- `on-submit-prevent` - Form submission with automatic `preventDefault()`
- `on-mouseenter`, `on-mouseleave` - Mouse events
- `on-input` - Input events

### ❌ NEVER Do This

```javascript
// ❌ WRONG - Don't use inline handlers
template() {
    return html`<button onclick="handleClick()">Click</button>`;
}

// ❌ WRONG - Don't use addEventListener in templates
afterRender() {
    this.querySelector('button').addEventListener('click', this.handleClick);
}
```

## Passing Props to Child Components

### ✅ Automatic Object Passing for Custom Elements

The framework **automatically** passes objects and arrays to custom elements (Web Components) without stringification. Just use regular `${}` interpolation:

```javascript
template() {
    return html`
        <!-- ✅ CORRECT - Arrays/objects passed automatically -->
        <x-select-box
            options="${this.state.lengthOptions}"
            value="${this.state.length}"
            on-change="handleChange">
        </x-select-box>
    `;
}
```

**How it works:**
- Framework detects custom elements (tags with hyphens like `x-select-box`)
- For custom element attributes, objects/arrays are passed by reference automatically
- For native HTML elements (`<input>`, `<div>`, etc.), values are converted to strings as normal
- You can pass any JavaScript expression: `"${this.state.items.filter(x => x.active)}"`

### Examples

```javascript
template() {
    return html`
        <!-- Custom elements: objects passed automatically -->
        <x-select-box options="${this.state.options}"></x-select-box>
        <my-list items="${this.getFilteredItems()}"></my-list>
        <data-table rows="${this.state.rows}" config="${{ sortable: true }}"></data-table>

        <!-- Native HTML: values converted to strings -->
        <input value="${this.state.username}">
        <div data-count="${this.state.count}"></div>
    `;
}
```

### ❌ Don't Use JSON.stringify

```javascript
// ❌ WRONG - Don't stringify (framework does it automatically)
<x-select-box options="${JSON.stringify(this.state.options)}">

// ❌ WRONG - Don't manually set props in afterRender
afterRender() {
    this.querySelector('x-select-box').props.options = this.state.options;
}
```

## Template Helpers

### `html` - Tagged Template Literal

Main template function - automatically escapes content:

```javascript
template() {
    return html`<div>${this.state.userInput}</div>`;
}
```

### `when()` - Conditional Rendering

**Always use `when()` instead of ternaries:**

```javascript
// ✅ CORRECT
${when(this.state.isLoggedIn,
    html`<p>Welcome!</p>`,
    html`<p>Please log in</p>`
)}

// ❌ WRONG
${this.state.isLoggedIn ? html`<p>Welcome!</p>` : html`<p>Log in</p>`}
```

### `each()` - List Rendering

```javascript
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}
```

### `raw()` - Unsafe HTML

Only use for trusted, sanitized content:

```javascript
${raw(this.state.trustedHtmlContent)}
```

## State Management

### Reactive State

State changes automatically trigger re-renders:

```javascript
data() {
    return {
        count: 0
    };
},

methods: {
    increment() {
        this.state.count++; // Auto re-renders
    }
}
```

### ⚠️ CRITICAL: Sets and Maps

**Sets and Maps are NOT reactive!** Must reassign to trigger updates:

```javascript
// ✅ CORRECT
addItem(item) {
    const newSet = new Set(this.state.items);
    newSet.add(item);
    this.state.items = newSet;
}

// ❌ WRONG - Won't trigger re-render
addItem(item) {
    this.state.items.add(item);
}
```

### Stores

Always call methods on `store.state`, not the original object:

```javascript
import login from './auth/auth.js';

// ✅ CORRECT
async mounted() {
    this.unsubscribe = login.subscribe(state => {
        this.state.user = state.user;
    });
}

async logoff() {
    await login.state.logoff(); // Call on .state!
}

unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

## Form Handling Pattern

```javascript
template() {
    return html`
        <form on-submit-prevent="handleSubmit">
            <input type="text" id="username" value="${this.state.username}">
            <input type="submit" value="Submit">
        </form>
    `;
},

methods: {
    async handleSubmit(e) {
        // preventDefault already called by on-submit-prevent
        const input = this.querySelector('#username');
        this.state.username = input.value;

        await this.saveData();
    }
},

afterRender() {
    // Sync input value if needed
    const input = this.querySelector('#username');
    if (input) {
        input.value = this.state.username;
    }
}
```

## Router

Routes are defined in `app.js`:

```javascript
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    }
});
```

Use `router-link` for navigation:

```javascript
<router-link to="/about/">About</router-link>
```

## Dark Theme

```javascript
import { darkTheme } from './core/utils.js';

// Toggle
darkTheme.update(s => ({ enabled: !s.enabled }));

// In styles
styles: `
    :host-context(body.dark) .element {
        background: #333;
        color: #ccc;
    }
`
```

## Notifications

```javascript
import { notify } from './core/utils.js';

methods: {
    async save() {
        try {
            await this.saveData();
            notify('Saved!', 'info', 3); // message, severity, seconds
        } catch (error) {
            notify('Error!', 'error', 5);
        }
    }
}
```

## Testing

Located in `/app/tests/`. Tests auto-run on page load.

```javascript
import { describe, assert } from './test-runner.js';

describe('My Tests', function(it) {
    it('does something', async () => {
        const result = await doSomething();
        assert.equal(result, expected, 'Should match');
    });
});
```

## Common Patterns

### Loading Data

```javascript
data() {
    return {
        items: [],
        loading: false
    };
},

async mounted() {
    this.state.loading = true;
    try {
        const response = await fetch('/api/items');
        this.state.items = await response.json();
    } catch (error) {
        console.error('Failed to load:', error);
    } finally {
        this.state.loading = false;
    }
}
```

### Select Boxes

For dynamic options, sync in `afterRender`:

```javascript
template() {
    return html`
        <x-select-box
            id="my-select"
            value="${this.state.selected}"
            options="${JSON.stringify(this.state.options)}">
        </x-select-box>
    `;
},

afterRender() {
    const select = this.querySelector('#my-select');
    if (select) {
        select.addEventListener('change', (e) => {
            this.state.selected = e.detail.value;
        });
    }
}
```

## Security Best Practices

The framework has built-in security protections, but follow these guidelines:

### 1. XSS Protection

**Always use `html` tag** - Automatic context-aware escaping:

```javascript
// ✅ CORRECT - Auto-escaped
template() {
    return html`<div>${this.state.userInput}</div>`;
}

// ❌ WRONG - XSS vulnerable
template() {
    const html = `<div>${this.state.userInput}</div>`;
    return raw(html);
}
```

**Use `raw()` only for trusted content** from your own backend:

```javascript
// ✅ SAFE - Backend-generated HTML
${raw(this.state.passwordGeneratorResponse)}

// ❌ DANGEROUS - User input
${raw(this.state.userComment)}  // XSS!
```

### 2. Dynamic Content and Boolean Attributes

**Use the template system for all dynamic content**:

```javascript
// ✅ CORRECT - Let the framework handle escaping
template() {
    return html`
        <select>
            ${each(items, item => {
                const selected = item.id === this.state.selectedId ? 'selected' : '';
                return html`<option value="${item.id}" ${selected}>${item.name}</option>`;
            })}
        </select>
    `;
}

// ❌ WRONG - Manual string building with raw() is dangerous
const optionsHtml = items.map(item => {
    const escapedName = item.name.replace(/"/g, '&quot;'); // Easy to miss escaping!
    return `<option value="${item.id}">${escapedName}</option>`;
}).join('');
return html`<select>${raw(optionsHtml)}</select>`; // XSS if escaping is incomplete!
```

**Conditional Boolean Attributes**:

Use `true`/`undefined` in attribute values for clean conditional rendering:

```javascript
// ✅ CORRECT - Boolean attributes in attribute value context
const selected = item.id === selectedId ? true : undefined;
html`<option selected="${selected}">${item.name}</option>`

const disabled = isLoading ? true : undefined;
html`<button disabled="${disabled}">Submit</button>`

// Also works in each()
${each(items, item => {
    const selected = item.id === this.state.selectedId ? true : undefined;
    return html`<option value="${item.id}" selected="${selected}">${item.name}</option>`;
})}
```

When the value is `true`, the attribute is added with an empty value (`selected=""`). When `undefined` or `false`, the attribute is removed entirely.

**IMPORTANT**: String values like `"true"` or `"false"` are treated as regular strings, not booleans:
- `selected="${true}"` → `<option selected="">` (boolean true)
- `selected="${'true'}"` → `<option selected="true">` (string "true")

The `html` template tag provides automatic context-aware escaping. Always use it instead of manual string concatenation.

### 3. Event Handler Security

**Never pass user input to event attributes**:

```javascript
// ❌ DANGEROUS - Allows script injection
<button on-click="${this.state.userHandler}">

// ✅ CORRECT - Use method names only
<button on-click="handleClick">
```

### 4. CSRF Protection

The framework includes CSRF token support. Add to your HTML:

```html
<meta name="csrf-token" content="YOUR_TOKEN_HERE">
```

All `fetchJSON()` calls automatically include this token.

### 5. Input Validation

**Always validate user input** before API calls:

```javascript
methods: {
    async saveEmail(e) {
        e.preventDefault();

        const email = this.state.email.trim();
        if (!this.isValidEmail(email)) {
            notify('Invalid email address', 'error');
            return;
        }

        await api.updateEmail(email);
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
```

### 6. Sensitive Data Storage

**Never store sensitive data in localStorage**:

```javascript
// ❌ WRONG - Plaintext tokens exposed
localStore('authToken', token);

// ✅ CORRECT - Session-only storage
sessionStorage.setItem('authToken', token);
```

### 7. Memory Leak Prevention

The framework automatically cleans up event listeners, but you must clean up subscriptions:

```javascript
mounted() {
    this._interval = setInterval(() => this.refresh(), 60000);
    this.unsubscribe = store.subscribe(state => {
        this.state.data = state.data;
    });
},

unmounted() {
    // ✅ REQUIRED - Clean up to prevent leaks
    if (this._interval) clearInterval(this._interval);
    if (this.unsubscribe) this.unsubscribe();
}
```

## Migration from Svelte (`/src/` → `/app/`)

| Svelte | Custom Framework |
|--------|------------------|
| `on:click` / `@click` | `on-click` |
| `bind:value` | Manual sync in `afterRender()` |
| `{#if}` | `when(condition, then, else)` |
| `{#each}` | `each(items, item => ...)` |
| `{@html}` | `raw(content)` |
| `$store` | `store.state` |
| `export let prop` | `props: { prop: default }` |

## Migration Complete

The original Svelte implementation has been fully migrated to the vanilla JavaScript framework in `/app/`. All legacy code (`/src/`, npm dependencies, build tools) has been removed.

The framework requires no build step - it runs directly in the browser using ES6 modules.

## Backend (SWAPI Server)

**Note**: The `backend` and `backend-apps` directories are symlinks to `../swapi/server/` and `../swapi-apps/`. **Do NOT modify these from this repository.**

### SWAPI Framework

Python-based web API framework built on Werkzeug:
- Decorator-based API registration: `@api.add(require=capability)`
- Auto-generated client libraries (`.js`, `.py` endpoints)
- Email-based OTP authentication
- Role hierarchy and capability system
- SQLAlchemy database backend

### Backend Apps

- **HRemote**: Philips Hue control, home automation (requires `root`)
- **LocationTool**: Bluetooth MAC tracking (requires `locationtool`)
- **HomeApi**: Garage door, device tracking (requires `homeapi`)

## Coding Best Practices

### Naming Conventions

```javascript
// ✅ Component names: kebab-case for custom elements
defineComponent('user-profile', { ... })
defineComponent('x-select-box', { ... })  // x- prefix for reusable UI components

// ✅ Methods: descriptive camelCase
methods: {
    loadUserData() { ... },
    handleFormSubmit() { ... },
    updateUserProfile() { ... }
}

// ❌ Avoid abbreviations
methods: {
    upd() { ... },          // Bad: unclear
    ld() { ... },           // Bad: cryptic
    hdlClick() { ... }      // Bad: hard to read
}

// ✅ Private properties: underscore prefix
this._interval = setInterval(...);
this._cleanups = [];
this._unsubscribe = null;
```

### Error Handling

```javascript
// ✅ CORRECT - Proper error handling
methods: {
    async loadData() {
        try {
            this.state.loading = true;
            const data = await api.getData();
            this.state.items = data;
        } catch (error) {
            console.error('[MyComponent] Failed to load data:', error);
            notify(`Error: ${error.message}`, 'error');
            this.state.items = [];  // Fallback state
        } finally {
            this.state.loading = false;
        }
    }
}

// ❌ WRONG - Silent failure
methods: {
    async loadData() {
        const data = await api.getData();  // No error handling!
        this.state.items = data;
    }
}
```

### Constants Over Magic Numbers

```javascript
// ✅ CORRECT
const REFRESH_INTERVAL_MS = 60 * 1000;  // 1 minute
const MAX_RETRIES = 3;
const TIMEOUT_SECONDS = 30;

mounted() {
    this._interval = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
}

// ❌ WRONG
mounted() {
    this._interval = setInterval(() => this.refresh(), 60000);  // What is 60000?
}
```

### Avoid Code Duplication

```javascript
// ✅ CORRECT - Reusable error handler
methods: {
    async safeApiCall(apiMethod, errorMessage) {
        try {
            return await apiMethod();
        } catch (error) {
            console.error(errorMessage, error);
            notify(errorMessage, 'error');
            throw error;
        }
    },

    async loadUsers() {
        await this.safeApiCall(
            () => api.getUsers(),
            'Failed to load users'
        );
    },

    async saveUser() {
        await this.safeApiCall(
            () => api.saveUser(this.state.user),
            'Failed to save user'
        );
    }
}

// ❌ WRONG - Repeated error handling
methods: {
    async loadUsers() {
        try {
            return await api.getUsers();
        } catch (error) {
            console.error('Failed to load', error);
            notify('Failed to load', 'error');
        }
    },

    async saveUser() {
        try {
            return await api.saveUser(this.state.user);
        } catch (error) {
            console.error('Failed to save', error);
            notify('Failed to save', 'error');
        }
    }
}
```

### Documentation

```javascript
/**
 * User Profile Component
 *
 * Displays and edits user profile information with validation.
 *
 * Props:
 *   - userId: ID of the user to display (required)
 *   - editable: Whether profile can be edited (default: false)
 *
 * Events:
 *   - save: Emitted when profile is successfully saved
 *   - cancel: Emitted when user cancels editing
 *
 * @example
 * <user-profile userId="123" editable="true"></user-profile>
 */
export default defineComponent('user-profile', {
    props: {
        userId: '',
        editable: false
    },
    // ...
});
```

## Key Conventions

1. **Use `on-*` for ALL event binding** - Never use inline handlers or addEventListener
2. **Use `when()` and `each()`** - Not ternaries or manual loops
3. **Call store methods on `.state`** - `login.state.logoff()`, not `login.logoff()`
4. **Reassign Sets/Maps** - They're not reactive otherwise
5. **Clean up in `unmounted()`** - Unsubscribe from stores, clear timers
6. **Validate user input** - Always validate before API calls
7. **Handle errors properly** - Don't let errors fail silently
8. **Use descriptive names** - No abbreviations or single letters
9. **Add JSDoc comments** - Document component purpose, props, and events
10. **Use constants** - No magic numbers or strings

## Getting Help

- Check `/app/tests/` for working examples
- Review `/app/core/` for framework APIs
- See `/app/components/` for component patterns
- Read this CLAUDE.md for conventions
- Security audit results in project documentation
