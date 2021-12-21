import { ConnectionEvent } from '@dominicvonk/freeathome-devices/dist/Connection';
import { Light, LightEvent } from '@dominicvonk/freeathome-devices';
import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  lastbinds: {
    light?: Light
  } = {};

  self: MyDevice | null = null;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.self = this;
    this.rebind();
    this.registerCapabilityListener("onoff", async (value) => {
      this.log(this.getName() + ' ' + value);
      value ? await this.lastbinds.light?.turnOn() : await this.lastbinds.light?.turnOff();
    });
    (((this.homey.app as MyApp)._client?.on(ConnectionEvent.DEVICES, () => this.self?.rebind.call(this.self))));
  }

  rebind () {

    if (this.lastbinds?.light) {
      this.lastbinds?.light.removeAllListeners(LightEvent.TURNED_ON);
      this.lastbinds?.light.removeAllListeners(LightEvent.TURNED_OFF);
    }
    let light: Light = (((this.homey.app as MyApp)._client?.getDevice(this.getData().serialNumber, this.getData().channel) as Light));

    this.self?.log(this.getName() + ' initialized');
    let isOn = light.isOn();



    this.self?.setCapabilityValue("onoff", isOn);


    this.lastbinds.light = light;
    light.on(LightEvent.TURNED_ON, () => {
      this.self?.log(this.getName() + ' on');
      this.self?.setCapabilityValue("onoff", true);
    })


    light.on(LightEvent.TURNED_OFF, () => {
      this.self?.log(this.getName() + ' off');
      this.self?.setCapabilityValue("onoff", false);
    })
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded () {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings ({ oldSettings: { }, newSettings: { }, changedKeys: { } }): Promise<string | void> {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed (name: string) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted () {
    this.log('MyDevice has been deleted');
  }

}

module.exports = MyDevice;
