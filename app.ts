import { Client } from '@dominicvonk/fah';
import Homey from 'homey';

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  _client?: Client;
  async onInit () {
    this.log('MyApp has been initialized');
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    const ip = this.homey.settings.get('ip');
    this._client = new Client(ip, username, password);
    if (username && password && ip) {
      try {
        await this._client.start();
      } catch (error) {
      }
    }

    this.homey.settings.on("set", this._reconnectClient.bind(this));
  }
  getClient () {
    return this._client;
  }
  async _reconnectClient (arg: any) {
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    const ip = this.homey.settings.get('ip');
    try {
      await this._client?.updateLogin(ip, username, password);
    } catch {

    }
  }

}

module.exports = MyApp;

export default MyApp;