# Security Best Practices

Complete guide to security features and best practices in the framework.

## Table of Contents

- [XSS Protection](#xss-protection)
- [Dynamic Content and Boolean Attributes](#dynamic-content-and-boolean-attributes)
- [Event Handler Security](#event-handler-security)
- [CSRF Protection](#csrf-protection)
- [Input Validation](#input-validation)
- [Sensitive Data Storage](#sensitive-data-storage)
- [Memory Leak Prevention](#memory-leak-prevention)

## XSS Protection

The framework has built-in security protections with defense-in-depth:

### Security Architecture

1. **Symbol-based trust markers**: The framework uses non-exported Symbols for `html` and `raw` markers, preventing JSON injection attacks
2. **Context-aware escaping**: Automatic XSS protection based on interpolation context
3. **toString() attack prevention**: Uses `Object.prototype.toString.call()` to prevent malicious custom toString() methods from executing
4. **Attribute sanitization**: URL validation, boolean attribute handling, and dangerous attribute blocking

### Always Use `html` Tag

**Auto-escaped by default:**

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

### URL Sanitization

URLs in `href` and `src` attributes are automatically sanitized:

```javascript
// ✅ SAFE - URL sanitized automatically
html`<a href="${userProvidedUrl}">Link</a>`

// Framework blocks dangerous protocols:
// - javascript:
// - data:
// - vbscript:
// - file:
```

**Safe URL schemes** (allowed):
- `http://`, `https://`
- `mailto:`
- `tel:`
- `#` (anchor links)
- Relative URLs

### Use `raw()` Only for Trusted Content

Only use `raw()` for content from your own backend that you trust:

```javascript
// ✅ SAFE - Backend-generated HTML
${raw(this.state.passwordGeneratorResponse)}

// ❌ DANGEROUS - User input
${raw(this.state.userComment)}  // XSS!
```

### Defense Against toString() Attacks

The framework prevents malicious toString() attacks:

```javascript
// Attacker tries to inject code via toString()
const malicious = {
    toString: () => '<script>alert("XSS")</script>'
};

// ✅ SAFE - Framework uses Object.prototype.toString.call()
html`<div>${malicious}</div>`
// Renders: <div>[object Object]</div>
```

## Dynamic Content and Boolean Attributes

### Use the Template System for All Dynamic Content

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

### Conditional Boolean Attributes

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

## Event Handler Security

### Never Pass User Input to Event Attributes

```javascript
// ❌ DANGEROUS - Allows script injection
<button on-click="${this.state.userHandler}">

// ✅ CORRECT - Use method names only
<button on-click="handleClick">
```

**Why?** If `userHandler` contains malicious code, it could be executed. Always use predefined method names.

### Use on-* Attributes, Not Inline Handlers

```javascript
// ✅ CORRECT - Safe event binding
<button on-click="handleClick">Click Me</button>

// ❌ WRONG - Potentially unsafe
<button onclick="handleClick()">Click Me</button>
```

## CSRF Protection

The framework includes CSRF token support. Add to your HTML:

```html
<meta name="csrf-token" content="YOUR_TOKEN_HERE">
```

All `fetchJSON()` calls automatically include this token in the request headers.

**Example:**
```javascript
// CSRF token automatically included
const response = await fetchJSON('/api/update', {
    method: 'POST',
    body: JSON.stringify({ data: 'value' })
});
```

## Input Validation

**Always validate user input** before API calls:

```javascript
methods: {
    async saveEmail(e) {
        e.preventDefault();

        const email = this.state.email.trim();

        // Validate email format
        if (!this.isValidEmail(email)) {
            notify('Invalid email address', 'error');
            return;
        }

        // Validate email length
        if (email.length > 255) {
            notify('Email too long', 'error');
            return;
        }

        await api.updateEmail(email);
    },

    isValidEmail(email) {
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
```

### Input Validation Patterns

**Email validation:**
```javascript
isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

**Username validation:**
```javascript
isValidUsername(username) {
    // 3-20 alphanumeric characters, underscores, hyphens
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}
```

**URL validation:**
```javascript
isValidURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
```

**Number range validation:**
```javascript
isValidAge(age) {
    const num = parseInt(age, 10);
    return !isNaN(num) && num >= 0 && num <= 120;
}
```

## Sensitive Data Storage

### Never Store Sensitive Data in localStorage

```javascript
// ❌ WRONG - Plaintext tokens exposed to XSS
localStore('authToken', token);

// ✅ CORRECT - Session-only storage
sessionStorage.setItem('authToken', token);
```

**Why?** localStorage:
- Persists across sessions
- Accessible to all scripts (XSS vulnerable)
- Never expires

sessionStorage:
- Cleared when tab closes
- Still accessible to XSS, but shorter window
- Better for sensitive data

**Best practice:** Use secure, httpOnly cookies for auth tokens (set by backend).

### Avoid Storing Secrets in State

```javascript
// ❌ WRONG - API key in client code
data() {
    return {
        apiKey: 'sk-1234567890abcdef'  // Exposed in source!
    };
}

// ✅ CORRECT - API key on backend only
// Client never has access to secret keys
```

## Memory Leak Prevention

The framework automatically cleans up event listeners, but you must clean up subscriptions and timers:

```javascript
mounted() {
    // Set up interval
    this._interval = setInterval(() => this.refresh(), 60000);

    // Subscribe to store
    this.unsubscribe = store.subscribe(state => {
        this.state.data = state.data;
    });

    // Add global event listener
    this._handleResize = () => this.handleResize();
    window.addEventListener('resize', this._handleResize);
},

unmounted() {
    // ✅ REQUIRED - Clean up to prevent leaks
    if (this._interval) {
        clearInterval(this._interval);
    }

    if (this.unsubscribe) {
        this.unsubscribe();
    }

    if (this._handleResize) {
        window.removeEventListener('resize', this._handleResize);
    }
}
```

### Common Memory Leaks

**Timers:**
```javascript
// ✅ CORRECT - Cleanup timer
mounted() {
    this._timer = setTimeout(() => this.doSomething(), 5000);
},
unmounted() {
    clearTimeout(this._timer);
}
```

**Store subscriptions:**
```javascript
// ✅ CORRECT - Cleanup subscription
mounted() {
    this.unsubscribe = myStore.subscribe(state => {
        this.state.data = state.data;
    });
},
unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

**Global event listeners:**
```javascript
// ✅ CORRECT - Cleanup global listeners
mounted() {
    this._handleScroll = () => this.handleScroll();
    window.addEventListener('scroll', this._handleScroll);
},
unmounted() {
    window.removeEventListener('scroll', this._handleScroll);
}
```

## Security Checklist

- [ ] Use `html` tag for all templates (auto-escaping)
- [ ] Only use `raw()` for trusted, backend-generated content
- [ ] Validate all user input before API calls
- [ ] Use `on-*` attributes for event binding (not inline handlers)
- [ ] Never pass user input to event handlers
- [ ] Use sessionStorage for sensitive data (not localStorage)
- [ ] Include CSRF token meta tag
- [ ] Cleanup subscriptions/timers in `unmounted()`
- [ ] Validate and sanitize file uploads
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on backend
- [ ] Use secure, httpOnly cookies for auth tokens

## See Also

- [templates.md](templates.md) - Template system and XSS protection
- [components.md](components.md) - Component lifecycle and cleanup
- [api-reference.md](api-reference.md) - Complete API reference
