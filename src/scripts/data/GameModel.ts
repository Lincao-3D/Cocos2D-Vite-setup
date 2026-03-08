declare const cc: any;
interface GameData { [key: string]: any; } // Fix index errors

// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameModel extends cc.Component {
    // Constantes
    public readonly MAX_SLOTS = 7;
    public readonly TOTAL_TIME = 30;

    // Estado
    public trayItems: any[] = []; // Guardará referências aos ItemComponents
    public targets: any = { 'burger': 15, 'fries': 15, 'iceCream': 15 };
    public timeLeft: number = 30;
    public isGameOver: boolean = false;

    constructor() {
        super();
        this.timeLeft = this.TOTAL_TIME;
    }

    // Tenta adicionar (Lógica)
    addToTray(itemComponent: any): boolean {
        if (this.trayItems.length < this.MAX_SLOTS) {
            this.trayItems.push(itemComponent);
            return true;
        }
        return false;
    }

    // Remove itens específicos da lógica
    removeItems(itemsToRemove: any[]) {
        this.trayItems = this.trayItems.filter(i => !itemsToRemove.includes(i));
    }

    // Verifica Match
    checkMatch() {
        let counts = {};
        // Conta tipos
        this.trayItems.forEach(item => {
            let type = item.itemType;
            counts[type] = (counts[type] || 0) + 1;
        });

        // Procura trio
        for (let type in counts) {
            if (counts[type] >= 3) {
                // Filtra os 3 primeiros desse tipo
                let matches = this.trayItems.filter(i => i.itemType === type).slice(0, 3);
                return { type: type, items: matches };
            }
        }
        return null;
    }

    checkWin(): boolean {
        return (this.targets['burger'] + this.targets['fries'] + this.targets['iceCream']) <= 0;
    }
}