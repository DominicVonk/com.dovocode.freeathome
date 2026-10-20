import { ResourceDevice, bounded } from './ResourceDevice';
export class Shutter extends ResourceDevice {
  getPosition(): number | null {
    const value = this.number([0x121], 'odp0001');
    return value === null ? null : bounded(value, 0, 100);
  }
  isClosed(): boolean | null { const value = this.getPosition(); return value === null ? null : value >= 100; }
  getState(): 'up' | 'down' | 'idle' | null {
    const state = this.number([0x120], 'odp0000');
    // ABB enum: 0 stopped after up, 1 stopped after down, 2 moving up, 3 moving down.
    return state === 2 ? 'up' : state === 3 ? 'down' : state === 0 || state === 1 ? 'idle' : null;
  }
  async open(): Promise<void> { await this.write([0x20], '0', 'idp0000'); }
  async close(): Promise<void> { await this.write([0x20], '1', 'idp0000'); }
  async stop(): Promise<void> {
    if (this.point('inputs', [0x22])) { await this.write([0x22], '1'); }
    else { await this.write([0x21], '0', 'idp0001'); }
  }
}
