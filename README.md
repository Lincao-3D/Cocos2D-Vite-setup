# 🧟‍♂️ Resurrecting Legacy Engines: Cocos Creator 2.4 🤝 Vite

A case study on porting a monolithic, globally-scoped 2020 game engine (Cocos Creator 2.4.x) into a modern, strict ESM 2026 build pipeline (Vite).

## 🛑 The Challenge

Cocos Creator 2.4.x relies heavily on global state (`window.cc`), synchronous module resolution, and internal closures. Modern bundlers like Vite and Rollup naturally destroy these paradigms during Tree-Shaking, ESM scoping, and minification.

While Cocos 3.x natively embraces ESM, many studios still maintain legacy 2.4 projects. This project is a technical exploration of forcing compatibility **without rewriting the engine from scratch**. It is not just a port; it's a structural organ transplant.

## Build Output

O processo de build consolida todos os assets e o motor Cocos em um único arquivo HTML, otimizado com compressão Brotli.

### Exemplo de Log de Sucesso:
```shell
✓ built in 258ms
🚀 Injecting Cocos Engine on the final HTML...
✅ Success! finalized HTML: 4137.47 kB

# Verificação de arquivos gerados (dist):
$ ls -lh dist/index.html*
-rw-r--r-- 1 user user 4.1M Mar  8 19:11 dist/index.html
-rw-r--r-- 1 user user 461K Mar  8 19:11 dist/index.html.br

## 🛠️ The Architecture & Solutions

To achieve 60FPS WebGL/Canvas performance in an ultra-fast HMR development environment, this project implements three core bypasses:

### Global Proxying (The Shield)
Using `Object.defineProperty` and Proxy interceptions within the `index.html` to create a "Shield". This prevents the modern bundler from wiping internal engine bindings and forces global state hydration **before** the ESM modules evaluate.

### Atomic Engine Patching
Surgically modifying the minified `cocos2d-js-min.js` to bypass NaN vertex poisoning and stubbing missing ForwardRenderer bindings that were stripped during the Vite build process.

### Custom Render Pipeline (HTML5 Canvas 2D)
Instead of fighting the engine's broken WebGL renderer pipeline, this project implements a custom `requestAnimationFrame` loop in `src/core/RenderEngine.ts`. It parses the Cocos Scene Tree manually, calculates Z-Indexes dynamically, and executes native Canvas drawing and clipping (handling edge cases like ProgressBars natively).

### Synchronous Eager Loading
Bypassing the asynchronous nature of Vite using `import.meta.glob(..., { eager: true })` to force component registration into the engine before the scene graph is reconstructed.

## 📦 Build Pipeline

The final production build utilizes Brotli compression, achieving massive payload reductions (e.g., shrinking a 4MB Base64 HTML down to ~400KB), resulting in an ultra-lightweight, single-file distributable.

```bash
# Install dependencies
npm install

# Start Dev Server (Vite HMR)
npm run dev

# Build for Production (Minified & Brotli Compressed)
npm run build
