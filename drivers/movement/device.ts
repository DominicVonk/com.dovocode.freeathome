import { MovementDetector, Device } from '../../lib';
import { HomeyResourceDevice, CapabilityState } from '../../lib/homey/ResourceDevice';

class MyDevice extends HomeyResourceDevice<MovementDetector> {
  protected matches(device: Device): device is MovementDetector { return device instanceof MovementDetector; }
  protected state(device: MovementDetector): CapabilityState { return { alarm_motion: device.getMotion() }; }
  protected registerControls(): void {

  }
}
module.exports = MyDevice;
