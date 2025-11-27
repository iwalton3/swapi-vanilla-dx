# Distribution Bundles

Standalone, pre-bundled versions of the framework libraries for easy embedding.

## Available Bundles

### `framework.js` (~78 KB)
Complete framework bundle including:
- Component system (`defineComponent`)
- Reactivity (`reactive`, `createEffect`, `computed`)
- Template system (`html`, `when`, `each`, `raw`)
- Store system (`createStore`)
- Preact rendering internals (`h`, `Fragment`, `render`, `Component`)

**Usage:**
```html
<script type="module">
  import { defineComponent, html, when } from './dist/framework.js';

  defineComponent('my-app', {
    data() {
      return { count: 0 };
    },

    template() {
      return html`
        <div>
          <h1>Count: ${this.state.count}</h1>
          <button on-click="${() => this.state.count++}">+</button>
        </div>
      `;
    }
  });
</script>

<my-app></my-app>
```

### `router.js` (~39 KB)
Router library for client-side routing:
- Hash-based routing (default)
- HTML5 History API routing (with `<base>` tag)
- Route guards and hooks
- Query parameters

**Usage:**
```html
<script type="module">
  import { Router, defineRouterOutlet, defineRouterLink } from './dist/router.js';

  defineRouterOutlet();

  const router = new Router({
    '/': { component: 'home-page' },
    '/about': { component: 'about-page' }
  });

  router.setOutlet(document.querySelector('router-outlet'));
  defineRouterLink(router);
</script>

<router-outlet></router-outlet>
```

## Building

Bundles are generated with:
```bash
node build-dist.js
```

## Notes

- **No build step required** - Use directly in browsers with ES6 module support
- **Self-contained** - All dependencies bundled (including Preact for framework.js)
- **Tree-shakeable** - Import only what you need
- **No external dependencies** - Works offline, no CDN required

## Examples

See:
- `../bundle-demo/` - Framework bundle demonstration
- `../playground.html` - Interactive framework demos
- `../index.html` - Full app using both router and framework
