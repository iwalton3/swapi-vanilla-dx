/**
 * Tests for Virtual DOM System
 */

import { describe, assert } from './test-runner.js';
import { patchHTML, parseHTML, memo } from '../core/vdom.js';

describe('Virtual DOM - parseHTML() function', function(it) {
    it('parses simple HTML', () => {
        const fragment = parseHTML('<div>Hello</div>');

        assert.equal(fragment.firstChild.tagName, 'DIV', 'Should parse div tag');
        assert.equal(fragment.firstChild.textContent, 'Hello', 'Should parse text content');
    });

    it('parses nested HTML', () => {
        const fragment = parseHTML('<div><span>Hello</span></div>');

        assert.equal(fragment.firstChild.children.length, 1, 'Should have one child');
        assert.equal(fragment.firstChild.children[0].tagName, 'SPAN', 'Should parse nested span');
    });

    it('parses attributes', () => {
        const fragment = parseHTML('<div class="test" id="main">Hello</div>');
        const div = fragment.firstChild;

        assert.equal(div.className, 'test', 'Should parse class attribute');
        assert.equal(div.id, 'main', 'Should parse id attribute');
    });
});

describe('Virtual DOM - patchHTML() function', function(it) {
    it('creates new DOM elements', () => {
        const container = document.createElement('div');

        patchHTML(container, '<p>Hello World</p>');

        assert.equal(container.children.length, 1, 'Should have one child');
        assert.equal(container.children[0].tagName, 'P', 'Should create P element');
        assert.equal(container.children[0].textContent, 'Hello World', 'Should have correct text');
    });

    it('updates existing elements', () => {
        const container = document.createElement('div');

        patchHTML(container, '<p>Hello</p>');
        const firstChild = container.children[0];

        patchHTML(container, '<p>World</p>');

        assert.equal(container.children[0], firstChild, 'Should reuse same element');
        assert.equal(container.children[0].textContent, 'World', 'Should update text');
    });

    it('replaces elements with different tags', () => {
        const container = document.createElement('div');

        patchHTML(container, '<p>Hello</p>');
        const firstElement = container.children[0];

        patchHTML(container, '<div>Hello</div>');

        assert.notEqual(container.children[0], firstElement, 'Should create new element');
        assert.equal(container.children[0].tagName, 'DIV', 'Should have new tag');
    });

    it('updates attributes', () => {
        const container = document.createElement('div');

        patchHTML(container, '<div class="old" id="test"></div>');
        patchHTML(container, '<div class="new" title="Hello"></div>');
        const div = container.children[0];

        assert.equal(div.className, 'new', 'Should update class');
        assert.equal(div.title, 'Hello', 'Should add new attribute');
        assert.ok(!div.hasAttribute('id'), 'Should remove old attribute');
    });

    it('patches children efficiently', () => {
        const container = document.createElement('div');

        patchHTML(container, '<ul><li>Item 1</li><li>Item 2</li></ul>');
        patchHTML(container, '<ul><li>Item 1 Updated</li><li>Item 3</li><li>Item 2</li></ul>');
        const ul = container.children[0];

        assert.equal(ul.children.length, 3, 'Should have 3 children');
        assert.equal(ul.children[0].textContent, 'Item 1 Updated', 'Should update first item');
        assert.equal(ul.children[1].textContent, 'Item 3', 'Should add new item');
        assert.equal(ul.children[2].textContent, 'Item 2', 'Should keep third item');
    });
});

describe('Virtual DOM - memo() optimization', function(it) {
    it('memoizes function results with same deps', () => {
        let callCount = 0;
        const context = {};

        const result1 = memo(() => {
            callCount++;
            return 'result';
        }, [context]);

        const result2 = memo(() => {
            callCount++;
            return 'result';
        }, [context]);

        assert.equal(callCount, 1, 'Should only call function once with same deps');
        assert.equal(result1, result2, 'Should return same result');
    });

    it('recomputes when dependencies change', () => {
        let callCount = 0;
        const context1 = { id: 1 };
        const context2 = { id: 2 };

        const result1 = memo(() => {
            callCount++;
            return 'result1';
        }, [context1, 1]);

        const result2 = memo(() => {
            callCount++;
            return 'result2';
        }, [context2, 2]);

        assert.equal(callCount, 2, 'Should call function twice with different deps');
    });

    it('handles no dependencies', () => {
        let callCount = 0;

        const result1 = memo(() => {
            callCount++;
            return 'result';
        }, []);

        const result2 = memo(() => {
            callCount++;
            return 'result';
        }, []);

        // Without deps, should compute each time
        assert.equal(callCount, 2, 'Should compute each time without deps');
    });
});

describe('Virtual DOM - Edge Cases', function(it) {
    it('handles empty container', () => {
        const container = document.createElement('div');

        patchHTML(container, '<p>Hello</p>');

        assert.equal(container.children.length, 1, 'Should handle initial render');
    });

    it('handles multiple children', () => {
        const container = document.createElement('div');

        patchHTML(container, '<div>First</div><div>Second</div>');

        assert.equal(container.children.length, 2, 'Should handle multiple children');
        assert.equal(container.children[0].textContent, 'First', 'Should have first child');
        assert.equal(container.children[1].textContent, 'Second', 'Should have second child');
    });

    it('preserves custom elements', () => {
        const container = document.createElement('div');

        patchHTML(container, '<custom-element x-data="test"></custom-element>');

        assert.equal(container.children[0].tagName.toLowerCase(), 'custom-element', 'Should create custom element');
        assert.equal(container.children[0].getAttribute('x-data'), 'test', 'Should set custom attributes');
    });

    it('handles text content updates', () => {
        const container = document.createElement('div');

        patchHTML(container, '<div>Original</div>');
        patchHTML(container, '<div>Updated</div>');

        assert.equal(container.children[0].textContent, 'Updated', 'Should update text content');
    });
});
