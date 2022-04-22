import { Thermostat } from '@dominicvonk/fah/dist/Thermostat';
import Homey from 'homey';
import MyApp from '../../app';
class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit () {
    this.log('MyDriver has been initialized');

  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices () {
    let client = (this.homey.app as MyApp).getClient();
    return ((client?.devices || [])?.filter(device => device instanceof Thermostat) as Thermostat[])?.map((device: Thermostat) => {
      if (device?.id && device?.channel) {
        return {
          name: 'F@H ' + device.name,
          data: {
            serialNumber: device.id,
            channel: device.channel
          }
        }
      } else {
        return null;
      }
    })?.filter((e: any) => e);

  }
}

module.exports = MyDriver;
