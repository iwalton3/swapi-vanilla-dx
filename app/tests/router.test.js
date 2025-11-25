/**
 * Tests for Router System
 */

import { describe, assert } from './test-runner.js';
import { Router } from '../core/router.js';

describe('Router', function(it) {
    it('creates router with routes', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' }
        });

        assert.ok(router, 'Should create router');
        assert.ok(router.routes, 'Should have routes');
    });

    it('flattens nested routes correctly', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/test/': { component: 'test-page' }
        });

        assert.equal(router.routes['/test/'].component, 'test-page', 'Should flatten routes');
        assert.equal(router.routes[''].component, 'home-page', 'Should create empty root route');
    });

    it('generates correct URLs for hash mode', () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        const url = router.url('/test/', { foo: 'bar' });
        assert.ok(url.includes('#/test/'), 'Should generate hash URL');
        assert.ok(url.includes('foo=bar'), 'Should include query parameters');
    });

    it('stores routes in flat structure', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' },
            '/contact/': { component: 'contact-page' }
        });

        // Root route '/' gets stored as '' (empty string)
        assert.equal(router.routes[''].component, 'home-page', 'Should store home route as empty string');
        assert.equal(router.routes['/about/'].component, 'about-page', 'Should store about route');
        assert.equal(router.routes['/contact/'].component, 'contact-page', 'Should store contact route');
    });

    it('handles nested route definitions', () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        assert.ok(router.routes, 'Should have routes object');
        assert.ok(router.routes[''], 'Should create empty string route as alias for root');
    });

    it('supports navigation hooks', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/protected/': { component: 'protected-page', require: 'admin' }
        });

        let hookCalled = false;
        router.beforeEach(async (context) => {
            hookCalled = true;
        });

        // Navigate to a different route (not /) since router already navigated to / on creation
        router.navigate('/protected/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(hookCalled, 'Should call beforeEach hook on navigation');
    });

    it('can cancel navigation with hook', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/blocked/': { component: 'blocked-page' }
        });

        let hookCalled = false;
        let navigationCompleted = false;

        router.beforeEach(async (context) => {
            hookCalled = true;
            if (context.path === '/blocked/') {
                return false; // Block navigation
            }
        });

        router.afterEach(async () => {
            navigationCompleted = true;
        });

        router.navigate('/blocked/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(hookCalled, 'Should call hook for blocked route');
        assert.ok(!navigationCompleted, 'Should not complete navigation when blocked');
    });
});

describe('Router Query Parameters', function(it) {
    it('preserves query parameters on navigation', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/': { component: 'search-page' }
        });

        router.navigate('/search/', { q: 'test', page: '2' });

        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.query.q, 'test', 'Should have query parameter q');
        assert.equal(currentRoute.query.page, '2', 'Should have query parameter page');
    });

    it('handles empty query parameters', async () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        router.navigate('/');

        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.ok(typeof currentRoute.query === 'object', 'Should have empty query object');
    });
});
