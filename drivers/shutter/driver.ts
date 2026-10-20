import Homey from 'homey';
import type MyApp from '../../app';
import { Shutter, Blind } from '../../lib';
class MyDriver extends Homey.Driver {
  async onPairListDevices() {
    return (this.homey.app as MyApp).listDevices(device => device instanceof Shutter && !(device instanceof Blind));
  }
}
module.exports = MyDriver;
