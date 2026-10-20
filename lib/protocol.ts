export const SYSTEM_ID = '00000000-0000-0000-0000-000000000000';
export type Datapoints = Record<string, string>;
export interface Channel {
  systemId: string;
  id: string;
  channel: string;
  name: string;
  deviceType: string;
  datapoints: Datapoints;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  unresponsive: boolean;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** Function IDs are hex strings; JSON numeric IDs are decimal numbers. */
export function normaliseFunctionId(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 65535 ? value.toString(16).toUpperCase().padStart(4, '0') : undefined;
  }
  if (typeof value !== 'string' || !/^(?:0x)?[\da-f]{1,4}$/i.test(value.trim())) { return undefined; }
  return parseInt(value.trim().replace(/^0x/i, ''), 16).toString(16).toUpperCase().padStart(4, '0');
}
function pairing(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) { return value; }
  // The local API reports pairing IDs as decimal JSON numbers. Accept explicitly hex strings too.
  if (typeof value === 'string' && /^(?:0x[\da-f]+|\d+)$/i.test(value)) { return Number(value); }
  return undefined;
}
export function scalar(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof value === 'boolean' ? (value ? '1' : '0') :
    typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}
export function parseConfiguration(value: unknown): Channel[] {
  if (!isRecord(value)) { throw new Error('The local API returned an invalid configuration.'); }
  const systems = isRecord(value.devices) ? [[SYSTEM_ID, value] as const] : Object.entries(value).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]) && isRecord(entry[1].devices));
  if (!systems.length) { throw new Error('The local API response has no devices. Check the user’s local API permissions.'); }
  const channels: Channel[] = [];
  for (const [systemId, system] of systems) {
    if (!isRecord(system.devices)) { continue; }
    for (const [id, device] of Object.entries(system.devices)) {
      if (!isRecord(device) || !isRecord(device.channels)) { continue; }
      for (const [channel, data] of Object.entries(device.channels)) {
        if (!isRecord(data)) { continue; }
        const deviceType = normaliseFunctionId(data.functionID);
        if (!deviceType) {
          if (data.functionID != null) { throw new Error(`Invalid function ID for channel ${channel}.`); }
          continue;
        }
        const datapoints: Datapoints = {};
        const inputs: Record<string, number> = {};
        const outputs: Record<string, number> = {};
        for (const [direction, mapping] of [['inputs', inputs], ['outputs', outputs]] as const) {
          const points = data[direction];
          if (points == null) { continue; }
          if (!isRecord(points)) { throw new Error(`Invalid ${direction} for channel ${channel}.`); }
          for (const [key, point] of Object.entries(points)) {
            if (!isRecord(point)) { continue; }
            const text = scalar(point.value);
            const pairingId = pairing(point.pairingID);
            if (text !== undefined) { datapoints[key] = text; }
            if (pairingId !== undefined) { mapping[key] = pairingId; }
          }
        }
        channels.push({ systemId, id, channel, name: typeof data.displayName === 'string' ? data.displayName : typeof device.displayName === 'string' ? device.displayName : `${id} ${channel}`,
          deviceType, datapoints, inputs, outputs, unresponsive: device.unresponsive === true });
      }
    }
  }
  return channels;
}
