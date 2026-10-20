import { ResourceDevice } from './ResourceDevice';
export class Switch extends ResourceDevice {
  isOn(): boolean | null { return this.binary([0x100], 'odp0000'); }
  async turnOn(): Promise<void> { await this.write([0x1], '1', 'idp0000'); }
  async turnOff(): Promise<void> { await this.write([0x1], '0', 'idp0000'); }
}
