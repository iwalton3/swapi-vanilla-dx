/**
 * Template System with Automatic Context-Aware Security
 * Provides XSS protection by automatically detecting interpolation context
 */

// Prop binding registry - stores actual object/array values
const propRegistry = new Map();
let propIdCounter = 0;

// URL attributes that need URL sanitization
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'action', 'formaction', 'data', 'poster',
    'cite', 'background', 'longdesc', 'manifest', 'usemap'
]);

// Dangerous attributes where interpolation should be blocked
const DANGEROUS_ATTRIBUTES = new Set(['style', 'srcdoc']);

// Boolean attributes that should use presence/absence pattern
const BOOLEAN_ATTRIBUTES = new Set([
    'checked', 'selected', 'disabled', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer',
    'novalidate', 'formnovalidate', 'ismap', 'itemscope'
]);

/**
 * Normalize input to prevent encoding attacks
 */
function normalizeInput(input) {
    if (input == null) return '';
    let str = String(input);

    // Remove null bytes (common bypass technique)
    str = str.replace(/\x00/g, '');

    // Remove BOM markers
    str = str.replace(/^\uFEFF/, '');

    // Unicode NFC normalization (prevents different representations of same character)
    if (typeof str.normalize === 'function') {
        str = str.normalize('NFC');
    }

    // Remove non-characters (U+FDD0-U+FDEF, U+FFFE, U+FFFF)
    str = str.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, '');

    // Remove control characters (except tab, LF, CR)
    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    return str;
}

/**
 * Escape HTML content (for use between tags)
 */
export function escapeHtml(unsafe) {
    const normalized = normalizeInput(unsafe);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Escape HTML attributes (stricter than content)
 */
export function escapeAttr(unsafe) {
    const normalized = normalizeInput(unsafe);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/=/g, '&#x3D;')
        .replace(/`/g, '&#x60;')
        .replace(/\n/g, '&#x0A;')
        .replace(/\r/g, '&#x0D;')
        .replace(/\t/g, '&#x09;');
}

/**
 * Escape URL for use in attributes (preserves : and / which are safe in URLs)
 */
export function escapeUrl(url) {
    const normalized = normalizeInput(url);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/=/g, '&#x3D;')
        .replace(/`/g, '&#x60;');
    // Note: Don't escape : or / in URLs - they're safe and expected in attributes
}

/**
 * Sanitize URL - blocks dangerous schemes
 */
function sanitizeUrl(url) {
    const normalized = normalizeInput(url);

    // Remove all whitespace (including Unicode whitespace)
    const cleaned = normalized.replace(/\s/g, '');

    // Decode HTML entities that might hide the scheme
    const decoded = cleaned
        .replace(/&colon;/gi, ':')
        .replace(/&#58;/g, ':')
        .replace(/&#x3a;/gi, ':')
        .replace(/&sol;/gi, '/')
        .replace(/&#47;/g, '/')
        .replace(/&#x2f;/gi, '/');

    // Extract scheme (everything before first colon)
    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*?):/);

    if (!schemeMatch) {
        // No scheme = relative URL, which is safe
        return escapeUrl(normalized);
    }

    const scheme = schemeMatch[1].toLowerCase();

    // Allowlist of safe schemes
    const safeSchemes = ['http', 'https', 'mailto', 'tel', 'sms', 'ftp', 'ftps'];

    if (!safeSchemes.includes(scheme)) {
        console.warn('[Security] Blocked dangerous URL scheme:', url);
        return '';
    }

    return escapeUrl(normalized);
}

/**
 * Detect interpolation context by analyzing preceding string
 * Returns: { type, tagName, attrName }
 * type: 'content' | 'attribute' | 'url' | 'event-handler' | 'dangerous' | 'tag' | 'custom-element-attr'
 */
function detectContext(precedingString) {
    // Look at last 300 characters for context
    const relevant = precedingString.slice(-300);

    // Remove HTML comments (they can hide context)
    const withoutComments = relevant.replace(/<!--[\s\S]*?-->/g, '');

    const lastOpenTag = withoutComments.lastIndexOf('<');
    const lastCloseTag = withoutComments.lastIndexOf('>');

    // If > comes after <, we're in content (between tags)
    if (lastCloseTag > lastOpenTag) {
        return { type: 'content' };
    }

    // We're inside a tag - check if we're in an attribute value
    const afterTag = withoutComments.slice(lastOpenTag);

    // Extract tag name
    const tagMatch = afterTag.match(/^<([\w-]+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';

    // Match attribute pattern: attribute-name="value or attribute-name='value
    const attrMatch = afterTag.match(/\s([\w-]+)\s*=\s*["']([^"']*)$/);

    if (!attrMatch) {
        // Inside tag but not in attribute value
        return { type: 'tag', tagName };
    }

    const attrName = attrMatch[1].toLowerCase();

    // Block event handlers (onclick, onload, etc.)
    if (attrName.startsWith('on')) {
        return { type: 'event-handler', tagName, attrName };
    }

    // Detect URL attributes
    if (URL_ATTRIBUTES.has(attrName)) {
        return { type: 'url', tagName, attrName };
    }

    // Detect dangerous attributes
    if (DANGEROUS_ATTRIBUTES.has(attrName)) {
        return { type: 'dangerous', tagName, attrName };
    }

    // Check if this is a custom element (has hyphen in tag name)
    if (tagName.includes('-')) {
        return { type: 'custom-element-attr', tagName, attrName };
    }

    // Regular attribute - return attribute name for boolean handling
    return { type: 'attribute', tagName, attrName };
}

/**
 * Tagged template literal with automatic context-aware escaping
 *
 * Returns a special object that can be nested without double-escaping
 */
export function html(strings, ...values) {
    let result = '';

    strings.forEach((string, i) => {
        result += string;

        if (i < values.length) {
            const value = values[i];

            // Allow explicit raw() for trusted HTML
            if (value && value.__raw__) {
                result += normalizeInput(value.toString());
                return;
            }

            // Allow nested html() calls without double-escaping
            if (value && value.__html__) {
                result += value.toString();
                return;
            }

            // Automatically detect context and apply appropriate escaping
            const context = detectContext(result);

            switch (context.type) {
                case 'custom-element-attr':
                    // For custom elements, store actual value and insert marker
                    // This allows passing objects/arrays without stringification
                    if (typeof value === 'object' && value !== null) {
                        const id = propIdCounter++;
                        propRegistry.set(id, value);
                        result += `__PROP_${id}__`;
                    } else {
                        // Primitives still get escaped
                        result += escapeAttr(value);
                    }
                    break;

                case 'url':
                    // Automatically sanitize URLs in href, src, etc.
                    result += sanitizeUrl(value);
                    break;

                case 'attribute':
                    // Handle undefined/null: remove attribute entirely
                    if (value === undefined || value === null) {
                        result += '\x00REMOVE_ATTR\x00';
                        break;
                    }

                    // Handle booleans in boolean attributes
                    if (typeof value === 'boolean' && BOOLEAN_ATTRIBUTES.has(context.attrName)) {
                        // true → empty value (selected=""), false → remove attribute
                        result += value ? '' : '\x00REMOVE_ATTR\x00';
                    } else if (typeof value === 'boolean') {
                        // Non-boolean attributes: convert to string
                        result += escapeAttr(String(value));
                    } else {
                        // String/number values: escape normally
                        result += escapeAttr(value);
                    }
                    break;

                case 'event-handler':
                    // Block interpolation in event handlers
                    console.error(
                        '[Security] Interpolation blocked in event handler attribute.',
                        'Use on-event="method" syntax instead.',
                        'Value was:', value
                    );
                    result += '';
                    break;

                case 'dangerous':
                    // Block interpolation in dangerous attributes
                    console.error(
                        '[Security] Interpolation blocked in dangerous attribute (style, srcdoc).',
                        'Value was:', value
                    );
                    result += '';
                    break;

                case 'tag':
                    // Block interpolation in tag context (e.g., attribute names)
                    // Use attribute value context instead: selected="${condition}"
                    console.error(
                        '[Security] Interpolation blocked in tag context (not in attribute value).',
                        'Use attribute value context instead: attr="${value}"',
                        'Value was:', value
                    );
                    result += '';
                    break;

                case 'content':
                default:
                    // Escape for HTML content
                    result += escapeHtml(value);
                    break;
            }
        }
    });

    // Clean up attributes marked for removal
    // Pattern: attribute-name="\x00REMOVE_ATTR\x00" or attribute-name='\x00REMOVE_ATTR\x00'
    result = result.replace(/\s+[\w-]+\s*=\s*["']\x00REMOVE_ATTR\x00["']/g, '');

    // Return a special object that marks this as already-processed HTML
    return {
        __html__: true,
        toString() {
            return result;
        }
    };
}

/**
 * Mark string as safe raw HTML (use sparingly!)
 * Only use this for content you absolutely trust (e.g., your own API responses)
 */
export function raw(htmlString) {
    return {
        __raw__: true,
        toString() {
            return htmlString;
        }
    };
}

/**
 * For debugging: check what context would be detected
 */
export function debugContext(templateString) {
    return detectContext(templateString);
}

/**
 * Check if a string is a prop marker and retrieve the actual value
 * Returns null if not a prop marker
 * Note: Values are kept in registry and cleaned up later via WeakMap GC
 */
export function getPropValue(str) {
    if (typeof str !== 'string') return null;

    const match = str.match(/^__PROP_(\d+)__$/);
    if (match) {
        const id = parseInt(match[1]);
        const value = propRegistry.get(id);
        // Don't delete immediately - let multiple reads happen
        // Registry will grow but numbers are small and it clears on page nav
        return value;
    }
    return null;
}

/**
 * Manual cleanup of old prop markers (called periodically if needed)
 */
export function cleanupPropRegistry() {
    // Keep only the last 1000 entries
    if (propRegistry.size > 1000) {
        const entries = Array.from(propRegistry.keys()).sort((a, b) => a - b);
        const toDelete = entries.slice(0, entries.length - 1000);
        toDelete.forEach(id => propRegistry.delete(id));
    }
}

/**
 * Conditional rendering helper
 * Returns the result if condition is truthy, otherwise returns empty string or else clause
 */
export function when(condition, thenValue, elseValue = '') {
    const result = condition ? thenValue : elseValue;

    // Handle html template objects
    if (result && result.__html__) {
        return result;
    }

    // Handle functions (lazy evaluation)
    if (typeof result === 'function') {
        return when(condition, result());
    }

    // Otherwise return as-is
    return result;
}

/**
 * Loop rendering helper
 * Maps array items to templates and returns safe concatenated HTML
 */
export function each(array, mapFn) {
    if (!array || !Array.isArray(array)) {
        return raw('');
    }

    const results = array.map(mapFn);

    // Join all html objects together
    const joined = results.map(r => {
        if (r && r.__html__) {
            return r.toString();
        }
        return escapeHtml(r);
    }).join('');

    return raw(joined);
}
