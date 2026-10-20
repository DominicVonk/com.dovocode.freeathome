import { Dimmer, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<Dimmer> {
  protected matches(device: Device): device is Dimmer { return device instanceof Dimmer; }
  protected state(device: Dimmer): CapabilityState { return { onoff: device.isOn(), dim: device.getBrightness() }; }
  protected registerControls(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => { const device = this.getResource(); await (value ? device.turnOn() : device.turnOff()); });
    this.registerCapabilityListener('dim', async (value: number) => this.getResource().setBrightness(value));
  }
}
module.exports = MyDevice;
