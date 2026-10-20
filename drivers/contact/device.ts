import { ContactSensor, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<ContactSensor> {
  protected matches(device: Device): device is ContactSensor { return device instanceof ContactSensor; }
  protected state(device: ContactSensor): CapabilityState { return { alarm_contact: device.isOpen() }; }
  protected registerControls(): void {

  }
}
module.exports = MyDevice;
