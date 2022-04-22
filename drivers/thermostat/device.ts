import { Thermostat } from '@dominicvonk/fah/dist/Thermostat';
import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log('MyDevice has been initialized');

    let thermostat: Thermostat = (((this.homey.app as MyApp)._client?.devices?.find(e => e.id == this.getData().serialNumber && e.channel == this.getData().channel)) as Thermostat)!;


    this.setCapabilityValue("onoff", thermostat.getHeatingEnabled());
    this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
    this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())
    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await thermostat.enableAutoHeating();
      } else {
        await thermostat.disableHeating();
      }
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      await thermostat.setTargetTemperature(value);
    });


    thermostat.on(Thermostat.HEATING_TURNED_ON, () => {
      this.setCapabilityValue("onoff", true);
    })

    thermostat.on(Thermostat.HEATING_TURNED_OFF, () => {
      this.setCapabilityValue("onoff", false);
    })

    thermostat.on(Thermostat.TARGET_TEMPERATURE_CHANGED, () => {

      this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())
    })

    thermostat.on(Thermostat.TEMPERATURE_CHANGED, () => {

      this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
    });

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
