// src/cocos.d.ts
declare namespace cc {
    export type Node = any;
    export type Sprite = any;
    export type SpriteFrame = any;
    export type Prefab = any;
    export type AudioClip = any;
    export type Tween = any;
    export type Vec2 = any;
    export const _decorator: any;
    export function instantiate(prefab: any): any;
    export function find(path: string): any;
    // Add more as needed, or just use:
    // [key: string]: any;
}

declare const cc: any;