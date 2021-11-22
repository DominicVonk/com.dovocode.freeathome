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
    this.log(await client?.getAllDevices());
    return Object.values(await client?.getAllDevices()).flatMap((device: any) => {
      if (device.typeName === 'Raumtemperaturregler') {
        return Object.entries(device.channels).map(([k, v]: [string, any]) => {
          if (v?.displayName) {
            return {
              name: `${v?.displayName}`,
              data: {
                id: device.serialNumber,
                channel: k,
                datapoints: v.datapoints
              }
            }
          }
        }).filter((e: any) => e)
      } else {
        return [];
      }
    });
  }

}

module.exports = MyDriver;
