import { Switch } from './Switch';
import { bounded } from './ResourceDevice';
export class Dimmer extends Switch {
  getBrightness(): number | null {
    const value = this.number([0x110], 'odp0001');
    return value === null ? null : bounded(value / 100, 0, 1);
  }
  async setBrightness(brightness: number): Promise<void> {
    await this.write([0x11], String(Math.round(bounded(brightness, 0, 1) * 100)), 'idp0002');
  }
}
