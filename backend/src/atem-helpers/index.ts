import { Atem, AtemState } from "atem-connection";
import { AtemEvent, EventType, MessageType } from "../types/enums";
import { AtemEventHandlers, Channel, ChannelStateMessage, MediaStateMessage } from "../types/comm";
import { InputChannel } from "atem-connection/dist/state/input";
import equal from "deep-equal";
import config from "../../config.json";
import { LowerThirdsManager } from "../lowerthirds";
import { MyWebSocketServer } from "../wss";
import { logger } from "handlebars";

/**
 * Random helpers for atem
 */

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// get channel state
function getChannelState(state: AtemState) {
    const mixEffect = state.video.mixEffects[0];
    const inputChannels = state.inputs;
    const programChannel = formatAtemInput(inputChannels[mixEffect.programInput]);
    const previewChannel = formatAtemInput(inputChannels[mixEffect.previewInput]);

    return {
        type: "tally",
        event: EventType.ChannelStateChange,
        program: programChannel,
        preview: previewChannel,
        inTransition: mixEffect.transitionPosition.inTransition,
    } as ChannelStateMessage;
}

// formats atem InputChannel as Channel
function formatAtemInput(atemChannel: InputChannel) {
    return {
        index: atemChannel.inputId,
        longName: atemChannel.longName,
        shortName: atemChannel.shortName,
    } as Channel;
}

// automatically runs lowerthirds, TODO: does this work??
async function runLowerThirds(atemConsole: Atem) {
    console.log("Start macro");
    await atemConsole.setTransitionStyle({
        nextSelection: 2,
    });
    await atemConsole.autoTransition();
    await timeout(3000);
    await atemConsole.autoTransition();
    await atemConsole.setTransitionStyle({
        nextSelection: 1,
    });
    console.log("End macro");
}

const getMixEffectHandlers = (webSocketServer: MyWebSocketServer, lowerThirdsManager: LowerThirdsManager): AtemEventHandlers => {
    let lastChannelState: ChannelStateMessage;
    let lastMacroState: AtemState["macro"]["macroPlayer"];
    let isMacroRunning: boolean = false;

    // gets initial state from atem
    const onAtemConnected = (atemConsole: Atem) => {
        console.log("Atem connected");
        lastChannelState = getChannelState(atemConsole.state);
        lastMacroState = atemConsole.state.macro.macroPlayer;
        webSocketServer.broadcastWsMessage(lastChannelState);
    };

    // handle keypresses
    const handleMixEffectKeyPresses = (atemConsole: Atem, eventType: AtemEvent, state: AtemState, paths: string[]) => {
        // get channelstate changes
        paths.forEach(async path => {
            if (path.startsWith("video.ME.0")) {
                // store new channelstate
                const currentChannelState = getChannelState(state);

                if (!equal(lastChannelState, currentChannelState)) { // dont send unnecessary updates
                    if (
                        currentChannelState.preview.index !== config.lowerThirds.previewKeyIndex &&
                        currentChannelState.preview.index !== config.lowerThirds.nextKeyIndex
                    ) // dont send updates for macro keys
                    {
                        // send updates to ws clients
                        webSocketServer.broadcastWsMessage(currentChannelState);
                        webSocketServer.setChannelState(currentChannelState);
                        lastChannelState = currentChannelState; // update last channelstate
                    }
                }
            }
        });
        // run macros
        paths.forEach(async path => {
            if (path.startsWith("video.ME.0")) {
                const currentChannelState = getChannelState(state);
                // again, dont run twice
                if (!equal(lastChannelState, currentChannelState)) {
                    // run macro
                    if (currentChannelState.preview.index === config.lowerThirds.previewKeyIndex) {
                        await atemConsole.changePreviewInput(lastChannelState.preview.index); // change back to old preview
                        await atemConsole.macroRun(0);

                        // if (!isMacroRunning) {
                        //     isMacroRunning = true;
                        //     runLowerThirds(atemConsole).then(() => {
                        //         isMacroRunning = false;
                        //     });
                        // }
                    }
                    // set next lowerthirds
                    if (currentChannelState.preview.index === config.lowerThirds.nextKeyIndex) {
                        await atemConsole.changePreviewInput(lastChannelState.preview.index); // change back to old preview
                        lowerThirdsManager.nextLowerThirds();
                    }
                }
            }
        });
    };

    return {
        connected: [onAtemConnected],
        stateChanged: [handleMixEffectKeyPresses],
        info: [],
        error: [],
    } as AtemEventHandlers;
};

export { getChannelState, getMixEffectHandlers };
