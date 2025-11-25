/**
 * Home Page
 */
import { defineComponent } from './core/component.js';
import { html, when } from './core/template.js';
import './auth/user-tools.js';
import './components/tiles.js';

export default defineComponent('home-page', {
    data() {
        return {
            mainApps: { featured: [], other: [] },
            privateApps: []
        };
    },

    async mounted() {
        // Load apps.json
        try {
            const response = await fetch('apps.json');
            this.state.mainApps = await response.json();
        } catch (error) {
            console.error('Failed to load apps.json:', error);
        }

        // Load private apps from API
        try {
            const api = await import('./api.js');
            this.state.privateApps = await api.get_applications();
        } catch (error) {
            console.error('Failed to load private apps:', error);
        }
    },

    template() {
        const hasFeatured = this.state.mainApps.featured && this.state.mainApps.featured.length > 0;
        const hasPrivate = this.state.privateApps && this.state.privateApps.length > 0;
        const hasOther = this.state.mainApps.other && this.state.mainApps.other.length > 0;

        return html`
            <div>
                <div class="section">
                    Welcome! This website is my dumping ground for projects and web applications.
                    Feel free to explore and see what is available.
                    Hover over an item to see a short description.
                </div>

                ${when(hasFeatured, html`
                    <h3>Featured</h3>
                    <x-tiles id="featured-tiles"></x-tiles>
                `)}

                ${when(hasPrivate, html`
                    <h3>Private Applications</h3>
                    <x-tiles id="private-tiles"></x-tiles>
                `)}

                ${when(hasOther, html`
                    <h3>Everything Else</h3>
                    <x-tiles id="other-tiles"></x-tiles>
                `)}

                <user-tools></user-tools>

                <div style="text-align: center; font-size: .75em;">
                    <a href="legal.html">Privacy, Usage, and Removal Requests</a>
                </div>
            </div>
        `;
    },

    // After render, set the props directly on the elements
    afterRender() {
        try {
            const featuredTiles = this.querySelector('#featured-tiles');
            if (featuredTiles) {
                featuredTiles.tiles = this.state.mainApps.featured || [];
            }

            const privateTiles = this.querySelector('#private-tiles');
            if (privateTiles) {
                privateTiles.tiles = this.state.privateApps || [];
            }

            const otherTiles = this.querySelector('#other-tiles');
            if (otherTiles) {
                otherTiles.tiles = this.state.mainApps.other || [];
            }
        } catch (error) {
            console.error('Error in home afterRender:', error);
        }
    }
});
