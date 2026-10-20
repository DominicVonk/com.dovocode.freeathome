import { Blind, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<Blind> {
  protected matches(device: Device): device is Blind { return device instanceof Blind; }
  protected state(device: Blind): CapabilityState { const closed = device.isClosed(); return { onoff: closed === null ? null : !closed, windowcoverings_state: device.getState(), windowcoverings_tilt_set: device.getTilt() }; }
  protected registerControls(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => { const device = this.getResource(); await (value ? device.open() : device.close()); });
    this.registerCapabilityListener('windowcoverings_state', async (value: string) => {
      const device = this.getResource();
      if (value === 'up') { await device.open(); }
      else if (value === 'down') { await device.close(); }
      else if (value === 'idle') { await device.stop(); }
      else { throw new Error('Unknown window covering state.'); }
    });
    this.registerCapabilityListener('windowcoverings_tilt_set', async (value: number) => this.getResource().setTilt(value));
  }
}
module.exports = MyDevice;
