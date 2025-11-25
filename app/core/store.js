/**
 * Store System
 * Simple reactive stores with subscription support
 */

import { reactive, createEffect } from './reactivity.js';

/**
 * Create a writable store with reactive state
 */
export function createStore(initial) {
    const state = reactive(initial);
    const subscribers = new Set();

    // Helper to notify all subscribers
    function notifySubscribers() {
        subscribers.forEach(fn => {
            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber:', error);
            }
        });
    }

    // Use createEffect to automatically notify on any state change
    // Skip the first run (initial effect run)
    let effectRunCount = 0;
    createEffect(() => {
        effectRunCount++;

        // Access all properties to track them
        JSON.stringify(state);

        // Don't notify on first run, always notify after that
        if (effectRunCount > 1) {
            notifySubscribers();
        }
    });

    return {
        get state() {
            return state;
        },

        /**
         * Subscribe to store changes
         * Returns unsubscribe function
         */
        subscribe(fn) {
            subscribers.add(fn);
            // Call immediately with current state
            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber (initial call):', error);
            }

            return () => {
                subscribers.delete(fn);
            };
        },

        /**
         * Update store with new values
         */
        set(newState) {
            Object.assign(state, newState);
        },

        /**
         * Update store using updater function
         */
        update(updater) {
            const newState = updater(state);
            if (newState) {
                Object.assign(state, newState);
            }
        }
    };
}

/**
 * Create a store that persists to localStorage
 */
export function persistentStore(key, initial) {
    // Try to load from localStorage
    let stored = initial;
    try {
        const item = localStorage.getItem(key);
        if (item) {
            stored = JSON.parse(item);
        }
    } catch (e) {
        console.warn(`Failed to load store "${key}" from localStorage:`, e);
    }

    const store = createStore(stored);

    // Save to localStorage on changes
    store.subscribe((state) => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn(`Failed to save store "${key}" to localStorage:`, e);
        }
    });

    return store;
}

/**
 * Create a derived store that computes from other stores
 */
export function derived(stores, fn) {
    const derivedStore = createStore(null);

    // If single store, convert to array
    const storeArray = Array.isArray(stores) ? stores : [stores];

    // Subscribe to all source stores
    const unsubscribers = storeArray.map(store => {
        return store.subscribe(() => {
            const values = storeArray.map(s => s.state);
            const result = fn(...values);
            derivedStore.set(result);
        });
    });

    // Return store with cleanup
    derivedStore.destroy = () => {
        unsubscribers.forEach(unsub => unsub());
    };

    return derivedStore;
}

/**
 * Create a readable store (no set/update methods)
 */
export function readable(initial, start) {
    const store = createStore(initial);

    // Call start function with set callback
    if (start) {
        start((value) => store.set(value));
    }

    // Return read-only interface
    return {
        get state() {
            return store.state;
        },
        subscribe: store.subscribe.bind(store)
    };
}
