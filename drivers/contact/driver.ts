import Homey from 'homey';
import type MyApp from '../../app';
import { ContactSensor } from '../../lib';
class MyDriver extends Homey.Driver {
  async onPairListDevices() {
    return (this.homey.app as MyApp).listDevices(device => device instanceof ContactSensor);
  }
}
module.exports = MyDriver;
