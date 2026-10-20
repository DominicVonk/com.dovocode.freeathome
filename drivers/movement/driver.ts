import Homey from 'homey';
import type MyApp from '../../app';
import { MovementDetector } from '../../lib';
class MyDriver extends Homey.Driver {
  async onPairListDevices() {
    return (this.homey.app as MyApp).listDevices(device => device instanceof MovementDetector);
  }
}
module.exports = MyDriver;
