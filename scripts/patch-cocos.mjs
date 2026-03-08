// scripts/patch-cocos.mjs
import fs from 'fs';
import path from 'path';

// Adjust the path to point to your minified file.
const filePath = path.resolve('public/libs/cocos2d-js-min.js'); 
// (or 'dist/libs/cocos2d-js-min.js', depending on where Vite reads the file in dev mode)

if (!fs.existsSync(filePath)) {
    console.error("❌ Arquivo não encontrado:", filePath);
    process.exit(1);
}

let code = fs.readFileSync(filePath, 'utf8');

// The fatal properties that cause a crash when the renderEngine is undefined
const propsToMock = [
    'RenderComponentHandle', 
    'NodeProxy', 
    'CanvasProxy', 
    'Assembler'
];

let replacedCount = 0;

propsToMock.forEach(prop => {
    // This Regex finds any local access, e.g.: a.RenderComponentHandle or e.renderEngine.RenderComponentHandle
    const regex = new RegExp(`([a-zA-Z0-9_$]+(?:\\.[a-zA-Z0-9_$]+)*)\\.${prop}`, 'g');
    
    code = code.replace(regex, (match, prefix) => {
        replacedCount++;
        // Replaces with a reliable fallback: ((prefix || {Prop: function(){}}).Prop)
        return `((${prefix} || {${prop}: function(){}}).${prop})`;
    });
});

fs.writeFileSync(filePath, code);

console.log(`✅ [Cocos Patcher] Arquivo minificado atualizado! ${replacedCount} injeções aplicadas.`);