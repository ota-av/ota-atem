import React, { useEffect, useState, useCallback } from "react";

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
            let socket = null;
            try {
                console.log("Creating new socket");
                const uparams = new URLSearchParams(params).toString();
                socket = new WebSocket(`ws://${serverIP}:7634/${uparams.length > 0 ? "?" + uparams : ""}`);
                console.log("Created");
                socket.onmessage = event => {
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
                    console.log("Socket error!", e);
                    // setConnected(false);
                    // setTimeout(initializeSocket, 100);
                };
                socket.onclose = () => {
                    console.log("Socket closed!");
                    setConnected(false);
                    setTimeout(initializeSocket, 200);
                };
                socket.onopen = () => {
                    console.log("Socket open!");
                    setConnected(true);
                };
            } catch (err) {
                console.log("Probably refused connection", err);
                setTimeout(initializeSocket, 200);
            }

            return () => {
                if (socket) {
                    console.log('closing socket');
                    socket.close();
                }
            }
        };

        return initializeSocket();
    }, [serverIP, validator, params, requestHandler]);

    return { connected, state, error };
};

export const useQuery = () => {
    return new URLSearchParams(useLocation().search);
};

const requestValidator = json => json.type === "config" || json.type === "tally";

const TallyLanding = props => {
    const params = useQuery();

    const [serverAddress, setServerAddress] = useState(params.get("serverAddress") || window.location.hostname);
    const [camera, setCamera] = useState(parseInt(params.get("camera")) || 1);
    const [deviceId, setDeviceId] = useState(params.get("deviceId") || (Math.random() + 1).toString(36).substring(7));
    const [settingsOpen, setSettingsOpen] = useState(params.get("settingsOpen") !== "false");
    const [mediaOpen, setMediaOpen] = useState(params.get("mediaOpen") === "true");
    const [isRemote, setIsRemote] = useState(params.get("isRemote") === "true");

    const [commParams, setCommParams] = useState({});

    useEffect(()=>{
        setCommParams({ ...(isRemote && { deviceId }) });
    }, [isRemote, deviceId])

    const [state, setState] = useState({});

    const requestHandler = useCallback(json => {
        if (json.type === "tally") {
            setState(json);
        } else if (json.type === "config" && isRemote) {
            if (json.action === "set") {
                setCamera(json.config.deviceChannel);
            }
        }
    }, [isRemote]);

   

    const { connected, _, error } = useCommunication(
        serverAddress,
        requestValidator,
        commParams,
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
