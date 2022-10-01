import { SetConfigMessage } from "./../types/comm";
import { DeviceConfig } from "../types/comm";
import { IncomingMessage } from "http";
import WebSocket from "ws";

class DeviceManager {
    private sockets: Map<string, WebSocket>;
    private deviceConfigs: { [key: string]: DeviceConfig } = {};
    constructor() {
        this.sockets = new Map<string, WebSocket>();
        this.deviceConfigs = {};
    }
    public newConnectionHandler = (ws: WebSocket, req: IncomingMessage) => {
        const params = new URLSearchParams(req.url?.split("?")[1]);
        const devId = params.get("deviceId");
        if (devId) {
            this.sockets.set(devId, ws);
        } else {
            return;
        }

        let config = this.deviceConfigs[devId];
        if (config === undefined) config = { deviceChannel: 1 };
        this.setConfig(devId, config);

        ws.on("close", () => {
            this.sockets.delete(devId);
            if (this.deviceConfigs[devId]) delete this.deviceConfigs[devId];
        });
    };

    public setConfig(target: string, config: DeviceConfig) {
        const socket = this.sockets.get(target);
        if (!socket) return false;
        this.deviceConfigs[target] = config;
        const message = {
            type: "config",
            action: "set",
            config,
        } as SetConfigMessage;
        socket.send(JSON.stringify(message));
        return true;
    }

    public getConfigs() {
        return this.deviceConfigs;
    }
}

export { DeviceManager };
