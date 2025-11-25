/**
 * Tests for Reactivity System
 */

import { describe, assert } from './test-runner.js';
import { reactive, createEffect, computed, watch, isReactive } from '../core/reactivity.js';

describe('Reactivity System', function(it) {
    it('creates reactive proxy', () => {
        const obj = reactive({ count: 0 });
        assert.ok(isReactive(obj), 'Object should be reactive');
        assert.equal(obj.count, 0, 'Should preserve values');
    });

    it('tracks dependencies with createEffect', () => {
        const obj = reactive({ count: 0 });
        let effectRuns = 0;
        let capturedValue = 0;

        createEffect(() => {
            capturedValue = obj.count;
            effectRuns++;
        });

        assert.equal(effectRuns, 1, 'Effect should run immediately');
        assert.equal(capturedValue, 0, 'Effect should capture initial value');

        obj.count = 5;
        assert.equal(effectRuns, 2, 'Effect should re-run on change');
        assert.equal(capturedValue, 5, 'Effect should capture new value');
    });

    it('handles nested reactive objects', () => {
        const obj = reactive({
            user: {
                name: 'Alice',
                age: 30
            }
        });

        assert.ok(isReactive(obj.user), 'Nested object should be reactive');

        let capturedName = '';
        createEffect(() => {
            capturedName = obj.user.name;
        });

        obj.user.name = 'Bob';
        assert.equal(capturedName, 'Bob', 'Nested updates should trigger effects');
    });

    it('only triggers effects when values actually change', () => {
        const obj = reactive({ count: 0 });
        let effectRuns = 0;

        createEffect(() => {
            obj.count; // Read to track dependency
            effectRuns++;
        });

        const initialRuns = effectRuns;
        obj.count = 0; // Same value
        assert.equal(effectRuns, initialRuns, 'Should not re-run for same value');

        obj.count = 1; // Different value
        assert.equal(effectRuns, initialRuns + 1, 'Should re-run for different value');
    });

    it('creates computed values', () => {
        const obj = reactive({ a: 1, b: 2 });
        const sum = computed(() => obj.a + obj.b);

        assert.equal(sum(), 3, 'Computed should return correct initial value');

        obj.a = 5;
        assert.equal(sum(), 7, 'Computed should update when dependencies change');
    });

    it('watches reactive values', () => {
        const obj = reactive({ count: 0 });
        let watchedValue = null;
        let oldValue = null;

        watch(
            () => obj.count,
            (newVal, oldVal) => {
                watchedValue = newVal;
                oldValue = oldVal;
            }
        );

        obj.count = 5;
        assert.equal(watchedValue, 5, 'Watch callback should receive new value');
        assert.equal(oldValue, 0, 'Watch callback should receive old value');
    });

    it('handles array mutations', () => {
        const arr = reactive({ items: [1, 2, 3] });
        let sum = 0;

        createEffect(() => {
            sum = arr.items.reduce((a, b) => a + b, 0);
        });

        assert.equal(sum, 6, 'Initial sum should be correct');

        arr.items.push(4);
        assert.equal(sum, 10, 'Array mutations should trigger effects');
    });

    it('returns same proxy for already-reactive object', () => {
        const obj = { count: 0 };
        const proxy1 = reactive(obj);
        const proxy2 = reactive(proxy1);

        assert.equal(proxy1, proxy2, 'Should return same proxy');
    });

    it('handles primitive values', () => {
        const num = reactive(5);
        const str = reactive('hello');
        const bool = reactive(true);

        assert.equal(num, 5, 'Should handle numbers');
        assert.equal(str, 'hello', 'Should handle strings');
        assert.equal(bool, true, 'Should handle booleans');
    });
});
