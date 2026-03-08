import fs from 'fs';
import path from 'path';

const ASSETS_DIR = './public/assets';
const OUTPUT_FILE = './src/asset-map.json';

async function generateMap(dir = ASSETS_DIR) {
    console.log(`🔍 Scanning: ${dir}`);

    let count = 0;
    const assetMap = {};

    const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    
    function compressUuid(uuid) {
        if (!uuid || uuid.length !== 36) return uuid;
        const hex = uuid.replace(/-/g, '');
        let b64 = hex.slice(0, 2);
        for (let i = 2; i < 32; i += 3) {
            let val = parseInt(hex.slice(i, i + 3), 16);
            b64 += BASE64_KEYS[val >> 6];
            b64 += BASE64_KEYS[val & 63];
        }
        return b64;
    }

    function extractUuidsFromMeta(metaPath, metaData) {
        const relativeMetaPath = path.relative(ASSETS_DIR, metaPath).replace(/\\/g, '/');
        const relativeAssetPath = relativeMetaPath.replace('.meta', '');

        if (metaData.uuid) {
            assetMap[metaData.uuid] = `assets/${relativeAssetPath}`;
            assetMap[compressUuid(metaData.uuid)] = `assets/${relativeAssetPath}`;
            count++; 
        }
        
        if (metaData.subMetas) {
            for (const key in metaData.subMetas) {
                extractUuidsFromMeta(metaPath, metaData.subMetas[key]);
            }
        }
    }

    function scanDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            // Ignores metadata and system files.
            if (file.endsWith('.meta') || file.startsWith('.')) continue; 

            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else {
                // Searches for the corresponding .meta file.
                const metaPath = filePath + '.meta';
                if (fs.existsSync(metaPath)) {
                    try {
                        const data = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                        extractUuidsFromMeta(metaPath, data);
                    } catch (e) {
                        console.error(`❌ Error parsing ${metaPath}`);
                    }
                }
            }
        }
    }

    scanDirectory(dir);

    // New .ts output file logic
    const content = `export const assetMap = ${JSON.stringify(assetMap, null, 2)};`;
    fs.writeFileSync('./src/asset-map.ts', content);
    console.log(`✅ Generated map for ${count} assets.`);
}

generateMap();
