# Vendored Preact

This directory contains vendored source files from Preact v10.27.2.

**Why vendored?**
- Zero build step required
- No npm dependencies at runtime
- Battle-tested VDOM diffing algorithm
- Stable, frozen version

**Source:** https://github.com/preactjs/preact/releases/tag/10.27.2

**License:** MIT (see LICENSE file)

**What we use:**
- `h()` function (createElement) for VDOM nodes
- `render()` for rendering to DOM
- `diff/` for VDOM diffing algorithm

Our custom template system (`html`` tagged templates) compiles to `h()` calls at runtime.
