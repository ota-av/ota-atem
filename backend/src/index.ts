import { MediaControlRequest } from "mediaControlRequest";
import { Atem, AtemState } from "atem-connection";
import { validateMediaControlRequest, validateMediaPreparationRequest } from "./validators";
import config from "../config.json";
import lowerThirdsTexts from "../lowerthirds.json";
import express from "express";
import { getLowerThirdsHandlers, LowerThirdsManager } from "./lowerthirds";
import { getMixEffectHandlers } from "./atem-helpers";
import { AtemEventDispatcher } from "./atem-eventdispatcher";
import { MyWebSocketServer } from "./wss";
import { MediaPreparationRequest } from "mediaPreparationRequest";
import { LowerThirdsOption } from "lowerThirdsOption.ts";
import bodyParser from "body-parser";
import { AtemEvent } from "enums";

import cors from "cors";
import path from "path";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(cors());

const webSocketServer: MyWebSocketServer = new MyWebSocketServer();

const atemConsole = new Atem();
const atemEventDispatcher: AtemEventDispatcher = new AtemEventDispatcher(atemConsole, {
    connected: [],
    error: [],
    info: [],
    stateChanged: [],
});

const lowerThirdsManager: LowerThirdsManager = new LowerThirdsManager(lowerThirdsTexts, atemConsole);

atemEventDispatcher.addHandlers(getMixEffectHandlers(webSocketServer, lowerThirdsManager));
atemEventDispatcher.addHandlers(getLowerThirdsHandlers(webSocketServer, lowerThirdsManager));

atemConsole.connect(config.atem.ip);

app.post("/controlMedia", async (req, res) => {
    if (validateMediaControlRequest(req.body)) {
        const mediaControlRequest: MediaControlRequest = req.body;
        const { action } = mediaControlRequest;
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

app.post("/prepareLowerThirds", async (req, res) => {
    console.log("request");
    if (validateMediaPreparationRequest(req.body)) {
        res.sendStatus(200);
        const mediaPreparationRequest: LowerThirdsOption[] = req.body.lowerThirdsList;
        console.log("media", mediaPreparationRequest);
        lowerThirdsManager.setLowerThirds(mediaPreparationRequest);
    } else {
        res.sendStatus(400);
    }
});

app.get("/getLowerThirds", async (req, res) => {
    res.status(200).json(lowerThirdsManager.lowerThirdsData);
});

app.get("/getLowerThirdsIndex", async (req, res) => {
    res.status(200).json(lowerThirdsManager.getLowerThirdsIndex());
});

app.post("/setMediaIndex", async (req, res) => {
    // en jaksa validoida tätä...
    lowerThirdsManager.setLowerThirdsIndex(req.body.index);
    res.sendStatus(200);
});

export const IS_DEVELOPMENT_ENVIRONMENT = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
console.log(IS_DEVELOPMENT_ENVIRONMENT);
if (!IS_DEVELOPMENT_ENVIRONMENT) {
    console.log("Mounting front-end");
    console.log(__dirname);
    app.use(express.static(path.join(__dirname, "../../../frontend/build")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../../../frontend/build/index.html"));
    });
}

const port = process.env.PORT || IS_DEVELOPMENT_ENVIRONMENT ? 4000 : 80;

app.listen(port, () => {
    console.log("Started ota-atem-server");
});
