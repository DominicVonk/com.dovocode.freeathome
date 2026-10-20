import Homey from 'homey';
import type MyApp from '../../app';
import type { Client, Device } from '../Client';

export type CapabilityState = Record<string, boolean | number | string | null>;
/** Owns subscriptions and rebinds paired Homey devices after discovery or credential changes. */
export abstract class HomeyResourceDevice<T extends Device> extends Homey.Device {
  protected abstract matches(device: Device): device is T;
  protected abstract state(device: T): CapabilityState;
  protected abstract registerControls(): void;
  private client?: Client;
  private resource?: T;
  private disposed = false;
  private syncing: Promise<void> = Promise.resolve();
  private readonly changed = () => {
    this.syncing = this.syncing.then(() => this.synchronize()).catch(async error => {
      this.error(error);
      if (!this.disposed) { await this.setUnavailable(error instanceof Error ? error.message : String(error)); }
    }).catch(error => this.error('Unable to update device availability:', error));
  };
  async onInit(): Promise<void> {
    this.client = (this.homey.app as MyApp).getClient();
    this.client.on('status', this.changed);
    this.client.on('devices', this.changed);
    this.registerControls();
    this.changed();
    await this.syncing;
  }
  protected getResource(): T {
    if (this.disposed || !this.client?.connected || !this.resource || this.resource.configuration.unresponsive) {
      throw new Error(this.client?.connectionError || 'This free@home device is unavailable.');
    }
    return this.resource;
  }
  private async synchronize(): Promise<void> {
    if (this.disposed || !this.client) { return; }
    const data: unknown = this.getData();
    const stored = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const resource = this.client.devices.find((device): device is T => this.matches(device) && device.id === stored.serialNumber && device.channel === stored.channel);
    if (this.resource !== resource) {
      this.resource?.removeListener('updated', this.changed);
      this.resource = resource;
      resource?.on('updated', this.changed);
    }
    if (!this.client.connected) { await this.setUnavailable(this.client.connectionError || 'Connecting to free@home…'); return; }
    if (!resource) { await this.setUnavailable('Device not found on the System Access Point. Check its configuration and local API permissions.'); return; }
    if (resource.configuration.unresponsive) { await this.setUnavailable('The System Access Point reports that this device is unreachable.'); return; }
    for (const [capability, value] of Object.entries(this.state(resource))) {
      if (value !== null && this.hasCapability(capability) && this.getCapabilityValue(capability) !== value) {
        await this.setCapabilityValue(capability, value);
      }
    }
    if (!this.disposed) { await this.setAvailable(); }
  }
  async onDeleted(): Promise<void> { this.dispose(); }
  async onUninit(): Promise<void> { this.dispose(); }
  private dispose(): void {
    this.disposed = true;
    this.client?.removeListener('status', this.changed);
    this.client?.removeListener('devices', this.changed);
    this.resource?.removeListener('updated', this.changed);
  }
}
