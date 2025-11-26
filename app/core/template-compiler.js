/**
 * Template Compiler - Compiles HTML templates directly to Preact VNodes
 *
 * Architecture:
 * 1. Parse template string + values into structured AST
 * 2. Create slots for dynamic values
 * 3. Cache compiled template
 * 4. On render: fill slots with values, generate Preact VNodes
 *
 * Performance benefits:
 * - No regex on every render
 * - No HTML string parsing
 * - Direct VNode generation
 * - Optimal Preact reconciliation
 *
 * @module core/template-compiler
 */

import { escapeHtml, escapeAttr, sanitizeUrl, isHtml, isRaw, getEventHandler, getPropValue } from './template.js';
import { h, Fragment } from '../vendor/preact/index.js';

/**
 * @typedef {Object} CompiledTextNode
 * @property {'text'} type - Node type
 * @property {string} [value] - Static text content
 * @property {number} [slot] - Dynamic slot index
 * @property {string} [context] - Context for escaping (content, attribute, url, etc.)
 */

/**
 * @typedef {Object} AttributeDefinition
 * @property {string} [value] - Static attribute value
 * @property {number} [slot] - Dynamic slot index
 * @property {string} [context] - Context for escaping
 * @property {string} [attrName] - Attribute name
 * @property {string} [template] - Template string for partial slots
 */

/**
 * @typedef {Object} EventDefinition
 * @property {number} [slot] - Dynamic slot index for function
 * @property {string} [handler] - Handler marker from registry
 * @property {string} [method] - Method name string
 * @property {string} [modifier] - Event modifier (prevent, stop, etc.)
 */

/**
 * @typedef {Object} CompiledElementNode
 * @property {'element'} type - Node type
 * @property {string} tag - HTML tag name
 * @property {Object.<string, AttributeDefinition>} attrs - Attribute definitions
 * @property {Object.<string, EventDefinition>} events - Event bindings
 * @property {Object.<string, string>} slotProps - Prop markers
 * @property {Array<CompiledNode>} children - Child nodes
 */

/**
 * @typedef {Object} CompiledFragmentNode
 * @property {'fragment'} type - Node type
 * @property {Array<CompiledNode>} children - Child nodes
 */

/**
 * @typedef {CompiledTextNode | CompiledElementNode | CompiledFragmentNode} CompiledNode
 */

/**
 * @typedef {Object} AppliedTextNode
 * @property {'text' | 'html'} type - Node type
 * @property {string} value - Actual text content (escaped)
 */

/**
 * @typedef {Object} AppliedElementNode
 * @property {'element'} type - Node type
 * @property {string} tag - HTML tag name
 * @property {Object.<string, string | Object>} attrs - Applied attributes
 * @property {Object.<string, EventDefinition>} events - Event bindings with handlers
 * @property {Object.<string, string>} slotProps - Prop values
 * @property {Array<AppliedNode>} children - Child nodes with values applied
 */

/**
 * @typedef {Object} AppliedFragmentNode
 * @property {'fragment'} type - Node type
 * @property {Array<AppliedNode>} children - Child nodes
 */

/**
 * @typedef {AppliedTextNode | AppliedElementNode | AppliedFragmentNode} AppliedNode
 */

/** @type {Map<string, CompiledNode>} Template cache - keyed by template strings joined */
const templateCache = new Map();

/**
 * Compile a template string into an optimized tree structure
 * @param {Array<string>} strings - Template literal string parts
 * @returns {CompiledNode} Compiled template with slots for dynamic values
 * @example
 * const strings = ['<div class="', '">', '</div>'];
 * const compiled = compileTemplate(strings);
 * // Returns structured tree with slot for class value
 */
export function compileTemplate(strings) {
    // Create cache key from static strings
    const cacheKey = strings.join('␞'); // Use rare char as separator

    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    // Parse the full template string with slot markers
    let fullTemplate = '';
    for (let i = 0; i < strings.length; i++) {
        fullTemplate += strings[i];
        if (i < strings.length - 1) {
            fullTemplate += `__SLOT_${i}__`;
        }
    }

    // Parse XML into tree structure (preserves all nodes, allows self-closing tags)
    const compiled = parseXMLToTree(fullTemplate);

    // Cache the compiled template
    templateCache.set(cacheKey, compiled);

    return compiled;
}

/**
 * Parse XML string into tree structure
 * Uses DOMParser with XML mode to preserve all text nodes and allow self-closing tags
 */
function parseXMLToTree(xmlString) {
    // List of void elements that should be self-closing
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                          'link', 'meta', 'param', 'source', 'track', 'wbr'];

    // List of boolean attributes that can appear without values in HTML
    const booleanAttrs = ['checked', 'selected', 'disabled', 'readonly', 'multiple',
                         'ismap', 'defer', 'declare', 'noresize', 'nowrap', 'noshade',
                         'compact', 'autofocus', 'required', 'autoplay', 'controls', 'loop',
                         'muted', 'default', 'open', 'reversed', 'scoped', 'seamless',
                         'sortable', 'novalidate', 'formnovalidate', 'itemscope'];

    // Convert boolean attributes to have explicit values for XML compatibility
    // Match: attribute_name followed by whitespace, > or / (not followed by =)
    booleanAttrs.forEach(attr => {
        // Match boolean attribute without value: readonly> or readonly /> or readonly space
        const regex = new RegExp(`\\s(${attr})(?=\\s|>|/)`, 'gi');
        xmlString = xmlString.replace(regex, ` ${attr}="${attr}"`);
    });

    // Auto-close void elements for XML compatibility
    // Match opening tags that aren't already self-closed or followed by a closing tag
    voidElements.forEach(tag => {
        const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
        xmlString = xmlString.replace(regex, `<${tag}$1 />`);
    });

    // Wrap in a root element for XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${xmlString}</root>`, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        console.error('[parseXMLToTree] Parse error:', parseError.textContent);
        console.error('[parseXMLToTree] Input:', xmlString);
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const root = doc.documentElement;
    if (!root) {
        return { type: 'fragment', wrapped: false, children: [] };
    }

    // Walk the parsed DOM and create our tree
    const children = [];
    for (const node of root.childNodes) {
        const tree = nodeToTree(node);
        if (tree) {
            // Flatten nested fragments (happens when text nodes contain multiple slots)
            if (tree.type === 'fragment') {
                children.push(...tree.children);
            } else {
                children.push(tree);
            }
        }
    }

    return {
        type: 'fragment',
        wrapped: false,  // Root template fragments are unwrapped
        children
    };
}

/**
 * Convert a DOM node to our tree structure
 */
function nodeToTree(node) {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        // Check for single slot marker
        const slotMatch = text.match(/^__SLOT_(\d+)__$/);
        if (slotMatch) {
            return {
                type: 'text',
                slot: parseInt(slotMatch[1], 10),
                context: 'content'
            };
        }

        // Check if contains multiple slots (DOMParser merged text nodes)
        if (text.includes('__SLOT_')) {
            // Split on slot markers and create fragment with multiple nodes
            const parts = text.split(/(__SLOT_\d+__)/);
            const children = parts
                .filter(part => part) // Remove empty strings
                .map(part => {
                    const slotMatch = part.match(/^__SLOT_(\d+)__$/);
                    if (slotMatch) {
                        return {
                            type: 'text',
                            slot: parseInt(slotMatch[1], 10),
                            context: 'content'
                        };
                    }
                    return {
                        type: 'text',
                        value: part
                    };
                });

            // Return a fragment with multiple text nodes
            return {
                type: 'fragment',
                wrapped: false,  // Text fragments are unwrapped
                children
            };
        }

        // Static text (keep even if just whitespace - important for spacing)
        if (text) {
            return {
                type: 'text',
                value: text
            };
        }

        return null;
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = {};
        const events = {};
        let slotProps = {};

        // Parse attributes
        for (const attr of node.attributes) {
            const name = attr.name;
            const value = attr.value;

            // x-model two-way binding (convert to value/checked + onInput/onChange)
            if (name === 'x-model') {
                // Determine which attribute and event to use based on input type
                const inputType = node.getAttribute('type');

                if (inputType === 'checkbox') {
                    // Checkboxes use 'checked' attribute and 'change' event
                    attrs['checked'] = {
                        xModel: value,
                        context: 'x-model-checked'
                    };
                    events['change'] = {
                        xModel: value,
                        modifier: null
                    };
                } else if (inputType === 'radio') {
                    // Radio buttons use 'checked' attribute and 'change' event
                    attrs['checked'] = {
                        xModel: value,
                        context: 'x-model-checked'
                    };
                    events['change'] = {
                        xModel: value,
                        modifier: null
                    };
                } else if (inputType === 'file') {
                    // File inputs can't have value binding, only change event
                    events['change'] = {
                        xModel: value,
                        modifier: null
                    };
                } else {
                    // Text, number, select, textarea, etc. use 'value' and 'input'
                    attrs['value'] = {
                        xModel: value,
                        context: 'x-model-value'
                    };
                    events['input'] = {
                        xModel: value,
                        modifier: null
                    };
                }
                continue;
            }

            // Event binding
            if (name.startsWith('on-')) {
                // Parse event name and optional modifier (e.g., "on-submit-prevent")
                const fullEventName = name.substring(3);
                const parts = fullEventName.split('-');
                const eventName = parts[0];
                const modifier = parts.length > 1 ? parts[parts.length - 1] : null;

                const slotMatch = value.match(/^__SLOT_(\d+)__$/);

                if (slotMatch) {
                    events[eventName] = {
                        slot: parseInt(slotMatch[1], 10),
                        modifier: modifier
                    };
                } else if (value.match(/__EVENT_/)) {
                    // Event handler from registry
                    events[eventName] = {
                        handler: value,
                        modifier: modifier
                    };
                } else {
                    // Method name
                    events[eventName] = {
                        method: value,
                        modifier: modifier
                    };
                }
                continue;
            }

            // Check for slot in value
            const slotMatch = value.match(/^__SLOT_(\d+)__$/);
            if (slotMatch) {
                const slotIndex = parseInt(slotMatch[1], 10);

                // Determine context based on attribute name
                let context = 'attribute';
                if (name === 'href' || name === 'src' || name === 'action') {
                    context = 'url';
                } else if (name.startsWith('on')) {
                    context = 'event-handler';
                } else if (name === 'style' || name === 'srcdoc') {
                    context = 'dangerous';
                } else if (tag.includes('-')) {
                    // Custom element
                    context = 'custom-element-attr';
                }

                attrs[name] = {
                    slot: slotIndex,
                    context,
                    attrName: name
                };
            } else if (value.includes('__SLOT_')) {
                // Partial slot (mixed static and dynamic) - rare but possible
                // For now, treat as dynamic
                const matches = value.match(/__SLOT_(\d+)__/g);
                if (matches && matches.length === 1) {
                    const slotIndex = parseInt(matches[0].match(/\d+/)[0], 10);
                    attrs[name] = {
                        slot: slotIndex,
                        context: 'attribute',
                        attrName: name,
                        template: value  // Keep template for interpolation
                    };
                } else {
                    // Multiple slots in one attribute - complex case
                    attrs[name] = { value };
                }
            } else if (value.match(/__PROP_/)) {
                // Prop marker
                slotProps[name] = value;
            } else {
                // Static attribute
                attrs[name] = { value };
            }
        }

        // Parse children recursively
        const children = [];
        for (const child of node.childNodes) {
            const childTree = nodeToTree(child);
            if (childTree) {
                // Flatten nested fragments (happens when text nodes contain multiple slots)
                if (childTree.type === 'fragment') {
                    children.push(...childTree.children);
                } else {
                    children.push(childTree);
                }
            }
        }

        return {
            type: 'element',
            tag,
            attrs,
            events,
            slotProps,
            children
        };
    }

    // Comment node - skip
    if (node.nodeType === Node.COMMENT_NODE) {
        return null;
    }

    return null;
}

/**
 * Apply values to compiled template slots and return Preact VNode
 * @param {Object} compiled - Compiled template
 * @param {Array} values - Dynamic values to fill slots
 * @param {HTMLElement} [component] - Component instance for binding methods
 * @returns {import('../vendor/preact/index.js').VNode | string | null} Preact VNode
 */
export function applyValues(compiled, values, component = null) {
    if (!compiled) return null;

    if (compiled.type === 'fragment') {
        // Apply values to children recursively, returns Preact vnodes
        const children = compiled.children
            .map(child => {
                // Check if child has its own values (from each())
                const childValues = child._itemValues !== undefined ? child._itemValues : values;
                return applyValues(child, childValues, component);
            })
            .filter(child => child !== undefined && child !== false);

        // Return Preact Fragment vnode
        const props = compiled.key !== undefined ? { key: compiled.key } : null;
        return h(Fragment, props, ...children);
    }

    if (compiled.type === 'text') {
        if (compiled.slot !== undefined) {
            let value = values[compiled.slot];

            // Handle html() tagged templates with compiled structure
            if (isHtml(value)) {
                // All html() templates must have _compiled in the new system
                if (!('_compiled' in value)) {
                    console.error('[applyValues] html() template missing _compiled property - this should not happen');
                    return null;
                }

                const compiledValue = value._compiled;

                // If null (from when() returning null), return null directly
                if (compiledValue === null) {
                    return null;
                }

                // Recursively convert ALL nested templates to vnodes
                // Use the nested template's own values, not the parent's
                return applyValues(compiledValue, value._values || [], component);
            }

            // Handle raw()
            if (isRaw(value)) {
                return h('span', {
                    dangerouslySetInnerHTML: { __html: value.toString() }
                });
            }

            // Convert value to string (Preact handles escaping)
            // Handle null/undefined
            if (value === null || value === undefined) {
                return null;
            }

            // Security: For objects, use Object.prototype.toString to prevent
            // malicious custom toString() methods from executing
            if (typeof value === 'object') {
                // Don't call value.toString() - use the safe default instead
                return Object.prototype.toString.call(value);  // Returns "[object Object]"
            }

            // Normalize Unicode to prevent encoding attacks (remove BOM, etc.)
            if (typeof value === 'string') {
                // Remove BOM (U+FEFF) and other zero-width characters
                value = value.replace(/[\uFEFF\u200B-\u200D\uFFFE\uFFFF]/g, '');
            }

            // Return primitives directly
            return value;
        }

        // Static text - return value directly
        return compiled.raw !== undefined ? compiled.raw : compiled.value;
    }

    if (compiled.type === 'element') {
        const props = {};
        const customElementProps = {};
        const isCustomElement = compiled.tag.includes('-');

        // Boolean attributes that should be converted to actual booleans
        const booleanAttrs = new Set([
            'disabled', 'checked', 'selected', 'readonly', 'required',
            'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
            'muted', 'open', 'reversed', 'hidden', 'async', 'defer'
        ]);

        // Apply attribute slots
        for (const [name, attrDef] of Object.entries(compiled.attrs)) {
            let value;

            if (attrDef.xModel !== undefined) {
                // x-model binding: get value from component state
                if (component && component.state) {
                    value = component.state[attrDef.xModel];

                    // For checked attribute (checkbox/radio), ensure boolean
                    if (attrDef.context === 'x-model-checked') {
                        value = !!value;
                    }
                } else {
                    value = attrDef.context === 'x-model-checked' ? false : '';
                }
            } else if (attrDef.slot !== undefined) {
                value = values[attrDef.slot];

                // Handle different contexts
                if (attrDef.context === 'url') {
                    value = sanitizeUrl(value) || '';
                } else if (attrDef.context === 'custom-element-attr') {
                    // For custom elements, check if it's an object/array
                    if (typeof value === 'object' && value !== null) {
                        // Store for ref callback
                        customElementProps[name] = value;
                        continue;
                    } else {
                        value = String(value);
                    }
                } else if (attrDef.context === 'attribute') {
                    // Pass booleans/nulls/undefined as-is, escape strings
                    if (value !== undefined && value !== null && typeof value !== 'boolean') {
                        value = String(value);  // Don't escape for Preact
                    }
                }
            } else if (attrDef.value !== undefined) {
                value = attrDef.value;
            } else {
                continue;
            }

            // Skip undefined/null values
            if (value === undefined || value === null) {
                continue;
            }

            // Remap HTML attributes to Preact props
            let propName = name;
            if (name === 'class') {
                propName = 'className';
            } else if (name === 'for') {
                propName = 'htmlFor';
            }

            // Convert boolean attributes
            if (booleanAttrs.has(propName)) {
                // Only convert actual boolean values, keep strings as-is
                if (value === true) {
                    props[propName] = true;
                } else if (value === false) {
                    props[propName] = false;
                } else if (typeof value === 'string') {
                    // Keep string values as-is (including "true" and "false" strings)
                    props[propName] = value;
                } else {
                    // Convert other values to boolean
                    props[propName] = Boolean(value);
                }
            } else {
                props[propName] = value;
            }
        }

        // If custom element has props, use ref to set them
        if (isCustomElement && Object.keys(customElementProps).length > 0) {
            props.ref = (el) => {
                if (el) {
                    // For framework components that haven't mounted yet, store as pending
                    if ('_isMounted' in el && !el._isMounted) {
                        if (!el._pendingProps) {
                            el._pendingProps = {};
                        }
                        Object.assign(el._pendingProps, customElementProps);
                    } else {
                        // For plain custom elements or mounted components, set directly
                        for (const [name, value] of Object.entries(customElementProps)) {
                            el[name] = value;
                        }
                    }
                }
            };
        }

        // Convert events to Preact event handlers
        for (const [eventName, eventDef] of Object.entries(compiled.events)) {
            const propName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
            let handler = null;

            if (eventDef.xModel !== undefined) {
                // x-model binding: create handler to update component state
                const propName = eventDef.xModel;
                handler = (e) => {
                    if (component && component.state) {
                        const target = e.target;
                        let value;

                        // Determine value based on input type
                        if (target.type === 'checkbox') {
                            value = target.checked;
                        } else if (target.type === 'radio') {
                            // For radio buttons, only update if this one is checked
                            if (target.checked) {
                                value = target.value;
                            } else {
                                return; // Don't update state for unchecked radios
                            }
                        } else if (target.type === 'number' || target.type === 'range') {
                            // Convert to number for number/range inputs
                            value = target.valueAsNumber;
                            // Fall back to string value if valueAsNumber is NaN
                            if (isNaN(value)) {
                                value = target.value;
                            }
                        } else if (target.type === 'file') {
                            // For file inputs, provide the FileList
                            value = target.files;
                        } else {
                            // Default: text, textarea, select, etc.
                            value = target.value;
                        }

                        component.state[propName] = value;
                    }
                };
            } else if (eventDef.slot !== undefined) {
                handler = values[eventDef.slot];
            } else if (eventDef.handler && typeof eventDef.handler === 'function') {
                handler = eventDef.handler;
            } else if (eventDef.method && component && component[eventDef.method]) {
                handler = component[eventDef.method].bind(component);
            }

            if (handler && typeof handler === 'function') {
                // Apply modifiers
                if (eventDef.modifier === 'prevent') {
                    const originalHandler = handler;
                    handler = (e) => {
                        e.preventDefault();
                        return originalHandler(e);
                    };
                }
                if (eventDef.modifier === 'stop') {
                    const originalHandler = handler;
                    handler = (e) => {
                        e.stopPropagation();
                        return originalHandler(e);
                    };
                }

                props[propName] = handler;
            }
        }

        // Add key if present
        if (compiled.key !== undefined) {
            props.key = compiled.key;
        }

        // Apply children recursively
        const children = compiled.children
            .map(child => {
                // Check if child has its own values (from each())
                const childValues = child._itemValues !== undefined ? child._itemValues : values;
                return applyValues(child, childValues, component);
            })
            .filter(child => child !== undefined && child !== false);

        // Return Preact element vnode
        return h(compiled.tag, props, ...children);
    }

    return null;
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache() {
    templateCache.clear();
}

/**
 * Get cache size for debugging
 */
export function getTemplateCacheSize() {
    return templateCache.size;
}
