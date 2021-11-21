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
    return Object.values(await client?.getAllDevices()).flatMap((device: any) => {
      if (device.typeName === 'Sensor/ Schaltaktor 1/1-fach' || device.typeName === 'Sensor/ Schaltaktor 2/2-fach') {
        return Object.entries(device.channels).map(([k, v]: [string, any]) => {
          return {
            name: `${v?.displayName}`,
            data: {
              id: device.serialNumber,
              channel: k,
              datapoints: v.datapoints
            }
          }
        })
      } else {
        return [];
      }
    });
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

}

module.exports = MyDriver;
