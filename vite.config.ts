import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";
// import viteImagemin from 'vite-plugin-imagemin';
import fs from 'node:fs';
import path from 'node:path';


// Custom plugin to process scripts that are NOT modules (Cocos 2.x style)
const inlineLegacyScripts = () => ({
  name: "inline-legacy-scripts",
  enforce: 'pre' as const, // Forces execution BEFORE Vite's official scanner
  transformIndexHtml(html: string) {
    // Finds script tags pointing to ./libs/ that do NOT have type="module"
    // Using flexible regexp for single or double quotes
    return html.replace(/<script\s+src=["'](\.\/libs\/cocos2d-js-min\.js)["']\s*><\/script>/g, (_, src) => {
      const filePath = path.resolve(process.cwd(), "public", src.replace("./", ""));
      if (fs.existsSync(filePath)) {
        console.log(`[Vite PRE] Inlining legacy script: ${src} (size: ${fs.statSync(filePath).size} bytes)`);
        const content = fs.readFileSync(filePath, "utf-8");
        // Remove source map comments if any, to avoid errors in final bundle
        const cleanedContent = content.replace(/\/\/# sourceMappingURL=.*/g, "");
        // Return as direct text (RAW) so Vite ignores it as asset
        return `<!-- COCOS_ENGINE_INLINED --><script type="application/javascript">\n${cleanedContent}\n</script>`;
      }
      return _;
    });
  },
});


export default defineConfig({
  resolve: {
    alias: {
      '@scripts': path.resolve(__dirname, './src/scripts')
    }
  },
  base: './',
  plugins: [
    inlineLegacyScripts(), // Injects Cocos BEFORE singlefile processing
    viteSingleFile()
    // Normally, it is better to use already compressed images to avoid excessive quality loss
    /* viteImagemin({
      optipng: { optimizationLevel: 7 },
      pngquant: { quality: [0.6, 0.8] },
    }) */
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: undefined,
        format: 'esm',
        codeSplitting: false
        // inlineDynamicImports: true
      }
    }
  }
});

//------
// Other previous methodologies which can be tested with care
//------
/* 
JSON dev scripts:
"dev": "vite --host",
"preview": "vite preview"


import { defineConfig } from 'vite';


export default defineConfig({
  base: './', 
  build: {
    target: 'esnext',
    minify: 'esbuild',
    assetsInlineLimit: 0,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // This keeps file names clean for Cocos
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  // If esbuild error persists, we can force OXC usage (new Vite standard)
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
}); */
/* import { defineConfig } from 'vite';


export default defineConfig({
  server: {
    host: true,
    port: 5173,
    fs: {
      // Allow serving the symlinked content
      allow: ['.', '/mnt/d/GameDev/Match3/match3minigame/assets']
    }
  },
  // DELETE the 'resolve' block (we don't need aliases anymore)
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
}); */
