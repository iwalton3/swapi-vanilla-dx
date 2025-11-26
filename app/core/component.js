/**
 * Component System
 * Web Components-based system with reactive state (using Preact VDOM)
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';
import { render as preactRender } from '../vendor/preact/index.js';
import { applyValues } from './template-compiler.js';
import { html, getPropValue, getEventHandler, cleanupPropRegistry } from './template.js';

// Global render counter for periodic cleanup
let globalRenderCount = 0;

// Debug logging control - only enable for specific components
const DEBUG_COMPONENTS = new Set([
    // Add component names here to debug them, e.g.:
    // 'HOME-PAGE',
    // 'X-TILES',
    // 'USER-TOOLS'
]);

/**
 * Define a custom component
 */
export function defineComponent(name, options) {
    class Component extends HTMLElement {
        constructor() {
            super();

            // Initialize reactive state
            this.state = reactive(options.data ? options.data.call(this) : {});

            // Store props
            this.props = {};

            // Bind all methods to this instance
            if (options.methods) {
                for (const [name, method] of Object.entries(options.methods)) {
                    this[name] = method.bind(this);
                }
            }

            // Lifecycle flags
            this._isMounted = false;
            this._isDestroyed = false;

            // Cleanup functions
            this._cleanups = [];

            // Track bound event listeners for cleanup
            this._boundListeners = [];

            // Track model bindings for cleanup
            this._modelListeners = [];
            this._modelEffects = [];

            // Template caching for performance
            this._cachedTemplate = null;
            this._lastStateSnapshot = null;

            // Create a container div for Preact to render into
            // This gives us a stable mount point for Preact's reconciliation
            this._container = null;
        }

        connectedCallback() {
            if (this._isDestroyed) return;

            // Setup property setters for better DX
            this._setupPropertySetters();

            // Parse attributes as props
            this._parseAttributes();

            // Apply any pending props from Preact ref callbacks that fired before mount
            if (this._pendingProps) {
                for (const [name, value] of Object.entries(this._pendingProps)) {
                    // Set directly on props (not via setter) to avoid premature render
                    this.props[name] = value;
                }
                delete this._pendingProps;
            }

            // Mark as mounted BEFORE initial render to prevent double-render
            this._isMounted = true;

            // Setup reactivity - re-render on state changes
            const { dispose: disposeRenderEffect } = createEffect(() => {
                // Track all state dependencies efficiently
                trackAllDependencies(this.state);

                // Only re-render if component is mounted
                if (this._isMounted) {
                    this.render();
                }
            });

            // Store disposal function for cleanup
            this._cleanups.push(disposeRenderEffect);

            // Call mounted hook
            if (options.mounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed) {
                        options.mounted.call(this);
                    }
                });
            }
        }

        disconnectedCallback() {
            this._isDestroyed = true;
            this._isMounted = false;

            // Call unmounted hook
            if (options.unmounted) {
                options.unmounted.call(this);
            }

            // Unmount Preact tree
            preactRender(null, this);

            // Run cleanup functions
            this._cleanups.forEach(fn => fn());
            this._cleanups = [];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            // Only react to changes after initial mount
            if (!this._isMounted || oldValue === newValue) return;

            // Update props
            if (options.props && name in options.props) {
                // Check if this is a prop marker from template system
                const propValue = getPropValue(newValue);
                if (propValue !== null) {
                    // Use the actual object/array value
                    this.props[name] = propValue;
                } else {
                    // Try to parse JSON for complex types
                    try {
                        this.props[name] = JSON.parse(newValue);
                    } catch {
                        // If not JSON, use as string
                        this.props[name] = newValue;
                    }
                }
                // Trigger re-render
                this.render();
            }
        }

        static get observedAttributes() {
            // Observe all props as attributes
            return options.props ? Object.keys(options.props) : [];
        }

        _setupPropertySetters() {
            // Create property setters that automatically update props and trigger re-render
            if (options.props) {
                // Security: Block reserved property names to prevent DOM clobbering
                const reservedNames = new Set([
                    'constructor', '__proto__', 'prototype', 'toString',
                    'valueOf', 'hasOwnProperty', 'isPrototypeOf'
                ]);

                for (const propName of Object.keys(options.props)) {
                    if (reservedNames.has(propName)) {
                        console.warn(`[Security] Skipping reserved prop name: ${propName}`);
                        continue;
                    }

                    // Check if property was already set (before connectedCallback)
                    // Store it so we can restore after defining the property setter
                    const existingValue = this.hasOwnProperty(propName) ? this[propName] : undefined;

                    const privateProp = `_${propName}`;

                    Object.defineProperty(this, propName, {
                        get() {
                            return this.props[propName];
                        },
                        set(value) {
                            const isDebug = DEBUG_COMPONENTS.has(this.tagName);
                            if (isDebug) {
                                console.log(`[${this.tagName}] Prop "${propName}" changed:`, value);
                            }
                            this.props[propName] = value;
                            // Re-parse and re-render
                            if (this._isMounted) {
                                this.render();
                            }
                        },
                        enumerable: true,
                        configurable: true
                    });

                    // Restore the pre-existing value if there was one
                    if (existingValue !== undefined) {
                        this.props[propName] = existingValue;
                    }
                }
            }
        }

        _parseAttributes() {
            // Copy attribute values and direct properties to props
            if (options.props) {
                for (const propName of Object.keys(options.props)) {
                    // Check if property was set directly on element (before connectedCallback)
                    // This happens when VDOM sets el[propName] = value before adding to DOM
                    if (propName in this && this[propName] !== undefined && this[propName] !== options.props[propName]) {
                        // Property was set, use it
                        const value = this[propName];
                        this.props[propName] = value;
                        continue;
                    }

                    // Check for attribute
                    const attrValue = this.getAttribute(propName);
                    if (attrValue !== null) {
                        // Check if this is a prop marker from template system
                        const propValue = getPropValue(attrValue);
                        if (propValue !== null) {
                            // Use the actual object/array value
                            this.props[propName] = propValue;
                        } else {
                            // Try to parse JSON for complex types
                            try {
                                this.props[propName] = JSON.parse(attrValue);
                            } catch {
                                // If not JSON, use as string
                                this.props[propName] = attrValue;
                            }
                        }
                    } else if (!(propName in this.props)) {
                        // Use default from props definition if not already set
                        this.props[propName] = options.props[propName];
                    }
                }
            }
        }

        render() {
            if (!options.template) return;

            const isDebug = DEBUG_COMPONENTS.has(this.tagName);

            // Periodic cleanup of prop and event registries (every 100 renders)
            globalRenderCount++;
            if (globalRenderCount % 100 === 0) {
                cleanupPropRegistry();
            }

            // Inject styles into document head if not already done
            if (options.styles && !this._stylesInjected) {
                const styleId = `component-styles-${options.name || this.tagName}`;
                if (!document.getElementById(styleId)) {
                    const styleEl = document.createElement('style');
                    styleEl.id = styleId;

                    // Replace :host selector with component tag name
                    let processedStyles = options.styles.replace(/:host/g, this.tagName.toLowerCase());

                    // Wrap all rules with component tag name for scoping (basic CSS namespacing)
                    // This prevents component styles from leaking globally
                    // Split by } to get individual rules, then prefix each selector
                    processedStyles = processedStyles
                        .split('}')
                        .map(rule => {
                            if (!rule.trim()) return '';
                            // Check if rule already starts with tag name
                            const trimmed = rule.trim();
                            if (trimmed.startsWith(this.tagName.toLowerCase())) {
                                return rule + '}';
                            }
                            // Prefix selector with tag name
                            const parts = rule.split('{');
                            if (parts.length === 2) {
                                const selector = parts[0].trim();
                                const body = parts[1];
                                // Split multiple selectors by comma
                                const selectors = selector.split(',').map(s => {
                                    s = s.trim();
                                    // Don't prefix @-rules, *, or body/html selectors
                                    if (s.startsWith('@') || s === '*' || s === 'body' || s === 'html') {
                                        return s;
                                    }
                                    return `${this.tagName.toLowerCase()} ${s}`;
                                }).join(', ');
                                return `${selectors} { ${body}}`;
                            }
                            return rule + '}';
                        })
                        .join('\n');

                    styleEl.textContent = processedStyles;
                    document.head.appendChild(styleEl);
                }
                this._stylesInjected = true;
            }

            // Call template function to get compiled tree
            const templateResult = options.template.call(this);

            // Convert compiled tree to Preact elements
            if (templateResult && templateResult._compiled) {
                if (isDebug) {
                    console.log(`\n[${this.tagName}] Rendering with compiled template`);
                    // Deep clone to avoid proxy issues when logging
                    try {
                        console.log(`[${this.tagName}] State:`, JSON.stringify(this.state, null, 2));
                        console.log(`[${this.tagName}] Props:`, JSON.stringify(this.props, null, 2));
                    } catch (e) {
                        console.log(`[${this.tagName}] State (raw):`, this.state);
                        console.log(`[${this.tagName}] Props (raw):`, this.props);
                    }
                }

                // Apply values and convert to Preact VNode
                const preactElement = applyValues(
                    templateResult._compiled,
                    templateResult._values || [],
                    this
                );

                // Render using Preact's reconciliation
                // Preact automatically maintains vdom state between renders
                preactRender(preactElement, this);
            } else {
                // Fallback: String-based templates (for tests and legacy components)
                const templateString = templateResult && templateResult.toString
                    ? templateResult.toString()
                    : String(templateResult || '');

                // Simple innerHTML replacement for string templates
                this.innerHTML = templateString;

                // Bind events for string templates (Preact doesn't handle these)
                this._bindEvents(this);
            }

            // Call afterRender hook if provided
            if (options.afterRender && this._isMounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed) {
                        options.afterRender.call(this);
                    }
                });
            }
        }

        _cleanupEventListeners() {
            // Remove all tracked event listeners
            this._boundListeners.forEach(({ element, eventName, listener }) => {
                element.removeEventListener(eventName, listener);
            });
            this._boundListeners = [];
        }

        _bindEvents(root) {
            // Clean up old listeners first
            this._cleanupEventListeners();

            // Find all elements with on-* attributes
            const allElements = root.querySelectorAll('*');

            allElements.forEach(el => {
                // Check all attributes for on- prefix
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on-')) {
                        const fullAttrName = attr.name;
                        const attrValue = attr.value;

                        // Parse event name and modifiers
                        // Format: on-eventName or on-eventName-modifier
                        const parts = fullAttrName.substring(3).split('-');
                        const eventName = parts[0];
                        const modifier = parts[1];

                        // Check if this is an event handler marker from template
                        const eventHandler = getEventHandler(attrValue);

                        // Create event listener
                        const listener = (e) => {
                            // Handle modifiers
                            if (modifier === 'prevent') {
                                e.preventDefault();
                            }
                            if (modifier === 'stop') {
                                e.stopPropagation();
                            }

                            // If event handler marker, call the stored function
                            if (eventHandler) {
                                eventHandler.call(this, e);
                            }
                            // Otherwise look up method by name (if we have methods)
                            else if (options.methods && this[attrValue]) {
                                this[attrValue](e);
                            } else if (!eventHandler) {
                                console.warn(`Method "${attrValue}" not found in component`);
                            }
                        };

                        // Add event listener
                        el.addEventListener(eventName, listener);

                        // Track for cleanup
                        this._boundListeners.push({ element: el, eventName, listener });
                    }
                });
            });
        }

        _setupBindings(root) {
            // Clean up old model bindings to prevent memory leaks
            this._modelListeners.forEach(({ element, listener }) => {
                element.removeEventListener('input', listener);
            });
            this._modelListeners = [];

            // Dispose old model effects
            if (this._modelEffects) {
                this._modelEffects.forEach(dispose => dispose());
            }
            this._modelEffects = [];

            // Setup x-model bindings (two-way)
            const modelElements = root.querySelectorAll('[x-model]');

            modelElements.forEach(el => {
                const prop = el.getAttribute('x-model');
                // Don't remove x-model attribute - we need it on subsequent renders

                // Set initial value
                if (prop in this.state) {
                    el.value = this.state[prop];
                }

                // Update state on input - store listener for cleanup
                const listener = (e) => {
                    this.state[prop] = e.target.value;
                };

                el.addEventListener('input', listener);
                this._modelListeners.push({ element: el, listener });

                // Update element when state changes
                const { dispose } = createEffect(() => {
                    if (el.value !== this.state[prop]) {
                        el.value = this.state[prop];
                    }
                });

                // Store dispose function
                this._modelEffects.push(dispose);
            });
        }

        // Helper method to access methods from component
        $method(name) {
            return options.methods?.[name]?.bind(this);
        }
    }

    // Register the custom element
    if (!customElements.get(name)) {
        customElements.define(name, Component);
    }

    return Component;
}

/**
 * Create a simple functional component (just a template function)
 */
export function createComponent(templateFn) {
    return templateFn;
}
