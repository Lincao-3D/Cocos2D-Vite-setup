declare const cc: any;
const { ccclass, property } = cc._decorator;

@ccclass
export default class IdleManager extends cc.Component {
    @property(cc.Node) overlayDim: any = null;
    @property(cc.Node) hand: any = null;
    @property(cc.Node) targetFlash: any = null;

    // Referência ao Node do GameManager (sem importar a classe)
    @property(cc.Node)
    gameManagerNode: any = null;

    private _timer: number = 0;
    private _active: boolean = false;
    private _permanentlyStopped: boolean = false;

    update(dt) {
        if (this._active || this._permanentlyStopped) return;
        this._timer += dt;
        if (this._timer >= 2.0) {
            this.show();
        }
    }

    reset() {
        this._timer = 0;
        if (this._active) {
            this._active = false;
            if (this.hand) this.hand.active = false;
            if (this.targetFlash) this.targetFlash.active = false;
            if (this.overlayDim) {
                this.overlayDim.opacity = 0;
                this.overlayDim.active = false;
            }
        }
    }

    forceStop() {
        this.reset();
        this._permanentlyStopped = true;
    }

    show() {
        if (this._permanentlyStopped) return;

        this._active = true;
        if (this.overlayDim) {
            this.overlayDim.active = true;
            cc.tween(this.overlayDim).to(0.5, { opacity: 150 }, null).start();
        }

        if (this.hand) this.hand.active = true;
        if (this.targetFlash) this.targetFlash.active = true;

        if (this.gameManagerNode) {
            let ctrl: any = this.gameManagerNode.getComponent('GameController');
            if (ctrl && ctrl.onTutorialShown) {
                ctrl.onTutorialShown();
            }
        }

        if (this.hand) {
            cc.tween(this.hand)
                .by(0.5, { position: cc.v2(10, -10) }, null)
                .by(0.5, { position: cc.v2(-10, 10) }, null)
                .union()
                .repeatForever()
                .start();
        }
    }
}