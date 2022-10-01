import { SubscriptionAction, MessageType, EventType, AtemEvent, ControlActions } from "enums";

export interface Message {
    type: string;
    data?: any;
}

export interface Channel {
    index: number;
    shortName: string;
    longName: string;
}

export interface EventMessage extends Message {
    event: EventType;
}

export interface ChannelStateMessage extends Message {
    type: "tally";
    program: Channel;
    preview: Channel;
    inTransition: boolean;
}

export interface MediaStateMessage extends Message {
    type: "media";
    currentIndex: number;
    currentValues: object;
}

export interface DeviceConfig {
    deviceChannel: number;
}

export interface SetConfigMessage extends Message {
    type: "config";
    action: "set";
    device: string;
    config: DeviceConfig;
}

export interface GetConfigMessage extends Message {
    type: "config";
    action: "get";
    device: string;
    config: DeviceConfig;
}

export type AtemEventHandlers = { [key in keyof typeof AtemEvent]: Function[] };
