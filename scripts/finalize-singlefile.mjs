import fs from 'fs';
import path from 'path';

const distPath = './dist/index.html';
const enginePath = './public/libs/cocos2d-js-min.js';

if (fs.existsSync(distPath) && fs.existsSync(enginePath)) {
    let html = fs.readFileSync(distPath, 'utf8');
    const engineCode = fs.readFileSync(enginePath, 'utf8');

    console.log("🚀 Injecting Cocos Engine on the final HTML...");

    // 1. Remove the tag that Vite ignored (if it's still there)
    html = html.replace(/<script.*src=".*cocos2d-js-min\.js".*><\/script>/, '');

    // 2. Inject the engine code at the top of the <body> or <head> tag
    // We use a regular (non-module) <script> tag to ensure global scope
    const scriptTag = `\n<script>\n${engineCode}\n</script>\n`;
    
    // Insert before the Vite bundle to ensure execution order
    html = html.replace('</head>', `${scriptTag}</head>`);

    fs.writeFileSync(distPath, html);
    console.log(`✅ Success! finalized HTML: ${(fs.statSync(distPath).size / 1024).toFixed(2)} kB`);
} else {
    console.error("❌ Error: Files dist/index.html or engine not found.");
}