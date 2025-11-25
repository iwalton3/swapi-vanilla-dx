/**
 * @fileoverview Core Reactivity System
 * Implements Vue 3-style reactivity using JavaScript Proxies for automatic dependency tracking.
 * Provides reactive state, computed values, watchers, and effects.
 * @module core/reactivity
 */

/** @type {Function|null} Current active effect being tracked */
let activeEffect = null;

/** @type {Array<Function>} Stack of effects for nested tracking */
const effectStack = [];

/**
 * Creates a reactive effect that automatically tracks dependencies.
 * The effect runs immediately and re-runs whenever tracked dependencies change.
 *
 * @param {Function} fn - The effect function to run and track
 * @returns {Function} The effect function that can be called to re-run
 * @example
 * const state = reactive({ count: 0 });
 * createEffect(() => {
 *     console.log('Count is:', state.count);
 * });
 * // Logs: Count is: 0
 *
 * state.count = 5;
 * // Logs: Count is: 5 (automatically re-runs)
 */
export function createEffect(fn) {
    const effect = () => {
        activeEffect = effect;
        effectStack.push(effect);
        try {
            return fn();
        } finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
        }
    };

    effect.deps = new Set();
    effect();
    return effect;
}

/**
 * Tracks a dependency between the active effect and a reactive property.
 * Called internally during reactive property access.
 *
 * @param {Object} target - The target object
 * @param {string|symbol} key - The property key being accessed
 * @private
 */
function track(target, key) {
    if (activeEffect) {
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let deps = depsMap.get(key);
        if (!deps) {
            depsMap.set(key, (deps = new Set()));
        }
        deps.add(activeEffect);
        activeEffect.deps.add(deps);
    }
}

/**
 * Triggers all effects that depend on a reactive property.
 * Called internally when a reactive property is modified.
 *
 * @param {Object} target - The target object
 * @param {string|symbol} key - The property key being modified
 * @private
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const deps = depsMap.get(key);
    if (deps) {
        const effects = [...deps];
        effects.forEach(effect => effect());
    }
}

/** @type {WeakMap<Object, Map>} WeakMap to store dependencies for each target object */
const targetMap = new WeakMap();

/**
 * Makes an object reactive using JavaScript Proxy.
 * All property access and mutations are tracked, triggering effects automatically.
 * Nested objects are recursively made reactive.
 *
 * @param {Object|Array} obj - The object or array to make reactive
 * @returns {Proxy} A reactive proxy of the object
 * @example
 * const state = reactive({
 *     count: 0,
 *     nested: { value: 10 }
 * });
 *
 * createEffect(() => console.log(state.count));
 * state.count++; // Effect runs automatically
 * state.nested.value = 20; // Nested changes are tracked too
 */
export function reactive(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // If already a proxy, return as-is
    if (obj.__isReactive) {
        return obj;
    }

    // Don't wrap Set, Map, WeakSet, WeakMap - they have internal slots
    if (obj instanceof Set || obj instanceof Map || obj instanceof WeakSet || obj instanceof WeakMap) {
        return obj;
    }

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            // Special marker property
            if (key === '__isReactive') {
                return true;
            }

            track(target, key);
            const value = Reflect.get(target, key, receiver);

            // For array methods that modify the array, wrap them to trigger updates
            if (Array.isArray(target) && typeof value === 'function') {
                const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (arrayMethods.includes(key)) {
                    return function(...args) {
                        const result = value.apply(target, args);
                        // Trigger on length change
                        trigger(target, 'length');
                        // Trigger on the array itself for iteration
                        trigger(target, Array.isArray(target) ? 'length' : key);
                        return result;
                    };
                }
            }

            // Recursively make nested objects reactive (but skip Sets/Maps)
            if (typeof value === 'object' && value !== null &&
                !(value instanceof Set) && !(value instanceof Map) &&
                !(value instanceof WeakSet) && !(value instanceof WeakMap)) {
                return reactive(value);
            }

            return value;
        },

        set(target, key, value, receiver) {
            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);

            // Only trigger if value actually changed
            if (oldValue !== value) {
                trigger(target, key);
            }

            return result;
        },

        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key);
            trigger(target, key);
            return result;
        }
    });

    return proxy;
}

/**
 * Creates a computed value that automatically updates when dependencies change.
 * The getter function is lazily evaluated and cached until dependencies change.
 *
 * @param {Function} getter - Function that computes the value
 * @returns {Function} Function that returns the current computed value
 * @example
 * const state = reactive({ a: 1, b: 2 });
 * const sum = computed(() => state.a + state.b);
 *
 * console.log(sum()); // 3
 * state.a = 5;
 * console.log(sum()); // 7 (automatically recomputed)
 */
export function computed(getter) {
    let value;
    let dirty = true;
    let firstRun = true;

    // Create effect that tracks dependencies and marks dirty on changes
    createEffect(() => {
        if (firstRun) {
            // First run: just track dependencies
            getter();
            firstRun = false;
        } else {
            // Subsequent runs: mark as dirty
            getter();  // Re-track dependencies
            dirty = true;
        }
    });

    return () => {
        if (dirty) {
            value = getter();
            dirty = false;
        }
        return value;
    };
}

/**
 * Watches a reactive value and runs a callback when it changes.
 * The callback receives the new and old values.
 *
 * @param {Function} fn - Function that returns the value to watch
 * @param {Function} [callback] - Callback to run on changes (receives newValue, oldValue)
 * @example
 * const state = reactive({ count: 0 });
 *
 * watch(
 *     () => state.count,
 *     (newCount, oldCount) => {
 *         console.log(`Count changed from ${oldCount} to ${newCount}`);
 *     }
 * );
 *
 * state.count = 5; // Logs: Count changed from 0 to 5
 */
export function watch(fn, callback) {
    let oldValue;

    createEffect(() => {
        const newValue = fn();
        if (callback && oldValue !== undefined) {
            callback(newValue, oldValue);
        }
        oldValue = newValue;
    });
}

/**
 * Checks if a value is a reactive proxy.
 *
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is reactive, false otherwise
 * @example
 * const obj = { count: 0 };
 * const reactiveObj = reactive(obj);
 *
 * console.log(isReactive(obj)); // false
 * console.log(isReactive(reactiveObj)); // true
 */
export function isReactive(value) {
    return !!(value && value.__isReactive);
}
