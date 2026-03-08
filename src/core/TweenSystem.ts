// src/core/TweenSystem.ts
declare const cc: any;

export function setupTweenSystem() {
    (cc as any).tween = (target: any) => {
        const actions: any[] = [];
        let currentTarget = target;

        const tweenObj = {
            to(duration: number, props: any, _easing?: any) {
                actions.push({ type: 'to', duration, props });
                return this;
            },
            by(duration: number, props: any, _easing?: any) {
                actions.push({ type: 'by', duration, props });
                return this;
            },
            delay(duration: number) {
                actions.push({ type: 'delay', duration });
                return this;
            },
            call(cb: Function) {
                actions.push({ type: 'call', cb });
                return this;
            },
            union() { return this; },
            repeatForever() {
                actions.push({ type: 'repeatForever' });
                return this;
            },
            start() {
                let index = 0;

                // 🛡️ Guard against null _trs on Cocos 2.4 nodes
                if (!currentTarget._trs) {
                    currentTarget._trs = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
                }

                const runNext = () => {
                    if (index >= actions.length) return;
                    const action = actions[index++];

                    if (action.type === 'to' || action.type === 'by') {
                        const startProps: any = {};
                        for (let k in action.props) {
                            const val = currentTarget[k];
                            if (typeof val === 'object' && val !== null) {
                                startProps[k] = { ...val };
                            } else {
                                startProps[k] = val;
                            }
                        }
                        const startTime = Date.now();

                        const animate = () => {
                            // 🛡️ Abort if target invalid
                            if (!target || typeof target !== 'object' || !target.name) return;

                            // 🛡️ Ensure _trs buffer exists
                            if (target._trs === null || target._trs === undefined) {
                                target._trs = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
                            }

                            const elapsed = (Date.now() - startTime) / 1000;
                            const t = Math.min(1, elapsed / action.duration);

                            for (let k in action.props) {
                                const targetVal = action.props[k];
                                const startVal = startProps[k];

                                // Support Vec2 (x, y) interpolation
                                if (typeof targetVal === 'object' && targetVal !== null && 'x' in targetVal && 'y' in targetVal) {
                                    const resX = (action.type === 'to') ? (startVal.x + (targetVal.x - startVal.x) * t) : (startVal.x + targetVal.x * t);
                                    const resY = (action.type === 'to') ? (startVal.y + (targetVal.y - startVal.y) * t) : (startVal.y + targetVal.y * t);

                                    if (k === 'position') {
                                        currentTarget.x = resX;
                                        currentTarget.y = resY;
                                        if (typeof currentTarget.setPosition === 'function') {
                                            currentTarget.setPosition(resX, resY);
                                        }
                                    } else if (k === 'scale') {
                                        currentTarget.scale = resX;
                                        currentTarget.scaleX = resX;
                                        currentTarget.scaleY = resY;
                                    } else {
                                        if (!currentTarget[k]) currentTarget[k] = { x: 0, y: 0 };
                                        currentTarget[k].x = resX;
                                        currentTarget[k].y = resY;
                                    }
                                } else {
                                    const res = (action.type === 'to') ? (startVal + (targetVal - startVal) * t) : (startVal + targetVal * t);
                                    currentTarget[k] = res;

                                    // Sync separate x/y properties
                                    if (k === 'x' || k === 'y') {
                                        if (typeof currentTarget.setPosition === 'function') {
                                            currentTarget.setPosition(currentTarget.x, currentTarget.y);
                                        }
                                    }
                                }
                            }

                            if (t < 1) requestAnimationFrame(animate);
                            else runNext();
                        };
                        animate();
                    } else if (action.type === 'delay') {
                        setTimeout(runNext, action.duration * 1000);
                    } else if (action.type === 'call') {
                        action.cb();
                        runNext();
                    } else if (action.type === 'repeatForever') {
                        index = 0;
                        runNext();
                    }
                };

                runNext();
                return this;
            },
            stop() {
                actions.length = 0;
                return this;
            }
        };
        return tweenObj;
    };
}