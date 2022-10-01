import React, { useState } from "react";
import { Link } from "react-router-dom";

import styles from "./Home.module.css";
import LinkButton from "components/LinkButton";

const Home = props => {
    return (
        <div className={styles.parent}>
            <p className={styles.textCentered}>Welcome to ota-atem</p>
            <LinkButton to="/tally">Tally</LinkButton>
            <LinkButton to="/lowerthirds">Lowerthirds</LinkButton>
            <LinkButton to="/devices">Devices</LinkButton>
        </div>
    );
};

export default Home;
