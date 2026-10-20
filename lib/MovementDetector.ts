import { ResourceDevice } from './ResourceDevice';
export class MovementDetector extends ResourceDevice {
  getMotion(): boolean | null { return this.binary([0x6, 0x100], 'odp0000'); }
}
