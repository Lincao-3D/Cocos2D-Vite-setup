// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

declare const cc: any;
const { ccclass, property } = cc._decorator;

// Enum simples via string
export type ItemType = 'fries' | 'burger' | 'iceCream';

@ccclass
export default class ItemComponent extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    public itemType: ItemType = 'burger';
    private _isInteractable: boolean = true;
    private _callback: Function = null;

    // Inicializa o item
    init(type: ItemType, frame: cc.SpriteFrame, callback: Function) {
        this.itemType = type;
        this.sprite.spriteFrame = frame;
        this._callback = callback;
        this._isInteractable = true;

        // Importante no 2.4: definir tamanho para o toque funcionar
        // Geralmente o Cocos ajusta sozinho pelo Sprite, mas bom garantir
    }

    onLoad() {
        // No 2.x, TOUCH_START funciona baseado no node.width/height
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart() {
        if (!this._isInteractable || !this.node.active) return;

        if (this._callback) {
            this._callback(this);
        }
    }

    disableInteraction() {
        this._isInteractable = false;
        // Opcional: remover listener agora ou deixar a flag controlar
    }
}