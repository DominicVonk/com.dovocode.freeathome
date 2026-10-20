import { Switch, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<Switch> {
  protected matches(device: Device): device is Switch { return device instanceof Switch; }
  protected state(device: Switch): CapabilityState { return { onoff: device.isOn() }; }
  protected registerControls(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => { const device = this.getResource(); await (value ? device.turnOn() : device.turnOff()); });
  }
}
module.exports = MyDevice;
