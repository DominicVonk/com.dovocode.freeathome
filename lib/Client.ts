import { EventEmitter } from 'events';
import ws from 'ws';
import fetch from 'node-fetch';
import { Switch } from './Switch';
import { Dimmer } from './Dimmer';
import { Thermostat } from './Thermostat';
import { SceneSensor } from './SceneSensor';
import { Shutter } from './Shutter';
import { Blind } from './Blind';
import { MovementDetector } from './MovementDetector';
import { ContactSensor } from './ContactSensor';
import { ResourceDevice } from './ResourceDevice';
import { isRecord, parseConfiguration, scalar } from './protocol';

export type Device = Switch | Dimmer | Thermostat | SceneSensor | Shutter | Blind | MovementDetector | ContactSensor;
const models: Record<string, new (client: Client, configuration: import('./protocol').Channel) => Device> = {
  '0006': SceneSensor, '0007': Switch, '0012': Dimmer, '0023': Thermostat,
  '0009': Shutter, '0061': Blind, '0011': MovementDetector, '000F': ContactSensor,
};
export class Client extends EventEmitter {
  devices: Device[] = [];
  connected = false;
  connectionError = 'Configure the System Access Point and local API credentials in app settings.';
  discoverySummary = 'No configuration has been loaded yet.';
  private connection?: ws;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private reconnectDelay = 1000;
  private active = false;
  private generation = 0;
  private refreshing?: Promise<void>;
  private connecting?: Promise<void>;
  private requests = new Set<AbortController>();
  private bufferedUpdates?: Array<{ systemId: string; parts: string[]; value: string }>;
  constructor(public host: string, public username: string, public password: string) { super(); }

  private baseUrl(): URL {
    let url: URL;
    try { url = new URL(this.host.includes('://') ? this.host : `http://${this.host}`); }
    catch { throw new Error('Enter a valid System Access Point IP address or hostname.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Use a System Access Point host or HTTP(S) address without a path or embedded credentials.');
    }
    return url;
  }
  private status(connected: boolean, message = ''): void {
    this.connected = connected;
    this.connectionError = message;
    this.emit('status');
  }
  private async request(path: string, method = 'GET', body?: string): Promise<unknown> {
    const controller = new AbortController();
    this.requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(new URL(path, this.baseUrl()).toString(), {
        method, body, signal: controller.signal,
        headers: { Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`, 'utf8').toString('base64')}`,
          ...(body === undefined ? {} : { 'Content-Type': 'text/plain' }) },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Local API access denied. Check the username/password and enable local API access for that user on the System Access Point.');
        }
        throw new Error(`The System Access Point returned HTTP ${response.status}.`);
      }
      const text = await response.text();
      if (!text.trim()) {
        if (method === 'GET') { throw new Error('The local API returned an empty configuration.'); }
        return undefined;
      }
      try { return JSON.parse(text); }
      catch { throw new Error('The local API returned invalid JSON.'); }
    } catch (error) {
      if (controller.signal.aborted) { throw new Error('The System Access Point request timed out or was cancelled.'); }
      if (error instanceof Error && error.name === 'FetchError') {
        throw new Error('Cannot reach the System Access Point. Check its address and network connection.');
      }
      throw error;
    } finally { clearTimeout(timeout); this.requests.delete(controller); }
  }
  async refresh(): Promise<void> {
    if (!this.username || !this.password || !this.host) { throw new Error('Configure the System Access Point and local API credentials in app settings.'); }
    if (this.refreshing) { return this.refreshing; }
    const generation = this.generation;
    const updates: Array<{ systemId: string; parts: string[]; value: string }> = [];
    this.bufferedUpdates = updates;
    const pending = (async () => {
      const configuration = parseConfiguration(await this.request('/fhapi/v1/api/rest/configuration'));
      if (generation !== this.generation) { throw new Error('Connection settings changed during discovery.'); }
      const unsupported = new Set<string>();
      const devices: Device[] = [];
      for (const channel of configuration) {
        const Model = models[channel.deviceType];
        if (!Model) { unsupported.add(channel.deviceType); continue; }
        const previous = this.devices.find(device => device.configuration.systemId === channel.systemId && device.id === channel.id && device.channel === channel.channel && device.constructor === Model);
        if (previous) { previous.applyConfiguration(channel); devices.push(previous); }
        else { devices.push(new Model(this, channel)); }
      }
      this.devices = devices;
      for (const update of updates) {
        this.devices.find(device => device.configuration.systemId === update.systemId && device.id === update.parts[0] && device.channel === update.parts[1])?.handleUpdate(update.parts[2], update.value);
      }
      this.discoverySummary = `Found ${devices.length} supported channels out of ${configuration.length}.` +
        (unsupported.size ? ` Unsupported function IDs: ${Array.from(unsupported).sort().join(', ')}.` : '');
      this.emit('devices');
    })();
    this.refreshing = pending;
    try { await pending; } finally {
      if (this.refreshing === pending) { this.refreshing = undefined; }
      if (this.bufferedUpdates === updates) { this.bufferedUpdates = undefined; }
    }
  }
  async start(): Promise<void> {
    if (!this.username || !this.password || !this.host) {
      this.status(false, 'Configure the System Access Point and local API credentials in app settings.');
      return;
    }
    this.active = true;
    await this.connect();
  }
  async updateLogin(host: string, username: string, password: string): Promise<void> {
    this.stopListen();
    this.host = host; this.username = username; this.password = password;
    this.devices = [];
    this.discoverySummary = 'No configuration has been loaded yet.';
    this.emit('devices');
    await this.start();
  }
  private scheduleReconnect(): void {
    if (!this.active || this.reconnectTimer) { return; }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(error => this.emit('diagnostic', error instanceof Error ? error.message : String(error)));
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
  private async connect(): Promise<void> {
    if (!this.active || this.connection) { return; }
    if (this.connecting) { return this.connecting; }
    const generation = this.generation;
    const pending = (async () => {
      try {
        await this.refresh();
        if (!this.active || generation !== this.generation) { return; }
        const url = new URL('/fhapi/v1/api/ws', this.baseUrl());
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new ws(url.toString(), { handshakeTimeout: 10000,
          headers: { Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`, 'utf8').toString('base64')}` } });
        this.connection = socket;
        const current = () => this.active && this.generation === generation && this.connection === socket;
        let alive = true;
        socket.on('pong', () => { alive = true; });
        socket.on('open', () => {
          if (!current()) { return; }
          // Reload after opening so changes during the reconnect gap are not missed.
          this.refresh().then(() => {
            if (!current()) { return; }
            this.reconnectDelay = 1000;
            this.status(true);
          }).catch(error => {
            if (current()) { this.status(false, error instanceof Error ? error.message : String(error)); socket.terminate(); }
          });
          this.heartbeat = setInterval(() => {
            if (!current()) { return; }
            if (!alive) { this.status(false, 'The System Access Point stopped responding. Reconnecting…'); socket.terminate(); return; }
            alive = false; socket.ping();
          }, 20000);
        });
        socket.on('message', (data: ws.RawData) => {
          if (!current()) { return; }
          try {
            const text = Array.isArray(data) ? Buffer.concat(data).toString('utf8') : Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.from(data).toString('utf8');
            const message: unknown = JSON.parse(text);
            if (!isRecord(message)) { throw new Error('Invalid WebSocket message.'); }
            for (const [systemId, system] of Object.entries(message)) {
              if (!isRecord(system) || !isRecord(system.datapoints)) { continue; }
              for (const [path, raw] of Object.entries(system.datapoints)) {
                const parts = path.split('/');
                const value = scalar(raw);
                if (parts.length !== 3 || value === undefined) { continue; }
                this.bufferedUpdates?.push({ systemId, parts, value });
                const device = this.devices.find(device => device.configuration.systemId === systemId && device.id === parts[0] && device.channel === parts[1]);
                device?.handleUpdate(parts[2], value);
              }
            }
          } catch { this.emit('diagnostic', 'Ignored an invalid local API WebSocket message.'); }
        });
        socket.on('error', () => { if (current()) { this.status(false, 'The connection to the System Access Point failed. Reconnecting…'); } });
        socket.on('close', () => {
          if (!current()) { return; }
          if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = undefined; }
          this.connection = undefined;
          this.status(false, this.connectionError || 'Connection lost. Reconnecting to the System Access Point…');
          this.scheduleReconnect();
        });
      } catch (error) {
        if (this.active && generation === this.generation) {
          this.status(false, error instanceof Error ? error.message : String(error));
          this.scheduleReconnect();
        }
        throw error;
      }
    })();
    this.connecting = pending;
    try { await pending; } finally { if (this.connecting === pending) { this.connecting = undefined; } }
  }
  stopListen(): void {
    this.active = false; this.generation++;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; }
    if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = undefined; }
    const socket = this.connection; this.connection = undefined;
    socket?.terminate();
    for (const controller of this.requests) { controller.abort(); }
    this.refreshing = undefined; this.bufferedUpdates = undefined; this.connecting = undefined; this.reconnectDelay = 1000;
    this.status(false, 'The free@home connection is stopped.');
  }
  async setValue(device: ResourceDevice, datapoint: string, value: string): Promise<void> {
    if (!this.connected || !this.devices.some(candidate => candidate === device)) { throw new Error(this.connectionError || 'This device is no longer available.'); }
    const configuration = device.configuration;
    const path = [configuration.systemId, `${configuration.id}.${configuration.channel}.${datapoint}`].map(encodeURIComponent).join('/');
    const result = await this.request(`/fhapi/v1/api/rest/datapoint/${path}`, 'PUT', value);
    if (isRecord(result) && (result.error || result.success === false)) { throw new Error('The System Access Point rejected the command.'); }
  }
}
