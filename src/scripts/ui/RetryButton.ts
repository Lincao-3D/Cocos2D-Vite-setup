declare const cc: any;
const { ccclass } = cc._decorator;

@ccclass
export default class RetryButton extends cc.Component {
    onClick() {
        // Reinicia o jogo recarregando a página (mais seguro no ambiente customizado)
        console.log("🔄 Restarting Game...");
        window.location.reload();
    }
}