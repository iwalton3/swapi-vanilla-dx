/**
 * Tests for Store System
 */

import { describe, assert } from './test-runner.js';
import { createStore } from '../core/store.js';

describe('Store System', function(it) {
    it('creates store with initial state', () => {
        const store = createStore({ count: 0 });
        assert.equal(store.state.count, 0, 'Should have initial state');
    });

    it('allows state updates via set', () => {
        const store = createStore({ count: 0 });
        store.set({ count: 5 });
        assert.equal(store.state.count, 5, 'Should update state');
    });

    it('allows state updates via update function', () => {
        const store = createStore({ count: 0 });
        store.update(s => ({ count: s.count + 1 }));
        assert.equal(store.state.count, 1, 'Should increment count');
    });

    it('notifies subscribers of changes', async () => {
        const store = createStore({ count: 0 });
        let notified = false;
        let capturedValue = 0;

        store.subscribe(state => {
            notified = true;
            capturedValue = state.count;
        });

        assert.ok(notified, 'Should notify immediately on subscribe');
        assert.equal(capturedValue, 0, 'Should receive initial value');

        notified = false;
        store.state.count = 5;

        // Notification should be synchronous, but add small delay to be safe
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.ok(notified, 'Should notify on state change');
        assert.equal(capturedValue, 5, 'Should receive new value');
    });

    it('returns unsubscribe function', () => {
        const store = createStore({ count: 0 });
        let notifications = 0;

        const unsubscribe = store.subscribe(() => {
            notifications++;
        });

        const afterSubscribe = notifications;
        unsubscribe();

        store.state.count = 5;
        assert.equal(notifications, afterSubscribe, 'Should not notify after unsubscribe');
    });

    it('handles multiple subscribers', () => {
        const store = createStore({ count: 0 });
        let sub1Value = 0;
        let sub2Value = 0;

        store.subscribe(state => { sub1Value = state.count; });
        store.subscribe(state => { sub2Value = state.count; });

        store.state.count = 10;

        setTimeout(() => {
            assert.equal(sub1Value, 10, 'First subscriber should be notified');
            assert.equal(sub2Value, 10, 'Second subscriber should be notified');
        }, 10);
    });
});
