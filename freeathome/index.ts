"use strict";

import { Device, DeviceManager, SubDevice } from "@dominicvonk/freeathome-devices";
import { ConnectionEvent } from "@dominicvonk/freeathome-devices/dist/Connection";
import { BridgeDevice } from "@dominicvonk/freeathome-devices/dist/hardware/BridgeDevice";



export class FreeAtHomeApi {
    deviceManager: DeviceManager;
    _config: {
        hostname: string,
        username: string,
        password: string,
    };
    constructor (ip: string, username: string, password: string) {
        this._config = {
            hostname: ip,
            username: username,
            password: password,
        };
        this.deviceManager = new DeviceManager(
            this._config,
            console,      // instance to report broadcastMessages
            true,
            60 * 1000
        );
    }

    async ready () {
        return await new Promise(r => this.deviceManager.on(ConnectionEvent.DEVICES, () => r(true)));
    }

    getAllDevices (): SubDevice[] | null {
        console.log("Getting device info");
        try {
            const response: SubDevice[] = this.deviceManager.getDevices().flatMap((device: Device) => {
                if (device instanceof BridgeDevice) {
                    let devices: SubDevice[] = ((device as BridgeDevice).getSubDevices() as SubDevice[]);
                    let Xdevices = devices.map((subDevice: SubDevice) => {
                        if (subDevice) {
                            console.log('SubDevice', subDevice.channel, subDevice.serialNumber);
                            return this.deviceManager.getDevice(subDevice.serialNumber, subDevice.channel)
                        }
                        return null;
                    });
                    devices = (Xdevices.filter(e => e !== null) as SubDevice[]);
                    return devices;
                }
                return [];
            });
            return response;
        } catch (e) {
            console.error("Error getting device data", e);
        }
        return null;
    }

    getDevice (serialNumber: string, channel: string): SubDevice | null {
        try {
            const response = this.deviceManager.getDevice(serialNumber, channel);
            return response;
        } catch (e) {
            console.error("Error getting device data", e);
        }
        return null;
    }
};