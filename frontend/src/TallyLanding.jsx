import React, { useEffect, useState } from "react";

import styles from "./App.module.css";
import Tally from "./Tally.jsx";
import Media from "./Media.jsx";

import { useHistory, useLocation } from "react-router-dom";
import Welcome from "./Welcome.jsx";

export const useCommunication = (serverIP, validator, params, requestHandler) => {
    const [state, setState] = useState({});
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log(serverIP);

        const initializeSocket = () => {
            try {
                console.log("Creating new socket");
                const uparams = new URLSearchParams(params).toString();
                const socket = new WebSocket(`ws://${serverIP}:7634/${uparams.length > 0 ? "?" + uparams : ""}`);
                console.log("Created");
                socket.onmessage = event => {
                    console.log(event.data);
                    let json;
                    try {
                        json = JSON.parse(event.data);

                        if (validator(json)) {
                            if (requestHandler) {
                                requestHandler(json);
                            } else {
                                setState(json);
                            }
                        }
                        // if (json.type === "tally") {
                        //     setState(json);
                        // } else if (json.type === "media") {
                        //     setMediaState(json);
                        // }
                    } catch (err) {
                        console.log("Couldn't parse: ", event.data);
                    }
                };
                socket.onerror = e => {
                    console.log("Socket error!");
                    // setConnected(false);
                    // setTimeout(initializeSocket, 100);
                };
                socket.onclose = () => {
                    console.log("Socket closed!");
                    setConnected(false);
                    setTimeout(initializeSocket, 100);
                };
                socket.onopen = () => {
                    console.log("Socket open!");
                    setConnected(true);
                };
            } catch (err) {
                console.log("Probably refused connection");
                setTimeout(initializeSocket, 100);
            }
        };

        initializeSocket();
    }, [serverIP, validator, requestHandler, params]);

    return { connected, state, error };
};

export const useQuery = () => {
    return new URLSearchParams(useLocation().search);
};

const TallyLanding = props => {
    const params = useQuery();

    const [serverAddress, setServerAddress] = useState(params.get("serverAddress") || window.location.hostname);
    const [camera, setCamera] = useState(parseInt(params.get("camera")) || 1);

    const [deviceId, setDeviceId] = useState(params.get("deviceId") || Math.random().toString(36).slice(2, 7));

    const [settingsOpen, setSettingsOpen] = useState(params.get("settingsOpen") !== "false");

    const [mediaOpen, setMediaOpen] = useState(params.get("mediaOpen") === "true");

    const [isRemote, setIsRemote] = useState(params.get("isRemote") === "true");

    const [state, setState] = useState({});

    const requestHandler = json => {
        if (json.type === "tally") {
            setState(json);
        } else if (json.type === "config" && isRemote) {
            if (json.action === "set") {
                setCamera(json.config.deviceChannel);
            }
        }
    };

    const { connected, _, error } = useCommunication(
        serverAddress,
        json => json.type === "config" || json.type === "tally",
        { ...(isRemote && { deviceId }) },
        requestHandler
    );

    const history = useHistory();
    useEffect(() => {
        history.push(
            `/tally?camera=${camera}&serverAddress=${serverAddress}&settingsOpen=${settingsOpen}&mediaOpen=${mediaOpen}&isRemote=${isRemote}&deviceId=${deviceId}`
        );
    }, [camera, serverAddress, settingsOpen, mediaOpen, history, isRemote, deviceId]);

    useEffect(() => {
        console.log("Connected: ", connected);
    }, [connected]);
    if (settingsOpen) {
        return (
            <Welcome
                initialValues={{ serverAddress, camera }}
                onSubmit={({ serverAddress, camera }) => {
                    setServerAddress(serverAddress);
                    setCamera(parseInt(camera));
                    setSettingsOpen(false);
                }}
            />
        );
    } else {
        return (
            <>
                <div className={styles.parent}>
                    <Tally connected={connected} state={state} index={camera} />
                    <div className={styles.backoverlay}>
                        <button onDoubleClick={() => setSettingsOpen(true)}>settings</button>
                    </div>
                </div>
            </>
        );
    }
};

TallyLanding.propTypes = {};

export default TallyLanding;
