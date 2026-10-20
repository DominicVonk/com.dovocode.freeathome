import { EventEmitter } from 'events';
import type { Client } from './Client';
import { Channel } from './protocol';

export class ResourceDevice extends EventEmitter {
  constructor(public client: Client, public configuration: Channel) { super(); }
  get id() { return this.configuration.id; }
  get channel() { return this.configuration.channel; }
  get name() { return this.configuration.name; }
  get deviceType() { return this.configuration.deviceType; }
  get datapoints() { return this.configuration.datapoints; }
  applyConfiguration(configuration: Channel): void { this.configuration = configuration; this.emit('updated'); }
  handleUpdate(datapoint: string, value: string): void {
    if (this.datapoints[datapoint] !== value) { this.datapoints[datapoint] = value; this.emit('updated'); }
  }
  protected point(direction: 'inputs' | 'outputs', pairingIds: number[], fallback?: string): string | undefined {
    const mapping = this.configuration[direction];
    for (const pairingId of pairingIds) {
      const key = Object.keys(mapping).find(key => mapping[key] === pairingId);
      if (key) { return key; }
    }
    // Old configuration snapshots may omit pairing IDs. Never guess when metadata is available.
    return !Object.keys(mapping).length && fallback && fallback in this.datapoints ? fallback : undefined;
  }
  protected text(pairingIds: number[], fallback?: string): string | undefined {
    const key = this.point('outputs', pairingIds, fallback);
    return key ? this.datapoints[key] : undefined;
  }
  protected binary(pairingIds: number[], fallback?: string): boolean | null {
    const text = this.text(pairingIds, fallback);
    return text === '1' ? true : text === '0' ? false : null;
  }
  protected number(pairingIds: number[], fallback?: string): number | null {
    const raw = this.text(pairingIds, fallback);
    if (raw === undefined || !raw.trim()) { return null; }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  protected async write(pairingIds: number[], value: string, fallback?: string): Promise<void> {
    const key = this.point('inputs', pairingIds, fallback);
    if (!key) { throw new Error(`This channel does not expose the required control (pairing ${pairingIds.map(id => '0x' + id.toString(16)).join('/')}).`); }
    await this.client.setValue(this, key, value);
  }
}
export function bounded(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) { throw new Error('The requested value must be a finite number.'); }
  return Math.max(min, Math.min(max, value));
}
