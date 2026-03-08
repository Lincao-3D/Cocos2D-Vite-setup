declare const cc: any;
const { ccclass, property } = cc._decorator;

@ccclass
export default class TargetView extends cc.Component {
    @property(cc.Label) lblBurger: any = null;
    @property(cc.Label) lblFries: any = null;
    @property(cc.Label) lblIceCream: any = null;

    updateTargets(targets: any) {
        if (this.lblBurger) this.lblBurger.string = targets['burger'].toString();
        if (this.lblFries) this.lblFries.string = targets['fries'].toString();
        if (this.lblIceCream) this.lblIceCream.string = targets['iceCream'].toString();
    }
}