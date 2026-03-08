// src/core/SceneParser.ts
declare const cc: any;

const SCRIPT_UUIDS: Record<string, string> = {
    "2e8caEkxnxD/ZFRIetpWCB+": "GameController",
    "8de0ecrL/NEhZEYk/Iy4AUd": "TargetView",
    "924606+0ydB/JMBG0wp8Nfh": "CollectArea",
    "c16fcqBH7lD3Lcp8a7sv/WS": "SoundButton",
    "3b5acHCWoBH97dZSNHmYT3H": "RetryButton",
    "6aed087NG9GsLPaK+YoFQSS": "IdleManager",
    "e5a0bON4XJGT7MgpnoolWnX": "ItemComponent",
    "752dc4mNYdN6tcYVPpyk/F": "GameModel"
};

export const parseNum = (obj: any, keys: string[], index: number, def: number) => {
    if (obj === null || obj === undefined) return def;
    if (Array.isArray(obj)) {
        const val = obj[index];
        return (val !== undefined && !isNaN(val)) ? val : def;
    }
    for (let k of keys) {
        if (obj[k] !== undefined && !isNaN(obj[k])) return obj[k];
    }
    return def;
};

// Converts a loaded asset to SpriteFrame — matches backup signature exactly
export function ensureSpriteFrame(asset: any, isDefault: boolean = false) {
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

export function reconstructCocosTree(flatArray: any[], isScene: boolean) {
    // 🛡️ BRUTAL ASSEMBLER INJECTION
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

    if (!flatArray || flatArray.length === 0) return { rootObj: null, pendingAssets: [] };

    const rootIndex = flatArray.findIndex((item: any) => item.__type__ === (isScene ? "cc.Scene" : "cc.Prefab")) || 0;
    const objectCache = new Map<number, any>();
    const pendingLinks: any[] = [];
    const pendingAssets: any[] = [];

    function parseNode(index: number, parent: any) {
        const data = flatArray[index];
        if (!data) return null;

        let node: any = null;

        if (data.__type__ === "cc.Scene") {
            node = new cc.Scene();
            node.setAnchorPoint(0.5, 0.5);
        } else if (data.__type__ === "cc.Prefab") {
            if (data.data && data.data.__id__ !== undefined) return parseNode(data.data.__id__, parent);
            return null;
        } else {
            node = new cc.Node(data._name || "Node");
            node.active = data._active !== undefined ? data._active : true;

            if (data._trs) {
                let trs = data._trs.array || data._trs;
                node.setPosition(trs[0], trs[1]);
                node.setScale(trs[7], trs[8]);
                const qz = trs[5], qw = trs[6];
                node.angle = Math.atan2(2 * (qw * qz), 1 - 2 * (qz * qz)) * (180 / Math.PI);
            } else if (data._position !== undefined) {
                node.setPosition(parseNum(data._position, ['x', '_x'], 0, 0), parseNum(data._position, ['y', '_y'], 1, 0));
                node.setScale(parseNum(data._scale, ['x', '_x'], 0, 1), parseNum(data._scale, ['y', '_y'], 1, 1));
                if (data._rotationX !== undefined) node.angle = -data._rotationX;
            }

            node.setContentSize(parseNum(data._contentSize, ['width', 'w', '_width'], 0, 100), parseNum(data._contentSize, ['height', 'h', '_height'], 1, 100));
            node.setAnchorPoint(parseNum(data._anchorPoint, ['x', '_x'], 0, 0.5), parseNum(data._anchorPoint, ['y', '_y'], 1, 0.5));
            node.opacity = data._opacity !== undefined ? data._opacity : 255;
            if (data._color) node.color = new cc.Color(data._color.r, data._color.g, data._color.b, data._color.a);
        }

        objectCache.set(index, node);

        // Prevent double nesting
        if (parent && node instanceof cc.Node) {
            if (parent.name === node.name) {
                node = parent;
                objectCache.set(index, node);
            } else {
                parent.addChild(node);
            }
        }

        if (data._children) data._children.forEach((c: any) => parseNode(c.__id__, node));

        // 🚀 ENSURE OVERLAY IS ON TOP
        if (node.name === "GameRoot" || node.name === "Canvas") {
            const overlays = node.children.filter((c: any) => c.name.toLowerCase().includes("overlay") || c.name.toLowerCase().includes("screen"));
            overlays.forEach((o: any) => {
                o.zIndex = 9999;
                const idx = node.children.indexOf(o);
                if (idx !== -1) {
                    node.children.splice(idx, 1);
                    node.children.push(o);
                }
            });
        }

        if (data._components) {
            data._components.forEach((cRef: any) => {
                const cData = flatArray[cRef.__id__];
                if (!cData) return;

                let comp: any = null;
                let typeName = cData.__type__;

                if (typeName === "cc.Sprite") {
                    comp = node.addComponent(cc.Sprite);
                    if (cData._type !== undefined) comp.type = cData._type;
                    if (cData._fillRange !== undefined) comp.fillRange = cData._fillRange;
                    if (cData._sizeMode !== undefined) comp.sizeMode = cData._sizeMode;
                    else comp.sizeMode = 0;

                    if (data._contentSize) {
                        node.width = parseNum(data._contentSize, ['width', 'w', '_width'], 0, node.width);
                        node.height = parseNum(data._contentSize, ['height', 'h', '_height'], 1, node.height);
                    }
                }
                else if (typeName === "cc.Label") {
                    comp = node.addComponent(cc.Label);
                    comp.string = cData._string || cData._N$string || "";
                    comp.fontSize = cData._fontSize || 40;
                    comp.horizontalAlign = cData._N$horizontalAlign || cData._horizontalAlign || 1;
                    comp.verticalAlign = cData._N$verticalAlign || cData._verticalAlign || 1;
                    comp.isBold = !!cData._isSystemFontUsed || !!cData._N$isSystemFontUsed;
                }
                else if (typeName === "cc.Layout") comp = node.addComponent(cc.Layout);
                else if (typeName === "cc.Widget") {
                    comp = node.addComponent(cc.Widget);

                    if (cData._alignFlags !== undefined) {
                        const f = cData._alignFlags;
                        // Correct 6-bit mapping from backup
                        comp.isAlignTop              = !!(f & 1);
                        comp.isAlignVerticalCenter   = !!(f & 2);
                        comp.isAlignBottom           = !!(f & 4);
                        comp.isAlignLeft             = !!(f & 8);
                        comp.isAlignHorizontalCenter = !!(f & 16);
                        comp.isAlignRight            = !!(f & 32);
                    } else {
                        ['isAlignTop', 'isAlignBottom', 'isAlignLeft', 'isAlignRight', 'isAlignHorizontalCenter', 'isAlignVerticalCenter'].forEach(p => {
                            if (cData[p] !== undefined) comp[p] = cData[p];
                        });
                    }

                    ['top', 'bottom', 'left', 'right', 'horizontalCenter', 'verticalCenter'].forEach(p => {
                        let val = cData[p] !== undefined ? cData[p] : cData['_' + p];
                        if (val !== undefined) comp[p] = val;
                    });

                    ['isAbsLeft', 'isAbsRight', 'isAbsTop', 'isAbsBottom', 'isAbsHorizontalCenter', 'isAbsVerticalCenter', 'isAbsoluteLeft', 'isAbsoluteRight', 'isAbsoluteTop', 'isAbsoluteBottom', 'isAbsoluteHorizontalCenter', 'isAbsoluteVerticalCenter'].forEach(p => {
                        let realP = p.includes('Absolute') ? p : p.replace('isAbs', 'isAbsolute');
                        let val = cData[p] !== undefined ? cData[p] : cData['_' + p];
                        if (val !== undefined) comp[realP] = val;
                    });

                    if (cData._originalWidth !== undefined) comp._originalWidth = cData._originalWidth;
                    if (cData._originalHeight !== undefined) comp._originalHeight = cData._originalHeight;

                    if (cData._target && cData._target.__id__ !== undefined) {
                        pendingLinks.push({ comp, key: 'target', targetId: cData._target.__id__ });
                    }

                    // Force Mode 2 (ALWAYS) for convergence in our hybrid loop
                    comp.alignMode = 2;
                }
                else if (typeName === "cc.Button") {
                    comp = node.addComponent(cc.Button);
                    comp.interactable = cData._N$interactable !== undefined ? cData._N$interactable : (cData.interactable !== undefined ? cData.interactable : true);
                    comp.transition = cData._N$transition !== undefined ? cData._N$transition : (cData.transition !== undefined ? cData.transition : 0);

                    if (comp.transition === 2) { // Sprite Swap
                        const keys = [
                            { prop: 'normalSprite', data: '_N$normalSprite' },
                            { prop: 'pressedSprite', data: '_N$pressedSprite' },
                            { prop: 'hoverSprite', data: '_N$hoverSprite' },
                            { prop: 'disabledSprite', data: '_N$disabledSprite' }
                        ];
                        keys.forEach(k => {
                            let sRef = cData[k.data] || cData[k.prop];
                            if (sRef && sRef.__uuid__) {
                                pendingLinks.push({ comp, key: k.prop, assetUuid: sRef.__uuid__ });
                            }
                        });
                    }
                }
                else if (typeName === "cc.Canvas") {
                    comp = node.addComponent(cc.Canvas);
                    let dw = 1080, dh = 576;
                    if (cData._designResolution) {
                        dw = cData._designResolution.width !== undefined ? cData._designResolution.width : dw;
                        dh = cData._designResolution.height !== undefined ? cData._designResolution.height : dh;
                    }
                    comp.designResolution = cc.size(dw, dh);
                    node.setContentSize(dw, dh);
                    node.setPosition(dw / 2, dh / 2);
                }
                else if (typeName === "cc.Camera") comp = node.addComponent(cc.Camera);
                else {
                    // 🎯 UUID → CLASS resolution
                    let resolvedType = cData.__type__;

                    if (SCRIPT_UUIDS[resolvedType]) {
                        resolvedType = SCRIPT_UUIDS[resolvedType];
                    } else if (resolvedType && resolvedType.length > 20) {
                        const cleanUuid = resolvedType.split('_')[0];
                        if (SCRIPT_UUIDS[cleanUuid]) resolvedType = SCRIPT_UUIDS[cleanUuid];
                    }

                    let Type = cc.js.getClassByName(resolvedType);

                    if (Type) {
                        comp = node.addComponent(Type);
                        console.log(`🔌 [Ligado] Componente ${resolvedType} no nó ${node.name}`);
                    }
                    else if (cData.__type__ === "cc.Sprite") { comp = node.addComponent(cc.Sprite); }
                    else if (cData.__type__ === "cc.Label") { comp = node.addComponent(cc.Label); }
                }

                if (comp) {
                    if (cData._enabled !== undefined) comp.enabled = cData._enabled;
                    objectCache.set(cRef.__id__, comp);

                    for (let key in cData) {
                        if (key.startsWith('_') && key !== '_spriteFrame') continue;
                        const val = cData[key];

                        const processVal = (v: any, k: string, container: any) => {
                            if (v?.__uuid__) {
                                let pubKey = k.replace('_', '');
                                if (k === '_spriteFrame') pubKey = 'spriteFrame';
                                // pendingAssets shape matches backup: { comp, key, uuid }
                                pendingAssets.push({ comp: container, key: pubKey, uuid: v.__uuid__ });
                            } else if (v?.__id__ !== undefined) {
                                pendingLinks.push({ comp: container, key: k, targetId: v.__id__ });
                            } else if (Array.isArray(v)) {
                                container[k] = [];
                                v.forEach((item, idx) => {
                                    processVal(item, idx.toString(), container[k]);
                                });
                            } else {
                                container[k] = v;
                            }
                        };

                        processVal(val, key, comp);
                    }
                }
            });
        }
        return node;
    }

    const rootObj = parseNode(rootIndex, null);
    pendingLinks.forEach(l => { if (objectCache.has(l.targetId)) l.comp[l.key] = objectCache.get(l.targetId); });
    return { rootObj, pendingAssets };
}