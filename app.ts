import { FreeAtHomeApi } from './freeathome/index';
import Homey from 'homey';

class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  _client?: FreeAtHomeApi;
  async onInit () {
    this.log('MyApp has been initialized');
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    const ip = this.homey.settings.get('ip');
    if (username && password && ip) {
      this._client = new FreeAtHomeApi(ip, username, password);
      await this._client.ready();
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

    this._client = new FreeAtHomeApi(ip, username, password);
    await this._client.ready();
  }

}

module.exports = MyApp;

export default MyApp;