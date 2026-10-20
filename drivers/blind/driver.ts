import Homey from 'homey';
import type MyApp from '../../app';
import { Blind } from '../../lib';
class MyDriver extends Homey.Driver {
  async onPairListDevices() {
    return (this.homey.app as MyApp).listDevices(device => device instanceof Blind);
  }
}
module.exports = MyDriver;
