import Homey from 'homey';
import type MyApp from '../../app';
import { Thermostat } from '../../lib';
class MyDriver extends Homey.Driver {
  async onPairListDevices() {
    return (this.homey.app as MyApp).listDevices(device => device instanceof Thermostat);
  }
}
module.exports = MyDriver;
