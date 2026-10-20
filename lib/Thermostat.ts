import { ResourceDevice, bounded } from './ResourceDevice';
export class Thermostat extends ResourceDevice {
  getCurrentHeatingEnabled(): boolean | null { return this.binary([0x14b], 'odp0000'); }
  getHeatingEnabled(): boolean | null { return this.binary([0x38], 'odp0008'); }
  getCurrentTemperature(): number | null { return this.number([0x130], 'odp0010'); }
  getTargetTemperature(): number | null { return this.number([0x33], 'odp0006'); }
  getMode(): string | null { const eco = this.binary([0x44]); return eco === null ? null : eco ? '1' : '0'; }
  async enableAutoHeating(): Promise<void> { await this.write([0x42], '1', 'idp0012'); }
  async disableHeating(): Promise<void> { await this.write([0x42], '0', 'idp0012'); }
  async setTargetTemperature(value: number): Promise<void> {
    await this.write([0x140], String(bounded(value, 7, 35)), 'idp0016');
  }
  async setMode(value: string): Promise<void> {
    if (value !== '0' && value !== '1') { throw new Error('Unknown thermostat mode.'); }
    await this.write([0x3a], value);
  }
}
