// src/core/RenderEngine.ts
declare const cc: any;

export function startCustomRenderLoop(domCanvas: HTMLCanvasElement, canvasHeight: number) {
    const ctx = domCanvas?.getContext('2d');
    if (!ctx) return;

    function customRenderLoop() {
        if (!ctx || !cc.director.getScene()) {
            requestAnimationFrame(customRenderLoop);
            return;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, domCanvas.width, domCanvas.height);

        const scene = cc.director.getScene();
        const renderQueue: any[] = [];

        scene.walk((node: any) => {
            if (!(node instanceof cc.Node) || !node.activeInHierarchy || node.opacity === 0) return;

            if (!node._trs) {
                node._trs = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
            }
            if (node._updateWorldMatrix) node._updateWorldMatrix();

            if (node.getComponent(cc.Sprite) || node.getComponent(cc.Label)) {
                let globalZ = node.zIndex || 0;
                let p = node.parent;
                if (p) globalZ += (p.zIndex || 0) * 10000;
                node.__globalZ = globalZ;
                renderQueue.push(node);
            }
        });

        renderQueue.sort((a, b) => a.__globalZ - b.__globalZ);

        for (const node of renderQueue) {
            ctx.save();
            ctx.globalAlpha = (node.opacity ?? 255) / 255;

            const mat = cc.mat4();
            node.getWorldMatrix(mat);

            ctx.setTransform(
                mat.m[0], -mat.m[1],
                -mat.m[4], mat.m[5],
                Math.round(mat.m[12]),
                Math.round(canvasHeight - mat.m[13])
            );

            const w = node.width;
            const h = node.height;
            const drawX = -node.anchorX * w;
            const drawY = -(1 - node.anchorY) * h;

            const label = node.getComponent(cc.Label);
            if (label && label.string) {
                const color = node.color || { r: 255, g: 255, b: 255 };
                ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                ctx.font = `${label.fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label.string, (0.5 - node.anchorX) * w, -(0.5 - node.anchorY) * h);
            } 
            else {
                const sprite = node.getComponent(cc.Sprite);
                if (sprite && sprite._spriteFrame) {
                    const frame = sprite._spriteFrame;
                    const tex = frame.getTexture ? frame.getTexture() : frame._texture;
                    const img = tex?.getHtmlElementObj ? tex.getHtmlElementObj() : (tex?._nativeAsset || tex?._image);

                    if (img) {
                        const rect = frame._rect || { x: 0, y: 0, width: img.width, height: img.height };

                        if (node.name === 'Bar') {
                            const pb = node.getComponent(cc.ProgressBar) || (node.parent ? node.parent.getComponent(cc.ProgressBar) : null);
                            const progress = pb ? Math.max(0, pb.progress) : 1;

                            const initialFullW = 132;
                            const currentVisualWidth = initialFullW * progress;
                            const fixedDrawX = -node.anchorX * initialFullW;

                            ctx.beginPath();
                            ctx.rect(fixedDrawX, drawY, currentVisualWidth, h);
                            ctx.clip();

                            ctx.drawImage(
                                img,
                                rect.x || 0, rect.y || 0, rect.width || img.width, rect.height || img.height,
                                fixedDrawX, drawY, initialFullW, h
                            );

                            ctx.restore(); // Restore here for Bar branch — do NOT fall through to outer restore
                            continue;
                        } 
                        else if (sprite.type === 3 && sprite.fillRange !== undefined) {
                            ctx.beginPath();
                            ctx.rect(drawX, drawY, w * sprite.fillRange, h);
                            ctx.clip();

                            ctx.drawImage(
                                img,
                                rect.x || 0, rect.y || 0, rect.width || img.width, rect.height || img.height,
                                drawX, drawY, w, h
                            );
                        } 
                        else {
                            ctx.drawImage(
                                img,
                                rect.x || 0, rect.y || 0, rect.width || img.width, rect.height || img.height,
                                drawX, drawY, w, h
                            );
                        }
                    }
                }
            }
            ctx.restore();
        }
        requestAnimationFrame(customRenderLoop);
    }
    
    requestAnimationFrame(customRenderLoop);
}