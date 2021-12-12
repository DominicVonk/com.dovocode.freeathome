import { Thermostat, ThermostatEvent } from '@dominicvonk/freeathome-devices';
import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log('MyDevice has been initialized');

    let thermostat: Thermostat = (((this.homey.app as MyApp)._client?.getDevice(this.getData().serialNumber, this.getData().channel)) as Thermostat);



    /* Eco: idp0011 */
    /* OnOff: idp0012 */
    /* Werkelijke: odp0010 */
    /* Target: */
    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await thermostat.enableAutoHeaing();
      } else {
        await thermostat.disableHeating();
      }
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      await thermostat.setTargetTemperature(value);
    });

    this.setCapabilityValue("onoff", thermostat.currentHeatingIsEnabled());
    //this.setCapabilityValue("thermostat_mode_mh", (datapoints['odp0009'] == '68' ? 1 : 0).toString());
    this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
    this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())

    thermostat.on(ThermostatEvent.HEATING_TURNED_ON, () => {
      this.setCapabilityValue("onoff", true);
    })

    thermostat.on(ThermostatEvent.HEATING_TURNED_OFF, () => {
      this.setCapabilityValue("onoff", false);
    })

    thermostat.on(ThermostatEvent.TARGET_TEMPERATURE_CHANGED, () => {

      this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())
    })
    thermostat.on(ThermostatEvent.TEMPERATURE_CHANGED, () => {

      this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
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
