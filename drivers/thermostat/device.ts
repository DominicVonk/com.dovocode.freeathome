import { ConnectionEvent } from '@dominicvonk/freeathome-devices/dist/Connection';
import { Thermostat, ThermostatEvent } from '@dominicvonk/freeathome-devices';
import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */

  lastbinds: {
    thermostat?: Thermostat,
    on?: () => void,
    off?: () => void,
    targetChanged?: () => void,
    changed?: () => void
  } = {};
  async onInit () {
    this.log('MyDevice has been initialized');
    await this.rebind();

    this.registerCapabilityListener("onoff", async (value) => {
      if (value) {
        await this.lastbinds.thermostat?.enableAutoHeaing();
      } else {
        await this.lastbinds.thermostat?.disableHeating();
      }
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      await this.lastbinds.thermostat?.setTargetTemperature(value);
    });

    (((this.homey.app as MyApp)._client?.on(ConnectionEvent.DEVICES, () => this.rebind())));
  }
  async rebind () {
    let thermostat: Thermostat = (((this.homey.app as MyApp)._client?.getDevice(this.getData().serialNumber, this.getData().channel)) as Thermostat);



    if (this.lastbinds?.thermostat && this.lastbinds?.on) {
      this.lastbinds?.thermostat.off(ThermostatEvent.HEATING_TURNED_ON, this.lastbinds?.on);
    }
    if (this.lastbinds?.thermostat && this.lastbinds?.off) {
      this.lastbinds?.thermostat.off(ThermostatEvent.HEATING_TURNED_OFF, this.lastbinds?.off);
    }

    if (this.lastbinds?.thermostat && this.lastbinds?.targetChanged) {
      this.lastbinds?.thermostat.off(ThermostatEvent.TARGET_TEMPERATURE_CHANGED, this.lastbinds?.targetChanged);
    }

    if (this.lastbinds?.thermostat && this.lastbinds?.changed) {
      this.lastbinds?.thermostat.off(ThermostatEvent.TEMPERATURE_CHANGED, this.lastbinds?.changed);
    }

    this.lastbinds.thermostat = thermostat;
    /* Eco: idp0011 */
    /* OnOff: idp0012 */
    /* Werkelijke: odp0010 */
    /* Target: */

    this.setCapabilityValue("onoff", thermostat.currentHeatingIsEnabled());
    //this.setCapabilityValue("thermostat_mode_mh", (datapoints['odp0009'] == '68' ? 1 : 0).toString());
    this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
    this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())

    this.lastbinds.on = (() => {
      this.setCapabilityValue("onoff", true);
    }).bind(this);

    thermostat.on(ThermostatEvent.HEATING_TURNED_ON, this.lastbinds.on)

    this.lastbinds.off = (() => {
      this.setCapabilityValue("onoff", false);
    }).bind(this);
    thermostat.on(ThermostatEvent.HEATING_TURNED_OFF, this.lastbinds.off)

    this.lastbinds.targetChanged = (() => {

      this.setCapabilityValue("target_temperature", thermostat.getTargetTemperature())
    }).bind(this);
    thermostat.on(ThermostatEvent.TARGET_TEMPERATURE_CHANGED, this.lastbinds.targetChanged)

    this.lastbinds.changed = (() => {

      this.setCapabilityValue("measure_temperature", thermostat.getCurrentTemperature())
    }).bind(this);
    thermostat.on(ThermostatEvent.TEMPERATURE_CHANGED, this.lastbinds.changed);

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
