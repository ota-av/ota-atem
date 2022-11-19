import { LowerThirdsOption } from "./../types/lowerThirdsOption";
import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import config from "../../config.json";

import { Atem, AtemState } from "atem-connection";
import { AtemEvent } from "enums";
import { AtemEventHandlers, MediaStateMessage } from "comm";
import { MediaPreparationRequest } from "mediaPreparationRequest";
import { TransferState } from "atem-connection/dist/enums";
import { MyWebSocketServer } from "../wss";
import { send } from "process";

/**
 * lowerthirds handles controlling and rendering lowerthird templates and then uploading them to ATEM
 * templatefiles are HTML with handlebars
 */ 


// Render a single lowerthirdsimage by provided templatefile path and texts
async function render(lowerThirdsOptions: LowerThirdsOption) {
    // get template
    const templateHTML = fs.readFileSync(path.resolve(__dirname, lowerThirdsOptions.templateFile), {
        encoding: "utf-8",
    });
    // insert texts & compile to pure HTML
    const template = Handlebars.compile(templateHTML);
    const compiled = template(lowerThirdsOptions.texts);

    // get pngbuffer with puppeteer
    const pngBuffer = await takeScreenshot(compiled);
    if (pngBuffer === undefined) throw new Error("Invalid PNG buffer");
    // convert to RGBA buffer magic
    const buf = await sharp(pngBuffer).ensureAlpha().raw().toBuffer();
    let outputBuf = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i += 4) {
        let r = buf[i];
        let g = buf[i + 1];
        let b = buf[i + 2];
        let a = buf[i + 3];

        if (g > 55 && r < 30 && b < 113) {
            a = 0;
        }

        outputBuf[i] = r * (a / 255);
        outputBuf[i + 1] = g * (a / 255);
        outputBuf[i + 2] = b * (a / 255);
        outputBuf[i + 3] = a;
    }
    return outputBuf;
}


// take screenshot of specified HTML with puppeteer
async function takeScreenshot(html: string) {
    const browser = await puppeteer.launch({
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
    });
    const page = await browser.newPage();
    await page.setContent(html);
    const buffer = await page.screenshot();
    await browser.close();
    return buffer as Buffer;
}


// lowerthirdsmanager is called by other services, and provides hooks to atem
class LowerThirdsManager {
    get lowerThirdsData(): LowerThirdsOption[] {
        return this._lowerThirdsData;
    }
    private _lowerThirdsData: LowerThirdsOption[];
    private currentTextIndex: number;
    private atemConsole: Atem;
    public webSocketServer: MyWebSocketServer;

    constructor(lowerThirdsData: LowerThirdsOption[], atemConsole: Atem) {
        this._lowerThirdsData = lowerThirdsData;
        this.currentTextIndex = 0;
        this.atemConsole = atemConsole;
    }

    // Handles media state changes and sends them over ws
    public sendMediaWS() {
        const index = this.getLowerThirdsIndex();
        const data = this.lowerThirdsData[index];
        const msg = {
            type: "media",
            currentIndex: index,
            currentValues: data,
        } as MediaStateMessage;
        console.log(msg);
        this.webSocketServer.broadcastWsMessage(msg);
        this.webSocketServer.setMediaState(msg);
    }

    // advances lowerthirds to next in the list
    public nextLowerThirds(): void {
        console.log("Next lower thirds");
        this.currentTextIndex = (this.currentTextIndex + 1) % this._lowerThirdsData.length;
        this.prepareNextLowerThirds();
        this.sendMediaWS();
    }

    // sets lowerthirds based on list index
    public setLowerThirdsIndex(index: number): void {
        console.log(index);
        this.currentTextIndex = index % this._lowerThirdsData.length;
        this.prepareNextLowerThirds();
        this.sendMediaWS();
    }

    // gets index of current lowerthirds
    public getLowerThirdsIndex(): number {
        return this.currentTextIndex;
    }

    // get current lowerthirdsoptions
    public getCurrentLowerThirds(): LowerThirdsOption {
        return this._lowerThirdsData[this.currentTextIndex];
    }

    // rerender & reupload lowerthirds
    public refresh(): void {
        this.prepareNextLowerThirds();
    }

    // render & upload lowerthirds
    private prepareNextLowerThirds() {
        const lowerThirdsUploadedPromise = new Promise<void>(resolve => {
            const inner = async () => {
                // get options
                const lowerThirdsOptions = this._lowerThirdsData[this.currentTextIndex];
                // render
                const imageBuffer = await render(lowerThirdsOptions);
                //upload to atem
                const result = await this.atemConsole.uploadStill(config.lowerThirds.mediaIndex, imageBuffer, "Ota-atem image", "Ota-atem image");
                console.log(result.state === TransferState.Finished);
            };
            inner().then(resolve).catch(console.error);
        });
    }

    // set all lowerthirdsoptions by array
    public setLowerThirds(lowerThirdsData: LowerThirdsOption[]): void {
        console.log(this._lowerThirdsData);
        this._lowerThirdsData = lowerThirdsData;
        console.log(this._lowerThirdsData);
        this.setLowerThirdsIndex(0);
    }

    // add new lowerthirdsoption to list
    public addLowerThirds(item: LowerThirdsOption): void {
        this._lowerThirdsData.push(item);
    }

    // remove a single lowerthirdsitem
    public removeLowerThirds(i: number): boolean {
        if (i > -1 && i < this._lowerThirdsData.length) {
            this._lowerThirdsData.splice(i, 1);
            return true;
        } else {
            return false;
        }
    }

    // set a single lowerthirdsitem
    public setLowerThirdsItem(i: number, item: LowerThirdsOption): boolean {
        if (i > -1 && i < this._lowerThirdsData.length) {
            this._lowerThirdsData[i] = item;
            return true;
        } else {
            return false;
        }
    }
}

// lowerthirdshandlers to atem
const getLowerThirdsHandlers = (webSocketServer: MyWebSocketServer, lowerThirdsManager: LowerThirdsManager): AtemEventHandlers => {
    lowerThirdsManager.webSocketServer = webSocketServer;
    return {
        connected: [() => lowerThirdsManager.setLowerThirdsIndex(0), () => lowerThirdsManager.sendMediaWS],
        stateChanged: [],
        error: [],
        info: [],
    } as AtemEventHandlers;
};

export { LowerThirdsManager, getLowerThirdsHandlers };
