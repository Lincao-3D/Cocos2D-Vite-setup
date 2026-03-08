// game.ts
declare const cc: any;

export function startGame() {
    console.log("🚀 Game Logic Starting...");
    if (typeof cc !== 'undefined' && cc.sys && cc.sys.isBrowser) {
        console.log("🔇🔈 Applying AudioContext fix...");
        
        const canvas = document.getElementById('GameCanvas');
        const unlockAudio = () => {
            if (cc.audioEngine) cc.audioEngine.resumeAll();
            canvas?.removeEventListener('mousedown', unlockAudio);
            canvas?.removeEventListener('touchstart', unlockAudio);
        };

        canvas?.addEventListener('mousedown', unlockAudio);
        canvas?.addEventListener('touchstart', unlockAudio);
    }
    console.log("AudioContext fix applied 🔉🔊")
    // Create a simple node to prove the engine is rendering
    // const scene = cc.director.getScene();
    // const node = new cc.Node("TestNode");
    // const label = node.addComponent(cc.Label);

    // label.string = "Vite + Cocos Working!";
    // node.setPosition(540, 288); // O NOVO CENTRO VERDADEIRO (1080/2, 576/2)
    // node.parent = scene;

    // In the future, you will trigger your Match3 initialization here:
    // Match3Manager.init();
}
