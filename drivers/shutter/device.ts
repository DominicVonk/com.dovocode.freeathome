import { Shutter, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<Shutter> {
  protected matches(device: Device): device is Shutter { return device instanceof Shutter; }
  protected state(device: Shutter): CapabilityState { const closed = device.isClosed(); return { onoff: closed === null ? null : !closed, windowcoverings_state: device.getState() }; }
  protected registerControls(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => { const device = this.getResource(); await (value ? device.open() : device.close()); });
    this.registerCapabilityListener('windowcoverings_state', async (value: string) => {
      const device = this.getResource();
      if (value === 'up') { await device.open(); }
      else if (value === 'down') { await device.close(); }
      else if (value === 'idle') { await device.stop(); }
      else { throw new Error('Unknown window covering state.'); }
    });
  }
}
module.exports = MyDevice;
