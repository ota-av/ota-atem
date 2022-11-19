import { IncomingMessage } from "http";
import WebSocket from "ws";
import { ChannelStateMessage, MediaStateMessage, Message, SetConfigMessage } from "../types/comm";

/**
 * Handles WSS and sending WS events to listeners
 */
class MyWebSocketServer {
    private wss: WebSocket.Server;
    private channelState: ChannelStateMessage;
    private mediaState: MediaStateMessage;
    private connectionHandlers: { (ws: WebSocket, req: IncomingMessage): void }[];
    constructor() {
        this.wss = new WebSocket.Server({
            port: 7634,
        });
        this.connectionHandlers = [];
        this.wss.on("connection", (ws: WebSocket, req) => {
            // send current state
            ws.send(JSON.stringify(this.channelState));
            ws.send(JSON.stringify(this.mediaState));

            // call newconnectionhandlers
            this.connectionHandlers?.forEach(handler => handler(ws, req));
        });
    }
    public broadcastWsMessage(message: Message) {
        // send message to all clients
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    public setChannelState(message: ChannelStateMessage) {
        this.channelState = message;
    }

    public setMediaState(message: MediaStateMessage) {
        this.mediaState = message;
    }

    public updateChannelState(newChannelState: ChannelStateMessage) {}

    public addConnectionHandler(handler: { (ws: WebSocket, req: IncomingMessage): void }) {
        this.connectionHandlers.push(handler);
    }
}

export { MyWebSocketServer };
