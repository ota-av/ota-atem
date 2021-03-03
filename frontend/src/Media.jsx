import React from "react";
import styles from "./Media.module.css";

const Media = ({ state, serverAddress }) => {
    function next() {
        sendIndex(state.currentIndex + 1);
    }

    function prev() {
        sendIndex(state.currentIndex - 1);
    }

    function sendIndex(index) {
        fetch(`http://${serverAddress}/setMediaIndex`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ index }),
        });
    }

    return (
        <div className={`${styles.parent}`}>
            <div className={styles.child}>
                <p className={styles.index}>{state.currentIndex}</p>
                <p className={styles.title}>{state.currentValues?.title}</p>
                <p className={styles.subtitle}>{state.currentValues?.subtitle}</p>
            </div>
            <div className={styles.child}>
                <button className={styles.button} onClick={next}>
                    Next
                </button>
                <button className={styles.button} onClick={prev}>
                    Prev
                </button>
            </div>
        </div>
    );
};

Media.propTypes = {};

export default Media;
