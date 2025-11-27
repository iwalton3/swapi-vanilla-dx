/**
 * Framework Library - Barrel Export
 *
 * Zero-dependency reactive web framework with:
 * - Web Components based architecture
 * - Vue 3-style proxy reactivity
 * - Preact rendering for efficient DOM updates
 * - Compile-once template system
 * - Template helpers (html, when, each, raw)
 * - Reactive stores
 */

// Core component system
export { defineComponent } from './core/component.js';

// Reactivity system
export { reactive, createEffect, computed, trackAllDependencies, isReactive, watch, memo } from './core/reactivity.js';

// Template system
export { html, raw, when, each } from './core/template.js';
export { pruneTemplateCache } from './core/template-compiler.js';

// Store system
export { createStore } from './core/store.js';

// Preact (for advanced usage)
export { h, Fragment, render, Component, createContext } from './vendor/preact/index.js';
