"use strict";
const { SystemAccessPoint } = require("freeathome-api");
export class FreeAtHomeApi {
    systemAccessPoint: typeof SystemAccessPoint;
    _connected: boolean;
    _functions: any;
    constructor (ip: string, username: string, password: string) {
        this._connected = false
        this._functions = [];
        const config = {
            hostname: ip,
            username: username,
            password: password,
        };

        this.systemAccessPoint = new SystemAccessPoint(
            config,
            this,      // instance to report broadcastMessages
        );
    }

    addEventListener (func: any) {
        this._functions.push(func);
    }
    removeEventListener (func: any) {
        this._functions = this._functions.filter((f:any) => f !== func);
    }
    async start () {
        console.log("Starting free@home API");

        try {
            await this.systemAccessPoint.connect();
            this._connected = true
        } catch (e) {
            console.error("Could not connect to SysAp: ", e);
            this._connected = false
        }
    }

    async stop () {
        if (this._connected) {
            console.log("Stopping free@home API")
            await this.systemAccessPoint.disconnect()
            this._connected = false
        }
    }

    /**
     * @param message
     */
    broadcastMessage (message: any) {
        // Do nothing when receiving a message from SysAccessPoint
        this._functions.forEach((f:any) => f(message));
    }

    async getAllDevices () {
        if (this._connected) {
            console.log("Getting device info");
            try {
                const response = await this.systemAccessPoint.getDeviceData();
                console.log(response);
                return response;
            } catch (e) {
                console.error("Error getting device data", e);
                return {};
            }
        }
    }

    /**
     *
     * @param deviceId
     * @param channel
     * @param dataPoint
     * @param value
     * @returns {Promise<void>}
     */
    async set (deviceId: any, channel: any, dataPoint: any, value: any) {
        console.log(
            `Setting (device, channel, datapoint, value): ${deviceId}, ${channel}, ${dataPoint}, ${value}`
        );
        if (this._connected) {
            return await this.systemAccessPoint.setDatapoint(
                deviceId.toString(),
                channel.toString(),
                dataPoint.toString(),
                value.toString()
            );
        }
    }
};