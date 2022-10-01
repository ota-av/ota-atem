import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import TallyLanding from "./TallyLanding.jsx";
import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import LowerThirds from "./LowerThirds";
import Home from "./Home";
import Devices from "Devices";

export const IS_DEVELOPMENT_ENVIRONMENT = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
export const API_ENDPOINT = IS_DEVELOPMENT_ENVIRONMENT ? "http://localhost:4000" : "";

ReactDOM.render(
    <React.StrictMode>
        <BrowserRouter>
            <Switch>
                <Route exact path={"/tally"} render={() => <TallyLanding />} />
                <Route exact path={"/lowerthirds"} render={() => <LowerThirds />} />
                <Route exact path={"/devices"} render={() => <Devices />} />
                <Route path={"/"} render={() => <Home />} />
            </Switch>
        </BrowserRouter>
    </React.StrictMode>,
    document.getElementById("root")
);
