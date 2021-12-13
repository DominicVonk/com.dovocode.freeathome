import { Light, LightEvent } from '@dominicvonk/freeathome-devices';
import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {

    let light: Light = (((this.homey.app as MyApp)._client?.getDevice(this.getData().serialNumber, this.getData().channel) as Light));

    if (light) {
      this.log(this.getName() + ' initialized');
      let isOn = light.isOn();

      this.registerCapabilityListener("onoff", async (value) => {
        this.log(this.getName() + ' ' + value);
        value ? await light.turnOn() : await light.turnOff();
      });

      this.setCapabilityValue("onoff", isOn);
      light.on(LightEvent.TURNED_ON, () => {
        this.log(this.getName() + ' on');
        this.setCapabilityValue("onoff", true);
      })

      light.on(LightEvent.TURNED_OFF, () => {
        this.log(this.getName() + ' off');
        this.setCapabilityValue("onoff", false);
      })
    }
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
