/**
 * @fileoverview Simple Virtual DOM Implementation
 * Provides efficient DOM diffing and patching to avoid unnecessary re-renders.
 * Key features: preserves focus, only updates changed elements, handles framework attributes.
 * @module core/vdom
 */

/**
 * Parses HTML string into a DocumentFragment.
 * Used internally for creating temporary DOM nodes for diffing.
 *
 * @param {string} html - HTML string to parse
 * @returns {DocumentFragment} Parsed DOM fragment
 * @private
 */
export function parseHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
}

/**
 * Diff and patch DOM efficiently
 * Only updates what changed, preserving focus and state
 */
export function patch(parent, oldNode, newHTML) {
    const newFragment = parseHTML(newHTML);
    const newNode = newFragment.firstChild;

    // If no old node, just append new
    if (!oldNode) {
        if (newNode) {
            parent.appendChild(newNode);
        }
        return newNode;
    }

    // If no new node, remove old
    if (!newNode) {
        parent.removeChild(oldNode);
        return null;
    }

    // If nodes are different types, replace
    if (oldNode.nodeType !== newNode.nodeType ||
        oldNode.nodeName !== newNode.nodeName) {
        parent.replaceChild(newNode, oldNode);
        return newNode;
    }

    // Text nodes - update if different
    if (oldNode.nodeType === Node.TEXT_NODE) {
        if (oldNode.nodeValue !== newNode.nodeValue) {
            oldNode.nodeValue = newNode.nodeValue;
        }
        return oldNode;
    }

    // Element nodes - diff attributes and children
    if (oldNode.nodeType === Node.ELEMENT_NODE) {
        // Update attributes
        updateAttributes(oldNode, newNode);

        // Diff children
        const oldChildren = Array.from(oldNode.childNodes);
        const newChildren = Array.from(newNode.childNodes);

        // Patch existing children
        const maxLength = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < maxLength; i++) {
            if (i >= oldChildren.length) {
                // New child, append it
                oldNode.appendChild(newChildren[i]);
            } else if (i >= newChildren.length) {
                // Old child no longer exists, remove it
                oldNode.removeChild(oldChildren[i]);
            } else {
                // Recursively patch child
                patch(oldNode, oldChildren[i], newChildren[i].outerHTML || newChildren[i].nodeValue);
            }
        }
    }

    return oldNode;
}

/**
 * Update element attributes efficiently
 */
function updateAttributes(oldEl, newEl) {
    // Skip x- attributes (two-way binding) - they're handled by the component system
    const isFrameworkAttr = (name) => name.startsWith('x-');

    // Remove old attributes that don't exist in new
    const oldAttrs = Array.from(oldEl.attributes || []);
    for (const attr of oldAttrs) {
        if (isFrameworkAttr(attr.name)) continue;
        if (!newEl.hasAttribute(attr.name)) {
            oldEl.removeAttribute(attr.name);
        }
    }

    // Add or update new attributes (on- attributes are copied, x- attributes are skipped)
    const newAttrs = Array.from(newEl.attributes || []);
    for (const attr of newAttrs) {
        if (isFrameworkAttr(attr.name)) continue;
        const oldValue = oldEl.getAttribute(attr.name);
        if (oldValue !== attr.value) {
            try {
                oldEl.setAttribute(attr.name, attr.value);
            } catch (e) {
                // Skip attributes with invalid characters
                console.warn(`Could not set attribute ${attr.name}:`, e.message);
            }
        }
    }
}

/**
 * Safely clones a DOM node while filtering out framework-specific attributes.
 * Framework attributes (starting with x-) should be handled by the component system
 * not cloned into the DOM. on- attributes are valid HTML and should be cloned.
 *
 * @param {Node} node - The DOM node to clone
 * @returns {Node} Cloned node without x- framework attributes
 * @private
 */
function safeClone(node) {
    const clone = node.cloneNode(false);

    // Clone attributes except x- framework ones (on- attributes are valid HTML and are cloned)
    if (node.attributes) {
        for (const attr of node.attributes) {
            if (!attr.name.startsWith('x-')) {
                try {
                    clone.setAttribute(attr.name, attr.value);
                } catch (e) {
                    // Skip invalid attributes
                }
            }
        }
    }

    // Recursively clone children
    for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            clone.appendChild(child.cloneNode());
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            clone.appendChild(safeClone(child));
        }
    }

    return clone;
}

/**
 * Efficiently patches a container's HTML by diffing against new HTML.
 * Only updates elements that have actually changed, preserving:
 * - Focus on form inputs
 * - Cursor position in text fields
 * - Form element state (checked, selected, etc.)
 * - Event listeners attached by the framework
 *
 * This is the main entry point for virtual DOM updates.
 *
 * @param {HTMLElement} container - The container element to update
 * @param {string} newHTML - The new HTML string to render
 * @example
 * const container = document.getElementById('app');
 * patchHTML(container, '<div>Updated content</div>');
 * // Only changed elements are updated, focus is preserved
 */
export function patchHTML(container, newHTML) {
    // For first render or if container is empty
    if (container.children.length === 0) {
        container.innerHTML = newHTML;
        return;
    }

    // Create a temporary container with new content
    const temp = document.createElement('div');
    temp.innerHTML = newHTML;

    // Diff and patch each top-level child
    const oldChildren = Array.from(container.childNodes);
    const newChildren = Array.from(temp.childNodes);

    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = maxLength - 1; i >= 0; i--) {
        if (i >= newChildren.length) {
            // Remove extra old children
            if (oldChildren[i]) {
                container.removeChild(oldChildren[i]);
            }
        } else if (i >= oldChildren.length) {
            // Add new children (clone to preserve framework attributes like @ and x-)
            container.insertBefore(newChildren[i].cloneNode(true), container.firstChild);
        } else {
            // Diff existing children
            diffAndPatch(container, oldChildren[i], newChildren[i]);
        }
    }
}

/**
 * Recursively diff and patch nodes
 */
function diffAndPatch(parent, oldNode, newNode) {
    // Different node types - replace
    if (!oldNode || !newNode ||
        oldNode.nodeType !== newNode.nodeType ||
        oldNode.nodeName !== newNode.nodeName) {
        if (oldNode && parent.contains(oldNode)) {
            parent.replaceChild(newNode.cloneNode(true), oldNode);
        }
        return;
    }

    // Text nodes
    if (oldNode.nodeType === Node.TEXT_NODE) {
        if (oldNode.nodeValue !== newNode.nodeValue) {
            oldNode.nodeValue = newNode.nodeValue;
        }
        return;
    }

    // Element nodes
    if (oldNode.nodeType === Node.ELEMENT_NODE) {
        // Update attributes for all elements
        updateAttributes(oldNode, newNode);

        // Special handling for custom elements (Web Components)
        const isCustomElement = oldNode.nodeName.includes('-');

        // Custom elements without Shadow DOM manage their own children
        // Skip diffing to prevent parent VDOM from interfering
        // (Components use template() method or connectedCallback to manage content)
        if (isCustomElement && !oldNode.shadowRoot) {
            // Component manages its own light DOM children, don't diff them
            return;
        }

        // For custom elements with Shadow DOM, skip diffing the shadow DOM internals
        // but continue to diff light DOM children below (slotted content)
        if (isCustomElement && oldNode.shadowRoot) {
            // Shadow DOM internals are managed by the component
            // Light DOM children (slotted content) are diffed below
        }

        // Special handling for form inputs - preserve value and focus
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(oldNode.nodeName);
        const hasFocus = document.activeElement === oldNode ||
                        (parent.getRootNode() instanceof ShadowRoot &&
                         parent.getRootNode().activeElement === oldNode);

        // For focused inputs, preserve the DOM value
        if (isInput && hasFocus) {
            // Don't update children or value
            return;
        }

        // Diff children
        const oldChildren = Array.from(oldNode.childNodes);
        const newChildren = Array.from(newNode.childNodes);

        // Remove extra old children
        for (let i = oldChildren.length - 1; i >= newChildren.length; i--) {
            oldNode.removeChild(oldChildren[i]);
        }

        // Update or add children
        for (let i = 0; i < newChildren.length; i++) {
            if (i < oldChildren.length) {
                diffAndPatch(oldNode, oldChildren[i], newChildren[i]);
            } else {
                oldNode.appendChild(newChildren[i].cloneNode(true));
            }
        }
    }
}

/**
 * Memoization helper for expensive computations.
 * Caches the result of a function and only recomputes when dependencies change.
 * Useful for optimizing expensive template rendering, especially large tables.
 *
 * @param {Function} fn - The function to memoize
 * @param {Array} deps - Array of dependencies to watch for changes
 * @returns {*} The cached or newly computed result
 * @example
 * // In a component template:
 * template() {
 *     const rows = memo(() => {
 *         return this.state.largeDataset.map(item => {
 *             return `<tr><td>${item.name}</td><td>${item.value}</td></tr>`;
 *         }).join('');
 *     }, [this, this.state.largeDataset]);
 *
 *     return html`<table>${raw(rows)}</table>`;
 * }
 */
const memoCache = new WeakMap();

export function memo(fn, deps) {
    if (!deps || deps.length === 0) {
        return fn();
    }

    // Use first dep as cache key (usually 'this' or a store)
    const cacheKey = deps[0];

    if (!memoCache.has(cacheKey)) {
        memoCache.set(cacheKey, { deps: null, result: null });
    }

    const cached = memoCache.get(cacheKey);

    // Check if dependencies changed
    const depsChanged = !cached.deps ||
        cached.deps.length !== deps.length ||
        cached.deps.some((dep, i) => dep !== deps[i]);

    if (depsChanged) {
        cached.result = fn();
        cached.deps = deps;
    }

    return cached.result;
}
