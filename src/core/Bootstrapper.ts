// src/core/Bootstrapper.ts
import { assetMap as assetMapData } from '../asset-map';
import { reconstructCocosTree } from './SceneParser';
import { startCustomRenderLoop } from './RenderEngine';
import { setupTweenSystem } from './TweenSystem';

declare const cc: any;
let isBooted = false;
const assetMap: Record<string, string> = assetMapData;

export function registerScripts() {
    try {
        // @ts-ignore
        const scriptModules = import.meta.glob('../scripts/**/*.ts', { eager: true });
        
        console.log(`🧠 Found ${Object.keys(scriptModules).length} script modules. Registering...`);
        
        for (const path in scriptModules) {
            const mod: any = scriptModules[path];
            if (mod && mod.default) {
                const ScriptClass = mod.default;
                const className = ScriptClass.__classname__ || path.split('/').pop()?.replace('.ts', '');
                
                if (className && !cc.js.getClassByName(className)) {
                    cc.js.setClassName(className, ScriptClass);
                }
            }
        }
        console.log("✅ Scripts successfully registered!");
    } catch (err) {
        console.error("❌ Error while registering scripts:", err);
    }
}

export async function boot() {
    if (isBooted) return;
    isBooted = true;
    console.log("🛠️ [Trace 1] Booting started...");

    // 🛡️ VITE CLASS SHIELD (HMR & Duplication)
    if (typeof cc !== 'undefined') {
        // 1. Avoids conflicts in the internal component stack.
        if (cc._RF) {
            cc._RF.push = function() {};
            cc._RF.pop = function() {};
        }

        // 2. Prevents the creation of duplicate classes while preserving static methods.
        const originalCCClass = cc.Class;
        cc.Class = function(options: any) {
            if (options && options.name) {
                const existingClass = cc.js.getClassByName(options.name);
                if (existingClass) return existingClass;
            }
            return originalCCClass.apply(this, arguments);
        };
        Object.assign(cc.Class, originalCCClass);

        // 3. Eliminates record overlap.
        const originalSetClassName = cc.js.setClassName;
        cc.js.setClassName = function(className: string, constructor: any) {
            if (cc.js.getClassByName(className)) return;
            originalSetClassName.call(cc.js, className, constructor);
        };
    }

    // @ts-ignore
    let _canvasHeight = 576;
    const domCanvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
    if (!domCanvas) return;

    domCanvas.width = 1024;
    domCanvas.height = 576;

    const config = {
        id: 'GameCanvas',
        debugMode: 1,
        showFPS: true,
        frameRate: 60,
        renderMode: 1,
        jsList: []
    };

    cc.game.run(config, async () => {
        console.log("🛠️ [Trace 2] Engine Initialized.");

        // Must register scripts after engine is ready so cc.js exists
        registerScripts();

        cc.view.setFrameSize(1024, 576);
        cc.view.setDesignResolutionSize(1024, 576, cc.ResolutionPolicy.SHOW_ALL);
        cc.view.resizeWithBrowserSize(false);

        // 🛡️ Assembler stubs (fixes "n.reset is not a function")
        if (cc.Sprite) {
            cc.Sprite.prototype._updateColor = function() {};
            cc.Sprite.prototype._resetAssembler = function() {
                this._assembler = { updateRenderData: () => {}, fillBuffers: () => {}, updateColor: () => {} };
            };
        }
        if (cc.Label) {
            cc.Label.prototype._updateColor = function() {};
            cc.Label.prototype._applyFontTexture = function() {};
            cc.Label.prototype._resetAssembler = function() {
                this._assembler = { _getAssemblerData: () => null, updateRenderData: () => {}, fillBuffers: () => {}, updateColor: () => {} };
            };
        }

        // Setup cc.tween polyfill
        setupTweenSystem();

        // Override RenderFlow widget alignment pass
        if (cc.RenderFlow && cc.RenderFlow.render) {
            cc.RenderFlow.render = function(scene: any) {
                let cw = 1024, ch = 576;
                scene.walk((n: any) => {
                    if (n.name === 'Canvas') {
                        const cvs = n.getComponent(cc.Canvas);
                        if (cvs && cvs.designResolution) {
                            cw = cvs.designResolution.width || 1024;
                            ch = cvs.designResolution.height || 576;
                            n.width = cw;
                            n.height = ch;
                        }
                    }
                });

                scene.walk((n: any) => {
                    if (!(n instanceof cc.Node)) return;
                    if (!n.activeInHierarchy) return;
                    if (!n.getComponent) return;
                    if (typeof n._updateWorldMatrix === 'function') n._updateWorldMatrix();
                    const widget = n.getComponent(cc.Widget);
                    if (widget && typeof widget.updateAlignment === 'function') {
                        widget.updateAlignment();
                    }
                });
            };
        }

        const startSceneUuid = "d0e09abe-f1c2-42a9-a897-b6a039537962";
        const sceneUrl = assetMap[startSceneUuid];

        if (!sceneUrl) {
            console.error("❌ ERROR: Scene UUID not found in assetMap!");
            return;
        }

        const resp = await fetch(sceneUrl);
        const json = await resp.json();

        let loadedScene;
        let pendingAssets;
        try {
            const result = reconstructCocosTree(json.scene || json, true);
            loadedScene = result.rootObj;
            pendingAssets = result.pendingAssets;
        } catch (e) {
            console.error("❌ Critical ERROR in tree reconstruction:", e);
            return;
        }

        // Asset loading pipeline (audio, prefab, texture/sprite)
        const loadPromises = pendingAssets.map((link: any) => {
            return new Promise<void>(resolve => {
                const url = assetMap[link.uuid];
                if (!url) return resolve();
                const ext = url.split('.').pop()?.toLowerCase() || '';

                if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
                    cc.assetManager.loadRemote(url, { ext: '.' + ext }, (err: any, audioAsset: any) => {
                        if (!err && audioAsset) {
                            if (!(audioAsset instanceof cc.AudioClip) && cc.AudioClip) {
                                const clip = new cc.AudioClip();
                                clip._nativeAsset = audioAsset;
                                link.comp[link.key] = clip;
                            } else { link.comp[link.key] = audioAsset; }
                        }
                        resolve();
                    });
                } else if (url.endsWith('.prefab')) {
                    fetch(url).then(r => r.json()).then(prefabJson => {
                        let pFlat = Array.isArray(prefabJson) ? prefabJson : [];
                        const prefabData = reconstructCocosTree(pFlat, false);
                        const prefab = new cc.Prefab();
                        prefab.data = prefabData.rootObj;
                        if (prefab.data) prefab.data._prefab = { root: prefab.data };
                        link.comp[link.key] = prefab;
                        resolve();
                    }).catch(() => resolve());
                } else {
                    const isDefault = link.uuid && link.uuid.startsWith('9bbda');
                    cc.assetManager.loadRemote(url, { ext: '.' + ext }, (err: any, asset: any) => {
                        if (!err && asset) {
                            try {
                                if (link.key.toLowerCase().includes('texture')) {
                                    link.comp[link.key] = (asset instanceof cc.Texture2D) ? asset : (asset._texture || asset);
                                } else {
                                    link.comp[link.key] = ensureSpriteFrameFromAsset(asset, isDefault);
                                }
                            } catch (e) {
                                link.comp[link.key] = ensureSpriteFrameFromAsset(null, isDefault);
                            }
                        } else if (isDefault) {
                            link.comp[link.key] = ensureSpriteFrameFromAsset(null, true);
                        }
                        resolve();
                    });
                }
            });
        });

        await Promise.all(loadPromises);

        if (loadedScene) {
            cc.director.runScene(loadedScene);

            // ⚡ KICKSTART: Force script initialization (onLoad/start)
            setTimeout(() => {
                console.log("⚡ Enabling components' logic...");

                let gc = null;
                const scene = cc.director.getScene();
                if (scene) {
                    scene.walk((n: any) => {
                        if (n.getComponent('GameController')) gc = n;
                    });
                }

                if (gc) {
                    console.log("🎮 GameController ready for action!");
                } else {
                    console.warn("⚠️ GameController not found on active scene.");
                }

                if (cc.js._invokeStartPhase) {
                    cc.js._invokeStartPhase();
                }
            }, 250);

            (window as any).__READY = true;
            console.log("✅ Scene loaded and active");

            setTimeout(async () => {
                try {
                    const gameModule = await import('../game');
                    if (gameModule && typeof gameModule.startGame === 'function') {
                        console.log("🚀 Starting Game Logic...");
                        gameModule.startGame();
                    }
                } catch (err) {
                    console.error("❌ Fail while loading Game Logic:", err);
                }
            }, 300);

            // Canvas flatten — collapse duplicate Canvas nodes
            let canvases: any[] = [];
            loadedScene.walk((n: any) => {
                if (!(n instanceof cc.Node)) return;
                if (n.name === 'Canvas') canvases.push(n);
            });
            if (canvases.length > 0) {
                let rootCanvas = canvases[0];
                rootCanvas.setContentSize(1080, 576);
                let gameRoot = rootCanvas.getChildByName('GameRoot');
                if (gameRoot) gameRoot.setContentSize(1024, 576);
            }

            if (canvases.length > 1) {
                let rootCanvas = canvases[0];
                for (let i = 1; i < canvases.length; i++) {
                    let nested = canvases[i];
                    if (nested && nested.parent) {
                        const children = [...nested.children];
                        children.forEach(c => c.parent = rootCanvas);
                        nested.parent = null;
                        nested.destroy();
                    }
                }
            }

            // Global Cleanup & Interactivity
            loadedScene.walk((n: any) => {
                if (!(n instanceof cc.Node)) return;

                // Destroy "Cocos is working!" label if found
                const label = n.getComponent(cc.Label);
                if (label && (label.string?.includes('working!') || label.string?.includes('Vite + Cocos'))) {
                    n.destroy();
                    return;
                }

                // PlayNow Redirect
                if (n.name === 'PlayButton' || (n.parent?.name === 'PlayButton')) {
                    const clickAction = () => {
                        console.log("👉 Redirecting to Play Store...");
                        window.open('https://play.google.com/store/apps/details?id=com.fiogonia.mmm&hl=en', '_blank');
                    };
                    n.on('mousedown', clickAction);
                    n.on('touchstart', clickAction);
                }

                // 🎯 Retry Button Interaction
                if (n.name === 'RetryButton' || (n.parent?.name === 'RetryButton')) {
                    const clickAction = () => {
                        console.log("🔄 Retry requested, reloading...");
                        const retryComp = n.getComponent('RetryButton') || n.parent?.getComponent('RetryButton');
                        if (retryComp && typeof (retryComp as any).onClick === 'function') {
                            (retryComp as any).onClick();
                        } else {
                            window.location.reload();
                        }
                    };
                    n.on('mousedown', clickAction);
                    n.on('touchstart', clickAction);
                }
            });
        }

        // 🚀 Custom Render Loop
        const canvasHeight = 576;
        const gameCanvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
        startCustomRenderLoop(gameCanvas, canvasHeight);
    });
}

// Converts a loaded asset into a SpriteFrame (matches backup ensureSpriteFrame)
function ensureSpriteFrameFromAsset(asset: any, isDefault: boolean = false) {
    if (asset instanceof cc.SpriteFrame) return asset;
    let tex = (asset instanceof cc.Texture2D) ? asset : new cc.Texture2D();

    if (!(asset instanceof cc.Texture2D)) {
        if (asset && (asset instanceof HTMLImageElement || asset.nodeType)) tex.initWithElement(asset);
        else {
            const color = isDefault ? [255, 255, 255, 255] : [255, 0, 255, 255];
            tex.initWithData(new Uint8Array(color), cc.Texture2D.PixelFormat.RGBA8888, 1, 1);
        }
    }

    const sf = new cc.SpriteFrame();
    sf.setTexture(tex);
    const img = tex.getHtmlElementObj ? tex.getHtmlElementObj() : (tex._nativeAsset || tex._image);
    if (img && img.width > 0) {
        sf.setRect(cc.rect(0, 0, img.width, img.height));
        sf.setOriginalSize(cc.size(img.width, img.height));
    } else {
        sf.setRect(cc.rect(0, 0, 100, 100));
        sf.setOriginalSize(cc.size(100, 100));
    }
    return sf;
}