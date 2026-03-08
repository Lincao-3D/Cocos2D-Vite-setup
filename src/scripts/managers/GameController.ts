declare const cc: any;
const { ccclass, property } = cc._decorator;

// Adjust imports based on your folder structure
import GameModel from "../data/GameModel";
import CollectArea from "../ui/CollectArea";
import TargetView from "../ui/TargetView";
import IdleManager from "./IdleManager";
import ItemComponent from "../components/ItemComponent";

@ccclass
export default class GameController extends cc.Component {
    // --- UI References ---
    @property(CollectArea) collectArea: any = null;
    @property(TargetView) targetView: any = null;
    @property(IdleManager) idleManager: any = null;

    // --- HUD ---
    @property(cc.Node) leftPanel: cc.Node = null;
    @property(cc.Node) rightPanel: cc.Node = null;
    @property(cc.ProgressBar) energyProgress: any = null;
    @property(cc.Label) timerLabel: any = null;
    @property(cc.Node) winScreen: any = null;
    @property(cc.Node) loseScreen: any = null;
    @property(cc.Node) gameplayRoot: any = null;
    @property(cc.Node) warningBorder: any = null;

    // --- Assets ---
    @property(cc.Prefab) itemPrefab: cc.Prefab = null;
    @property(cc.SpriteFrame) frameBurger: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) frameFries: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) frameIceCream: cc.SpriteFrame = null;

    @property(cc.SpriteFrame) fxStar: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) fxExplosion: cc.SpriteFrame = null;

    // --- Audio ---
    @property({ type: cc.AudioClip }) bgMusic: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) alarmSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) sfxClick: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) sfxMatch: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) sfxWin: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) sfxLose: cc.AudioClip = null;

    // --- Public State for Buttons ---
    public isMuted: boolean = false;

    private model: GameModel = new GameModel();
    private _processing: boolean = false;
    private _alarmId: number = -1;
    private warningTween: cc.Tween = null;
    private _tutorialCount: number = 0;
    private _audioUnlocked: boolean = false;
    // --- Dump Node tree nodes' Function ---
    /* dumpNodeTree(node: cc.Node, depth: number = 0): void {
    let indent = '  '.repeat(depth);
    console.log(`${indent}📦 Node: ${node.name} (Active: ${node.active})`);
    console.log(`${indent}  📍 Pos: (${node.x.toFixed(0)}, ${node.y.toFixed(0)})`);
    let size = node.getContentSize();
    console.log(`${indent}  📏 Size: ${size.width.toFixed(0)}x${size.height.toFixed(0)}`);
    console.log(`${indent}  🔄 Scale: (${node.scaleX.toFixed(2)}, ${node.scaleY.toFixed(2)})`);
    console.log(`${indent}  ⚪ Angle: ${node.angle.toFixed(1)}`);
    
    // === WIDGET (ALL alignments + margins) ===
    let widget = node.getComponent(cc.Widget);
    if (widget) {
        let alignMode = ['ONCE', 'ALWAYS', 'ON_WINDOW_RESIZE'][widget.alignMode];
        console.log(`${indent}  🎯 Widget Mode: ${alignMode}`);
        console.log(`${indent}    Top:${widget.isAlignTop?'✓':'✗'}(${widget.top}) Left:${widget.isAlignLeft?'✓':'✗'}(${widget.left})`);
        console.log(`${indent}    Bot:${widget.isAlignBottom?'✓':'✗'}(${widget.bottom}) Right:${widget.isAlignRight?'✓':'✗'}(${widget.right})`);
        console.log(`${indent}    HC:${widget.isAlignHorizontalCenter?'✓':'✗'} VC:${widget.isAlignVerticalCenter?'✓':'✗'}`);
        console.log(`${indent}    Target: ${widget.target ? widget.target.name : 'Canvas'}`);
    }
    
    // === LAYOUT ===
    let layout = node.getComponent(cc.Layout);
    if (layout) {
        let type = ['NONE', 'HORIZONTAL', 'VERTICAL', 'ABSOLUTE'][layout.type];
        let resize = ['NONE', 'CONTAINER', 'CHILDREN'][layout.resizeMode];
        console.log(`${indent}  🗂️ Layout: Type=${type}, Resize=${resize}`);
        console.log(`${indent}    SpacingX:${layout.spacingX} SpacingY:${layout.paddingTop}`);
    }
    
    // === SPRITE ===
    let sprite = node.getComponent(cc.Sprite);
    if (sprite) {
        let type = ['SIMPLE', 'SLICED', 'TILED', 'FILLED'][sprite.type];
        let sizeMode = ['CUSTOM', 'TRIMMED', 'RAW', 'TRIMMED_RAW'][sprite.sizeMode];
        console.log(`${indent}  🖼️ Sprite: Type=${type}, SizeMode=${sizeMode}`);
        if (sprite.spriteFrame) console.log(`${indent}    Frame: ${sprite.spriteFrame.name}`);
    }
    
    // === PROGRESSBAR ===
    let progress = node.getComponent(cc.ProgressBar);
    if (progress) {
        let mode = ['HORIZONTAL', 'VERTICAL', 'FILLED'][progress.mode];
        console.log(`${indent}  ⏳ ProgressBar: Mode=${mode}, Progress=${(progress.progress*100).toFixed(0)}%`);
        console.log(`${indent}    Bar: ${progress.barSprite ? progress.barSprite.node.name : 'null'}`);
    }
    
    // === LABEL ===
    let label = node.getComponent(cc.Label);
    if (label) {
        console.log(`${indent}  🔤 Label: "${label.string}"`);
        console.log(`${indent}    FontSize:${label.fontSize} LineHeight:${label.lineHeight}`);
    }
    
    // === BUTTON ===
    let button = node.getComponent(cc.Button);
    if (button) {
        console.log(`${indent}  🔘 Button: Interactable=${button.interactable}`);
        if (button.transition === cc.Button.Transition.SPRITE_SWAP) {
            let normal = button.normalSpriteFrame?.name || 'null';
            let pressed = button.pressedSpriteFrame?.name || 'null';
            let hover = button.hoverSpriteFrame?.name || 'null';
            let disabled = button.disabledSpriteFrame?.name || 'null';
            console.log(`${indent}    Sprites: N=${normal} P=${pressed} H=${hover} D=${disabled}`);
        }
        // Click Events
        if (button.clickEvents && button.clickEvents.length > 0) {
            console.log(`${indent}    ClickEvents: ${button.clickEvents.length}`);
            button.clickEvents.forEach((event, i) => {
                console.log(`${indent}      [${i}] Target: ${event.handler ? event.handler.node.name : 'null'}`);
            });
        }
    }
    
    // === BLOCK INPUT ===
    let blockInput = node.getComponent(cc.BlockInputEvents);
    if (blockInput) console.log(`${indent}  ⛔ BlockInputEvents: ON`);
    
    // === COMPONENTS ===
    let comps = node._components || [];
    if (comps.length > 1) {  // Skip our own GameController
        let compNames = comps.map(c => c.name).filter(n => !n.includes('GameController')).join(', ');
        console.log(`${indent}  ⚙️ Extra Components: [${compNames}]`);
    }
    
    // === CHILDREN ===
    if (node.children && node.children.length > 0) {
        console.log(`${indent}  👥 Children: ${node.children.length}`);
        for (let child of node.children) {
            this.dumpNodeTree(child, depth + 1);
        }
    } else {
        console.log(`${indent}  👶 (Leaf node)`);
    }
        console.log(''); // Spacer
    } 


    onLoad() {
        // DUMP FROM CANVAS ROOT - shows EVERYTHING
        let canvas = cc.find('Canvas');
        console.log("=== FULL SCENE TREE FROM CANVAS ===");
        this.dumpNodeTree(canvas);
        console.log("=== END FULL TREE ===");
    }
    */

    start() {
        this.spawnItems();
        this.targetView.updateTargets(this.model.targets);

        if (this.energyProgress) {
            this.energyProgress.progress = 1.0;
            this.energyProgress.mode = 0;
        }

        // --- AUDIO FIX START ---
        // 1. Try to play immediately (might fail due to browser policy)
        this.playBGMusic();

        // 2. Register a one-time listener to "Unlock" audio on the first click anywhere
        // This solves the "AudioContext" error.
        if (cc.sys.isBrowser) {
            // Listen on the Canvas node (root) to catch any click
            cc.find("Canvas").on(cc.Node.EventType.TOUCH_START, this.unlockAudio, this);
        }
        // --- AUDIO FIX END ---
        // SECOND DUMP - shows items AFTER they spawn
        /* setTimeout(() => {
            console.log("=== SCENE TREE WITH ALL 45 ITEMS ===");
            let gameplayRoot = this.gameplayRoot;
            this.dumpNodeTree(gameplayRoot);
            console.log("=== END ITEMS TREE ===");
        }, 100); // Small delay so items finish spawning */
    }

    // Called on the very first touch of the game
    unlockAudio() {
        if (this._audioUnlocked) return;
        this._audioUnlocked = true;

        // Resume AudioContext if suspended
        if (cc.sys.isBrowser && cc.sys.os !== cc.sys.OS_ANDROID) {
            // Android handles this better natively, but for iOS/Desktop Web:
            cc.audioEngine.resumeAll();
        }

        // If music wasn't playing (because it was blocked), play it now
        if (!this.isMuted && this.bgMusic && !cc.audioEngine.isMusicPlaying()) {
            cc.audioEngine.playMusic(this.bgMusic, true);
        }

        // Remove the listener so we don't check this every click
        cc.find("Canvas").off(cc.Node.EventType.TOUCH_START, this.unlockAudio, this);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            cc.audioEngine.stopMusic();
            cc.audioEngine.stopAllEffects();
            this._alarmId = -1;
        } else {
            this.playBGMusic();
        }

        // Force SoundButton to update if it exists in the scene
        // (Optional: You can use an Event here, but direct is fine for simple ads)
        const soundBtn = cc.find("Canvas/UILayer/LeftPanel/SoundButton") || cc.find("Canvas/GameManager/SoundButton") || cc.find("Canvas/UILayer/LeftPanel/SoundToggleBtn/SoundButton");
        if (soundBtn) {
            const script = soundBtn.getComponent("SoundButton");
            if (script && (script as any).updateLabel) (script as any).updateLabel();
        }
    }

    public playBGMusic() {
        if (this.bgMusic && !this.isMuted) {
            // Ensure we don't stack music
            if (!cc.audioEngine.isMusicPlaying()) {
                cc.audioEngine.playMusic(this.bgMusic, true);
            }
        }
    }

    private playSFX(clip: cc.AudioClip) {
        if (clip && !this.isMuted) {
            return cc.audioEngine.playEffect(clip, false);
        }
        return -1;
    }

    update(dt: number) {
        if (this.model.isGameOver) return;

        this.model.timeLeft -= dt;

        if (this.model.timeLeft <= 10 || this._tutorialCount >= 2) {
            this.idleManager.forceStop();
        }

        let time = Math.max(0, this.model.timeLeft);
        let minutes = Math.floor(time / 60);
        let seconds = Math.floor(time % 60);

        if (this.timerLabel) this.timerLabel.string = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (this.energyProgress) {
            this.energyProgress.progress = time / this.model.TOTAL_TIME;
        }

        if (time <= 10 && time > 0) {
            if (!this.warningBorder.active) {
                this.warningBorder.active = true;
                this.warningBorder.opacity = 0;
                this.warningBorder.setContentSize(1024, 576);
                this.warningBorder.setPosition(0, 0); // Assuming it is a sibling of GameplayRoot or child of Canvas

                this.warningTween = cc.tween(this.warningBorder)
                    .to(0.5, { opacity: 255 }, null)
                    .to(0.5, { opacity: 100 }, null)
                    .union()
                    .repeatForever()
                    .start();

                if (this.alarmSound && this._alarmId === -1 && !this.isMuted) {
                    this._alarmId = cc.audioEngine.playEffect(this.alarmSound, true);
                }
            }
        }

        if (this.model.timeLeft <= 0) {
            this.gameOver(false);
        }
    }

    // ... spawnItems, onItemClicked, checkMatch logic remains the same ...
    spawnItems() {
        if (!this.itemPrefab) {
            console.error("❌ itemPrefab is missing");
            return;
        }

        let prefabInstance = this.itemPrefab;
        if (!(this.itemPrefab instanceof cc.Prefab)) {
            prefabInstance = cc.instantiate(this.itemPrefab);
        }

        const newItem = cc.instantiate(prefabInstance);
        let w = this.gameplayRoot.width;
        let h = this.gameplayRoot.height;
        for (let i = 0; i < 45; i++) {
            let node = cc.instantiate(this.itemPrefab);
            node.parent = this.gameplayRoot;
            let x = (Math.random() - 0.5) * (w - 100);
            let y = (Math.random() - 0.5) * (h - 100);
            node.setPosition(cc.v2(x, y));
            node.angle = Math.random() * 360;
            node.zIndex = i;

            let type: any = 'burger';
            let frame = this.frameBurger;
            if (i >= 15 && i < 30) { type = 'fries'; frame = this.frameFries; }
            else if (i >= 30) { type = 'iceCream'; frame = this.frameIceCream; }

            let comp = node.getComponent(ItemComponent);

            // Failsafe de proteção: Só inicia se o componente existir
            if (comp) {
                comp.init(type, frame, (item: any) => this.onItemClicked(item));
            } else {
                console.error("❌ O Hambúrguer nasceu sem o ItemComponent!");
            }
/*
            let itemComp = hamburger.getComponent('ItemComponent');

             // Fallback de resgate caso a string não resolva
            if (!itemComp && hamburger._components) {
                for (let comp of hamburger._components) {
                    // Verifica se a classe do componente está no mapa de UUIDs de scripts
                    if (comp && cc.js.getClassName(comp) === 'ItemComponent') {
                        itemComp = comp;
                        break;
                    }
                }
            } */
        }
    }

    onItemClicked(item: ItemComponent) {
        if (this.model.isGameOver || this._processing) return;
        this.idleManager.reset();
        if (this.model.addToTray(item)) {
            this.playSFX(this.sfxClick);
            item.disableInteraction();
            let index = this.model.trayItems.length - 1;
            this.collectArea.animateToSlot(item, index, () => this.checkMatch());
        }
    }

    checkMatch() {
        let match = this.model.checkMatch();
        if (match) {
            this._processing = true;
            this.playSFX(this.sfxMatch);
            let worldPos = match.items[1].node.convertToWorldSpaceAR(cc.v2(0, 0));
            this.spawnVisualEffect(worldPos);

            let type = match.type;
            this.model.targets[type] -= 3;
            if (this.model.targets[type] < 0) this.model.targets[type] = 0;
            this.targetView.updateTargets(this.model.targets);
            this.model.removeItems(match.items);
            this.collectArea.animateMatch(match.items, () => {
                this.collectArea.rearrange(this.model.trayItems);
                this._processing = false;
                if (this.model.checkWin()) this.gameOver(true);
            });
        } else {
            if (this.model.trayItems.length >= this.model.MAX_SLOTS) this.gameOver(false);
        }
    }

    spawnVisualEffect(worldPos: cc.Vec2) {
        let parent = this.node.parent;
        if (this.fxExplosion) {
            let smoke = new cc.Node();
            let spr = smoke.addComponent(cc.Sprite);
            spr.spriteFrame = this.fxExplosion;
            smoke.parent = parent;
            let localPos = parent.convertToNodeSpaceAR(worldPos);
            smoke.setPosition(localPos);
            smoke.scale = 0.5;
            smoke.opacity = 200;
            cc.tween(smoke).to(0.5, { scale: 1.5, opacity: 0 }, { easing: 'cubicOut' }).call(() => smoke.destroy()).start();
        }
        if (this.fxStar) {
            for (let i = 0; i < 8; i++) {
                let star = new cc.Node();
                let spr = star.addComponent(cc.Sprite);
                spr.spriteFrame = this.fxStar;
                star.parent = parent;
                let localPos = parent.convertToNodeSpaceAR(worldPos);
                star.setPosition(localPos);
                star.scale = 0.5 + Math.random() * 0.5;
                let angle = Math.random() * Math.PI * 2;
                let dist = 60 + Math.random() * 40;
                let destX = localPos.x + Math.cos(angle) * dist;
                let destY = localPos.y + Math.sin(angle) * dist;
                cc.tween(star).to(0.5, { position: cc.v2(destX, destY), scale: 0, opacity: 0 }, { easing: 'cubicOut' }).call(() => star.destroy()).start();
            }
        }
    }

    gameOver(win: boolean) {
        this.model.isGameOver = true;
        this.idleManager.forceStop();
        if (this.warningTween) { this.warningTween.stop(); this.warningBorder.active = false; }
        cc.audioEngine.stopMusic();
        cc.audioEngine.stopAllEffects();
        if (win) {
            this.playSFX(this.sfxWin);
            this.winScreen.active = true;
            this.gameplayRoot.active = false;
            if (this.leftPanel) this.leftPanel.active = false;
            if (this.rightPanel) this.rightPanel.active = false;
        } else {
            this.playSFX(this.sfxLose);
            this.loseScreen.active = true;
            this.gameplayRoot.active = true; // Keep items visible
            if (this.leftPanel) this.leftPanel.active = false;
            if (this.rightPanel) this.rightPanel.active = false;
        }
    }

    onTutorialShown() { this._tutorialCount++; }

    onDestroy() {
        if (this.warningTween) this.warningTween.stop();
        cc.audioEngine.stopAllEffects();
        cc.audioEngine.stopMusic();
    }
}