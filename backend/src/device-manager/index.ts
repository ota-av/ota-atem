import { SetConfigMessage } from "./../types/comm";
import { DeviceConfig } from "../types/comm";
import { IncomingMessage } from "http";
import WebSocket from "ws";

/**
 * DeviceManager hooks to websocketserver, and provides deviceid service frontend. Also manages sending config to client websocket.
 */

class DeviceManager {
    private sockets: Map<string, WebSocket>; // sockets stored by deviceId
    private deviceConfigs: { [key: string]: DeviceConfig } = {}; // configs stored by deviceId
    constructor() {
        this.sockets = new Map<string, WebSocket>();
        this.deviceConfigs = {};
    }
    // newConnectionhandler is passed to WSS in main, handles new ws clients
    public newConnectionHandler = (ws: WebSocket, req: IncomingMessage) => {
        // devid is provided in the url params of incoming websocket tequest
        const params = new URLSearchParams(req.url?.split("?")[1]);
        const devId = params.get("deviceId");
        // some clients, dont use deviceId, dont add them.
        if (devId) {
            this.sockets.set(devId, ws);
        } else {
            return;
        }

        // send the current config or create a new one and send it
        let config = this.deviceConfigs[devId];
        if (config === undefined) config = { deviceChannel: 1 };
        this.setConfig(devId, config);

        ws.on("close", () => {
            // delete from sockets when connetion closes
            this.sockets.delete(devId);
        });
    };

    // Send config set message to client and store config on server
    public setConfig(target: string, config: DeviceConfig) {
        // get socket
        const socket = this.sockets.get(target);
        if (!socket) return false; // fail if no socket existss

        // store config locally
        this.deviceConfigs[target] = config;

        // create message and send
        const message = {
            type: "config",
            action: "set",
            config,
        } as SetConfigMessage;
        socket.send(JSON.stringify(message));
        return true; // success
    }

    public getConfigs() {
        return this.deviceConfigs;
    }
}

export { DeviceManager };
