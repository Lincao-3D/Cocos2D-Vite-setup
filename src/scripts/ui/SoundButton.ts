declare const cc: any;
const { ccclass, property } = cc._decorator;

@ccclass
export default class SoundButton extends cc.Component {
    @property(cc.Label)
    label: any = null;

    // Arraste o GameManager (Pai) ou o GameController (Filho), tanto faz agora
    @property(cc.Node)
    gameManagerNode: any = null;

    private _isMuted: boolean = false;

    onLoad() {
        // Fallback: Tenta achar o GameManager se você esqueceu de arrastar
        if (!this.gameManagerNode) {
            this.gameManagerNode = cc.find("Canvas/GameManager");
            if (!this.gameManagerNode) {
                this.gameManagerNode = cc.find("Canvas/GameManager/GameController");
            }
        }

        // Garante que o botão tenha o evento de clique
        let btn = this.getComponent(cc.Button);
        if (btn && btn.clickEvents.length === 0) {
            let clickEventHandler = new cc.Component.EventHandler();
            clickEventHandler.target = this.node;
            clickEventHandler.component = "SoundButton";
            clickEventHandler.handler = "onToggle";
            btn.clickEvents.push(clickEventHandler);
        }

        this.updateLabel();
    }

    onToggle() {
        if (!this.gameManagerNode) {
            console.error("SoundButton: Nó do Game Manager não encontrado!");
            return;
        }

        let ctrl: any = this.gameManagerNode.getComponentInChildren('GameController');

        if (ctrl) {
            ctrl.toggleMute();
            this._isMuted = ctrl.isMuted;
            this.updateLabel();
        } else {
            console.error("SoundButton: Script 'GameController' não encontrado!");
        }
    }

    updateLabel() {
        if (this.gameManagerNode) {
            let ctrl: any = this.gameManagerNode.getComponentInChildren('GameController');
            if (ctrl) this._isMuted = ctrl.isMuted;
        }

        if (this.label) {
            this.label.string = this._isMuted ? "🔇" : "🔊";
        }
    }
}