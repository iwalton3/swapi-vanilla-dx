# Framework Test Suite

Zero-dependency browser-based test suite for the SimpleApp framework.

## Running Tests

### Browser (Recommended)

1. Start the development server:
   ```bash
   cd app
   python3 test-server.py
   ```

2. Open in browser:
   ```
   http://localhost:9000/tests/
   ```

Tests will run automatically and display results in a clean UI.

### Command Line (Headless)

You can also run tests headless using any headless browser:

```bash
# Using Chromium/Chrome headless
chromium --headless --dump-dom http://localhost:9000/tests/

# Using Firefox headless
firefox --headless http://localhost:9000/tests/
```

## Test Coverage

### Reactivity System (`reactivity.test.js`)
- ✅ Creates reactive proxies
- ✅ Tracks dependencies with effects
- ✅ Handles nested reactive objects
- ✅ Only triggers on actual value changes
- ✅ Computed values with lazy evaluation
- ✅ Watch callbacks with old/new values
- ✅ Array mutations
- ✅ Proxy reuse for already-reactive objects
- ✅ Primitive value handling

### Store System (`store.test.js`)
- ✅ Initial state creation
- ✅ State updates via `set()` and `update()`
- ✅ Subscriber notifications
- ✅ Unsubscribe functionality
- ✅ Multiple subscribers

### Template Security (`template.test.js`)
- ✅ HTML content escaping (`<script>` tags)
- ✅ HTML attribute escaping (quote injection)
- ✅ URL sanitization (javascript: protocol)
- ✅ Dangerous URL schemes (data:, vbscript:, etc.)
- ✅ Safe URL schemes (https:, mailto:, tel:)
- ✅ Explicit raw HTML with `raw()`
- ✅ Unicode normalization (BOM removal)
- ✅ Special character escaping (&, <, >, ", ', /)
- ✅ Null/undefined handling
- ✅ Number and boolean handling
- ✅ HTML entity decoding in URL detection

## Writing Tests

Tests use a simple describe/it API similar to Jest/Mocha:

```javascript
import { describe, assert } from './test-runner.js';
import { myFunction } from '../core/mymodule.js';

describe('My Module', function(it) {
    it('does something', () => {
        const result = myFunction(5);
        assert.equal(result, 10, 'Should double the input');
    });

    it('handles edge cases', () => {
        assert.throws(() => myFunction(null), Error);
    });
});
```

## Assertion API

- `assert.equal(actual, expected, message)` - Strict equality
- `assert.deepEqual(actual, expected, message)` - Deep object equality
- `assert.ok(value, message)` - Truthy value
- `assert.throws(fn, expectedError, message)` - Function throws error
- `assert.rejects(promise, expectedError, message)` - Promise rejects
- `assert.isType(value, type, message)` - Type checking
- `assert.includes(array, value, message)` - Array includes value
- `assert.isNull(value, message)` - Null check
- `assert.isNotNull(value, message)` - Non-null check

## Test Structure

```
tests/
├── index.html           # Test runner page
├── test-runner.js       # Test framework (~190 lines)
├── reactivity.test.js   # Reactivity tests
├── store.test.js        # Store tests
├── template.test.js     # Template/security tests
└── README.md           # This file
```

## Adding New Tests

1. Create a new test file in `tests/` directory:
   ```javascript
   // tests/myfeature.test.js
   import { describe, assert } from './test-runner.js';
   import { myFeature } from '../core/myfeature.js';

   describe('My Feature', function(it) {
       it('works correctly', () => {
           assert.ok(myFeature());
       });
   });
   ```

2. Import it in `tests/index.html`:
   ```javascript
   import './myfeature.test.js';
   ```

3. Refresh the browser - tests run automatically!

## Philosophy

This test suite follows the same zero-dependency philosophy as the framework:
- No npm packages required
- No build step needed
- Works directly in the browser
- Fast and simple to use
- Easy to debug with browser DevTools

## Future Enhancements

Potential additions (PRs welcome):
- Component system tests
- Router tests (both hash and HTML5 modes)
- Virtual DOM diffing tests
- Performance benchmarks
- Coverage reporting
- CI/CD integration examples
