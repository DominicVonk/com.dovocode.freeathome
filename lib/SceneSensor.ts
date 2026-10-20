import { ResourceDevice } from './ResourceDevice';
export class SceneSensor extends ResourceDevice {
  isOn(): boolean | null { return this.binary([0x100], 'odp0000'); }
}
