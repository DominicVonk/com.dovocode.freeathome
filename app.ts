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

    this._client = new FreeAtHomeApi(ip, username, password);


    await this._client?.start();
    this.homey.settings.on("set", this._reconnectClient.bind(this));
  }
  getClient () {
    return this._client;
  }
  _reconnectClient (arg: any) {
    console.log("settings updated.... reconnecting");
    if (this._client?._connected) {
      this._client.stop();
    }
    const username = this.homey.settings.get('username');
    const password = this.homey.settings.get('password');
    const ip = this.homey.settings.get('ip');

    this._client = new FreeAtHomeApi(ip, username, password);


    this._client?.start();
  }

}

module.exports = MyApp;

export default MyApp;