import { Client, Device } from './lib';
import Homey from 'homey';

class MyApp extends Homey.App {
  private client?: Client;
  private settingsQueue: Promise<void> = Promise.resolve();
  private readonly settingsChanged = (key: string) => {
    if (!['ip', 'username', 'password'].includes(key)) { return; }
    this.settingsQueue = this.settingsQueue.then(async () => {
      const settings = this.credentials();
      const client = this.getClient();
      if (client.host === settings.ip && client.username === settings.username && client.password === settings.password) { return; }
      await client.updateLogin(settings.ip, settings.username, settings.password);
    }).catch(error => this.error('Failed to reconnect to free@home:', error instanceof Error ? error.message : String(error)));
  };
  private credentials() {
    const read = (key: string) => { const value: unknown = this.homey.settings.get(key); return typeof value === 'string' ? value : ''; };
    return { ip: read('ip').trim(), username: read('username').trim(), password: read('password') };
  }
  async onInit(): Promise<void> {
    const settings = this.credentials();
    this.client = new Client(settings.ip, settings.username, settings.password);
    this.client.on('diagnostic', message => this.error(message));
    this.client.on('devices', () => this.log(this.getClient().discoverySummary));
    this.homey.settings.on('set', this.settingsChanged);
    try { await this.client.start(); }
    catch (error) { this.error('Failed to connect to free@home:', error instanceof Error ? error.message : String(error)); }
  }
  getClient(): Client {
    if (!this.client) { throw new Error('The free@home app is still starting. Try again shortly.'); }
    return this.client;
  }
  async listDevices(matches: (device: Device) => boolean) {
    const client = this.getClient();
    await this.settingsQueue;
    await client.refresh();
    const devices = client.devices.filter(matches);
    if (!devices.length) { throw new Error(`No matching devices found. ${client.discoverySummary} Check local API permissions and the selected device type.`); }
    return devices.map(device => ({ name: 'F@H ' + device.name, data: { serialNumber: device.id, channel: device.channel } }));
  }
  async onUninit(): Promise<void> {
    this.homey.settings.removeListener('set', this.settingsChanged);
    this.client?.stopListen();
    await this.settingsQueue;
    this.client?.stopListen();
  }
}
module.exports = MyApp;
export default MyApp;
