import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log('MyDevice has been initialized');
    await new Promise(r => setTimeout(r, 5000))
    let initData = await ((this.homey.app as MyApp)._client?.getAllDevices());
    let datapoints = this.getData().datapoints;
    if (initData?.[this.getData().id]?.channels[this.getData().channel]) {
      datapoints = initData[this.getData().id].channels[this.getData().channel].datapoints;
    }

    /* Eco: idp0011 */
    /* OnOff: idp0012 */
    /* Werkelijke: odp0010 */
    /* Target: */
    this.registerCapabilityListener("onoff", async (value) => {
      this.log(this.getData());
      await (this.homey.app as MyApp)._client?.set(this.getData().id, this.getData().channel, 'idp0012', value ? '1' : '0');
    });
    this.registerCapabilityListener("thermostat_mode_mh", async (value) => {
      this.log(this.getData());
      await (this.homey.app as MyApp)._client?.set(this.getData().id, this.getData().channel, 'idp0011', value);
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      this.log(this.getData());
      await (this.homey.app as MyApp)._client?.set(this.getData().id, this.getData().channel, 'idp0016', value);
    });

    this.log(datapoints);
    this.setCapabilityValue("onoff", datapoints['odp0008'] === '1');
    this.setCapabilityValue("thermostat_mode_mh", (datapoints['odp0009'] == '68' ? 1 : 0).toString());
    this.setCapabilityValue("measure_temperature", Math.round(datapoints['odp0010'] * 10) / 10)
    this.setCapabilityValue("target_temperature", Math.round(datapoints['odp0006'] * 10) / 10)
    await (this.homey.app as MyApp)._client?.addEventListener(this.event.bind(this))

  }
  async event (message: any) {
    if (message.type === 'update') {
      if (this.getData().id in message.result) {
        this.log(message.result?.[this.getData().id].channels);
        if (message?.result?.[this.getData().id]?.channels[this.getData().channel]?.datapoints?.['odp0008'] !== undefined) {
          this.setCapabilityValue("onoff", message.result[this.getData().id].channels[this.getData().channel].datapoints['odp0008'] === '1');
        }
        if (message?.result?.[this.getData().id]?.channels[this.getData().channel]?.datapoints?.['odp0009'] !== undefined) {
          this.setCapabilityValue("thermostat_mode_mh", (message.result[this.getData().id].channels[this.getData().channel].datapoints['odp0009'] == '68' ? 1 : 0).toString());
        }
        if (message?.result?.[this.getData().id]?.channels[this.getData().channel]?.datapoints?.['odp0006'] !== undefined) {
          this.setCapabilityValue("target_temperature", Math.round(message.result[this.getData().id].channels[this.getData().channel].datapoints['odp0006'] * 10) / 10);
        }


        if (message?.result?.[this.getData().id]?.channels[this.getData().channel]?.datapoints?.['odp0010'] !== undefined) {

          this.setCapabilityValue("measure_temperature", Math.round(message.result[this.getData().id].channels[this.getData().channel].datapoints['odp0010'] * 10) / 10)
        }
      }
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
