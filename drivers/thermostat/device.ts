import { Thermostat, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<Thermostat> {
  protected matches(device: Device): device is Thermostat { return device instanceof Thermostat; }
  protected state(device: Thermostat): CapabilityState {
    const target = device.getTargetTemperature();
    return { onoff: device.getHeatingEnabled(), target_temperature: target !== null && target >= 7 && target <= 35 ? target : null, measure_temperature: device.getCurrentTemperature(), thermostat_mode_mh: device.getMode() }; }
  protected registerControls(): void {
    this.registerCapabilityListener('onoff', async (value: boolean) => { const device = this.getResource(); await (value ? device.enableAutoHeating() : device.disableHeating()); });
    this.registerCapabilityListener('target_temperature', async (value: number) => this.getResource().setTargetTemperature(value));
    this.registerCapabilityListener('thermostat_mode_mh', async (value: string) => this.getResource().setMode(value));
  }
}
module.exports = MyDevice;
