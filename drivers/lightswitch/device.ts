import Homey from 'homey';
import MyApp from '../../app';

class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit () {
    this.log('MyDevice has been initialized');

    this.registerCapabilityListener("onoff", async (value) => {
      await (this.homey.app as MyApp)._client?.set(this.getData().id, this.getData().channel, 'idp0000', value ? '1' : '0');
    });

    this.setCapabilityValue("onoff", this.getData().datapoints['idp0000'] === '1');
    await (this.homey.app as MyApp)._client?.addEventListener(this.event.bind(this))
  }

  async event (message: any) {
    this.log(message)
    if (message.type === 'update') {
      if (this.getData().id in message.result) {
        if (message?.result?.[this.getData().id]?.channels[this.getData().channel]?.datapoints?.['idp0000'] !== undefined) {
          this.setCapabilityValue("onoff", message.result[this.getData().id].channels[this.getData().channel].datapoints['idp0000'] === '1');
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
    await (this.homey.app as MyApp)._client?.removeEventListener(this.event.bind(this))
  }

}

module.exports = MyDevice;
