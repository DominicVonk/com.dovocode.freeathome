import { Shutter } from './Shutter';
import { bounded } from './ResourceDevice';
export class Blind extends Shutter {
  getTilt(): number | null {
    const value = this.number([0x122], 'odp0002');
    return value === null ? null : bounded(value / 100, 0, 1);
  }
  async setTilt(tilt: number): Promise<void> {
    await this.write([0x24], String(Math.round(bounded(tilt, 0, 1) * 100)), 'idp0003');
  }
}
