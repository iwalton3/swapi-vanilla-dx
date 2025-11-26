/**
 * Tiles Component - Grid of navigation tiles
 */
import { defineComponent } from '../core/component.js';
import { html, each } from '../core/template.js';

export default defineComponent('x-tiles', {
    props: {
        tiles: []
    },

    template() {
        const tiles = this.props.tiles || [];

        return html`
            <div class="tiles-container">
                ${each(tiles, tile =>
                    tile.spa ?
                        // SPA route - use router-link
                        html`
                            <router-link to="${tile.path}" class="tile" title="${tile.info}">
                                <img src="${tile.icon}" alt="${tile.info}">
                                <div>${tile.name}</div>
                            </router-link>
                        `
                    :
                        // External link - use regular anchor
                        html`
                            <a href="${tile.path}" class="tile" title="${tile.info}">
                                <img src="${tile.icon}" alt="${tile.info}">
                                <div>${tile.name}</div>
                            </a>
                        `
                , tile => tile.path)}
            </div>
        `;
    }
});
