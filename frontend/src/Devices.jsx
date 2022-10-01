import React, { useEffect, useState } from "react";
import { useQuery } from "TallyLanding";
import styles from "./Devices.module.css";

import { IS_DEVELOPMENT_ENVIRONMENT, API_ENDPOINT } from "./index";

const setDeviceConfig = (deviceId, config) => {
    fetch(`${API_ENDPOINT}/setDeviceConfig`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceId, config }),
    })
        .then(res => {
            if (res.ok) {
                console.log("ok");
            }
        })
        .catch(err => {
            console.warn(err);
        });
};

const getDevices = () => {
    try {
        return fetch(`${API_ENDPOINT}/devices`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else {
                    return false;
                }
            })
            .catch(err => {
                console.log(err);
                return false;
            });
    } catch {
        return new Promise(resolve => resolve(false));
    }
};

const Devices = () => {
    const [devices, setDevices] = useState({});

    useEffect(() => {
        async function getAndSetDevices() {
            const newDevices = await getDevices();
            console.log(newDevices);
            setDevices(newDevices);
        }

        getAndSetDevices();
        const interval = setInterval(getAndSetDevices, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateDeviceChannel = (deviceId, newChannel) => {
        setDevices(devices => {
            return { ...devices, [deviceId]: { deviceChannel: newChannel } };
        });
        setDeviceConfig(deviceId, { deviceChannel: newChannel });
    };

    return (
        <div className={`${styles.parent}`}>
            <p>Configure devices that support remote configuration</p>
            <p className={styles.text}>
                <strong>Device id:</strong>
            </p>
            {Object.keys(devices).map(deviceId => {
                const device = devices[deviceId];
                return (
                    <div key={deviceId}>
                        <p className={styles.text}>
                            {deviceId}: Camera:{" "}
                            <input
                                type="number"
                                value={device.deviceChannel}
                                onChange={ev => updateDeviceChannel(deviceId, parseInt(ev.target.value))}></input>
                        </p>
                    </div>
                );
            })}
            {Object.keys(devices).length === 0 && <p className={styles.text}>No supported devices connected...</p>}
        </div>
    );
};

export default Devices;
