declare const cc: any;
const { ccclass, property } = cc._decorator;
import ItemComponent from "@scripts/components/ItemComponent";
// import ItemComponent from "../components/ItemComponent";

// import ItemComponent from "./ItemComponent";
@ccclass
export default class CollectArea extends cc.Component {
    @property([cc.Node])
    // @ts-ignore
    slots: cc.Node[] = []; // Arraste os 7 nodes vazios aqui

    // Move visualmente para o slot
    animateToSlot(item: ItemComponent, slotIndex: number, onComplete: Function) {
        let targetSlot = this.slots[slotIndex];

        // 🎯 Disable Layout on the tray to prevent interference
        let layout = this.getComponent(cc.Layout);
        if (layout) layout.enabled = false;

        // 🎯 Disable Widget on the item so it doesn't fight the tween
        let itemWidget = item.getComponent(cc.Widget);
        if (itemWidget) itemWidget.enabled = false;

        // 1. Get current world position
        let worldPos = item.node.convertToWorldSpaceAR(cc.v2(0, 0));

        // 2. Change parent and set high zIndex immediately
        item.node.parent = this.node;
        item.node.zIndex = 1000;

        // 3. Convert position to local space
        let localPos = this.node.convertToNodeSpaceAR(worldPos);
        item.node.setPosition(localPos);

        // 4. Animate to target slot
        // Parent is @ 90deg, World -90deg goal -> Local -180deg
        cc.tween(item.node)
            .to(0.3, {
                position: targetSlot.position,
                scale: 0.7,
                angle: -180
            }, { easing: 'cubicOut' })
            .call(() => {
                // Ensure final zIndex and state
                item.node.zIndex = 100 + slotIndex;
                if (onComplete) onComplete();
            })
            .start();
    }

    // Rearranja itens restantes (Gravidade lateral/vertical)
    rearrange(items: ItemComponent[]) {
        items.forEach((item, index) => {
            if (index < this.slots.length) {
                cc.tween(item.node)
                    .to(0.2, { position: this.slots[index].position }, { easing: 'sineOut' })
                    .start();
            }
        });
    }

    animateMatch(items: ItemComponent[], onComplete: Function) {
        // items[1] é o do meio visualmente
        let center = items[1].node;
        let others = [items[0].node, items[2].node];

        // Outros vão para o centro
        others.forEach(node => {
            cc.tween(node).to(0.15, { position: center.position, scale: 0 }).start();
        });

        // Centro expande e some
        cc.tween(center)
            .to(0.1, { scale: 1.2 })
            .to(0.1, { scale: 0 })
            .call(() => {
                items.forEach(i => i.node.destroy());
                onComplete();
            })
            .start();
    }
}