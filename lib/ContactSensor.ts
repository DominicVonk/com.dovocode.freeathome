import { ResourceDevice } from './ResourceDevice';
export class ContactSensor extends ResourceDevice {
  isOpen(): boolean | null { return this.binary([0x35], 'odp0000'); }
}
