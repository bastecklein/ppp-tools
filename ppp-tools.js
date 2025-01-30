import commonHelpers from "common-helpers";

export const COMPOSIT_OPERATIONS = [
    "source-over",
    "source-in",
    "source-out",
    "source-atop",
    "destination-over",
    "destination-in",
    "destination-out",
    "destination-atop",
    "lighter",
    "copy",
    "xor",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity"
];

export class PixelPaintData {
    constructor() {
        this.id = commonHelpers.guid();

        this.frames = [];
        this.layers = [];
        this.rulers = [];
        this.lastSave = new Date().getTime();
        this.created = new Date().getTime();
        this.authors = [];
        this.firstAuthor = null;
        this.lastAuthor = null;
        this.height = 0;
        this.width = 0;
        this.createdApp = null;
        this.savedApp = null;
        this.createdAppVer = null;
        this.savedAppVer = null;
    }
}

export class PixelPaintLayer {
    constructor() {
        this.id = commonHelpers.guid();

        this.mode = null;
        this.name = null;
        this.visible = true;
        this.opacity = 100;
    }
}

export class PixelPaintFrame {
    constructor() {
        this.id = commonHelpers.guid();

        this.layerData = {};
    }
}

/**
 * Rebuilds a PixelPaintData object from a JSON string or object
 * @param {string|object} json
 * @returns {PixelPaintData}
 */
export function rebuildPPPFromJSON(json) {
    const retSt = new PixelPaintData();

    if(typeof json == "string") {
        try {
            json = JSON.parse(json);
        } catch(ex) {
            console.log(ex);
            return retSt;
        }
    }


    let oldData = null;

    if(json.data) {
        oldData = json.data;
    }

    for(let prop in retSt) {
        if(json[prop]) {
            retSt[prop] = json[prop];
        }
    }

    if(oldData) {
        retSt.layers.push({
            data: oldData,
            mode: null,
            name: null,
            visible: true
        });
    }

    const freshLayers = [];
    let tmpNewFrame = null;

    for(let i = 0; i < retSt.layers.length; i++) {
        const oldLayer = retSt.layers[i];

        if(!oldLayer) {
            continue;
        }

        const newLayer = new PixelPaintLayer();

        for(let prop in newLayer) {
            if(oldLayer[prop]) {
                newLayer[prop] = oldLayer[prop];
            }
        }

        if(oldLayer.data) {
            if(!tmpNewFrame) {
                tmpNewFrame = {
                    layerData: {}
                };
            }

            tmpNewFrame.layerData[newLayer.id] = oldLayer.data;
        }

        freshLayers.push(newLayer);
    }

    if(tmpNewFrame) {
        retSt.frames.push(tmpNewFrame);
    }

    retSt.layers = freshLayers;

    const freshFrames = [];

    for(let i = 0; i < retSt.frames.length; i++) {
        const oldFrame = retSt.frames[i];
        const newFrame = new PixelPaintFrame();

        for(let prop in newFrame) {
            if(oldFrame[prop]) {
                newFrame[prop] = oldFrame[prop];
            }
        }

        freshFrames.push(newFrame);
    }

    retSt.frames = freshFrames;

    if(retSt.layers.length == 0) {

        const layer = new PixelPaintLayer();
        const frame = new PixelPaintFrame();

        frame.layerData[layer.id] = [];

        retSt.frames.push(frame);
        retSt.layers.push(layer);
    }

    return retSt;
}

/**
 * Renders a PixelPaintData object to a canvas, VPP, or data URL
 * @param {object} options
 * @param {PixelPaintData} options.source
 * @param {string} [options.color]
 * @param {string} [options.outlineColor]
 * @param {array} [options.colorReplacements]
 * @param {number} [options.frame]
 * @param {number} [options.scale]
 * @param {function} [options.callback]
 * @param {string} [options.fill]
 * @param {Image} [options.gridlineImage]
 * @param {number} [options.opacity]
 * @param {boolean} [options.asVPP]
 * @param {boolean} [options.asCanvas]
 * @param {boolean} [options.asDataURL]
 * @param {array} [options.accessories]
 * @returns {string|HTMLCanvasElement}
 */
export function renderPPP(options) {
    if(!options.source) {
        console.log("No source data!");
        return;
    }

    let callback = null;
    let scale = 1;
    let frame = 0;
    let source = null;
    let modColor = null;
    let colorReplacements = [];
    let gridlineImage = null;
    let outlineColor = null;
    let opacity = 1;

    if(options.color && options.color.trim().length == 7) {
        modColor = options.color;
    }

    if(options.outlineColor) {
        outlineColor = options.outlineColor;
    }

    if(options.colorReplacements) {
        colorReplacements = options.colorReplacements;
    }

    if(options.frame != undefined && options.frame != null) {
        frame = options.frame;
    }

    if(options.scale != undefined && options.scale != null) {
        scale = options.scale;
    }

    if(options.callback) {
        callback = options.callback;
    }

    if(options.gridlineImage) {
        gridlineImage = options.gridlineImage;
    }

    if(options.opacity != undefined && options.opacity != null) {
        opacity = options.opacity;
    }

    source = rebuildPPPFromJSON(options.source);

    let baseHeight = source.height;
    let baseWidth = source.width;

    if(options.accessories) {
        for(let i = 0; i < options.accessories.length; i++) {
            const acc = options.accessories[i];

            if(acc.source) {
                const src = acc.source;

                if(src.width && src.width > baseWidth) {
                    baseWidth = src.width;
                }

                if(src.height && src.height > baseHeight) {
                    baseHeight = src.height;
                }
            }

            
        }
    }

    const frameHeight = baseHeight * scale;
    const frameWidth = baseWidth * scale;

    let outputWidth = frameWidth;

    if(frame == -1) {
        outputWidth = frameWidth * source.frames.length;
    }

    const outputCanvas = document.createElement("canvas");
    const outputContext = outputCanvas.getContext("2d");

    outputCanvas.style.imageRendering = "pixelated";
    outputContext.imageSmoothingEnabled = false;

    outputCanvas.height = frameHeight;
    outputCanvas.width = outputWidth;

    if(options.fill) {
        outputContext.fillStyle = options.fill;
        outputContext.fillRect(0, 0, outputWidth, frameHeight);
    }

    let startFrame = frame;
    let endFrame = frame + 1;

    if(frame == -1) {
        startFrame = 0;
        endFrame = source.frames.length;
    }

    let frameX = 0;
    
    const allOutputs = [];

    allOutputs.push({
        source: source,
        colorReplacements: colorReplacements
    });

    if(options.accessories) {
        for(let i = 0; i < options.accessories.length; i++) {
            const acc = options.accessories[i];

            allOutputs.push(JSON.parse(JSON.stringify(acc)));
        }
    }

    for(let i = 0; i < allOutputs.length; i++) {
        frameX = 0;

        const workItem = allOutputs[i];

        const output = workItem.source;

        let yOff = 0;

        if(output.height < baseHeight) {
            yOff += (baseHeight - output.height);
        }

        let cr = null;

        let drawnPixels = {};
        let dpX = 0;

        if(workItem.colorReplacements) {
            cr = workItem.colorReplacements;
        }

        for(let f = startFrame; f < endFrame; f++) {
            const frame = output.frames[f];

            if(!frame) {
                continue;
            }

            for(let l = 0; l < output.layers.length; l++) {

                outputContext.globalCompositeOperation = "source-over";

                const layer = output.layers[l];

                if(!layer.visible) {
                    continue;
                }

                const layerData = frame.layerData[layer.id];

                if(!layerData) {
                    continue;
                }

                if(layer.mode) {
                    outputContext.globalCompositeOperation = layer.mode;
                }

                if(layer.opacity && layer.opacity < 100) {
                    outputContext.globalAlpha = layer.opacity / 100;
                } else {
                    outputContext.globalAlpha = 1;
                }

                for(let i = 0; i < layerData.length; i++) {
                    const px = layerData[i];

                    let pxX = px.x + dpX;

                    drawnPixels[pxX + ":" + px.y] = true;

                    const dx = (px.x * scale) + frameX;
                    const dy = (px.y + yOff) * scale;

                    let color = px.c;

                    if(modColor && color == "#ff00ff") {
                        color = modColor;
                    }

                    if(cr) {
                        for(let j = 0; j < cr.length; j++) {
                            const c = cr[j].c;
                            const r = cr[j].r;

                            if(color == c) {
                                color = r;
                                break;
                            }
                        }
                    }

                    outputContext.fillStyle = color;
                    outputContext.fillRect(dx, dy, scale, scale);
                }
            }

            dpX += source.width;
            frameX += frameWidth;
        }

        outputContext.globalCompositeOperation = "source-over";

        if(gridlineImage) {
            for(let x = 0; x < output.width; x++) {
                for(let y = 0; y < output.height; y++) {
                    const dx = x * scale;
                    const dy = y * scale;

                    outputContext.drawImage(gridlineImage, dx, dy, scale, scale);
                }
            }
        }

        if(outlineColor) {

            const cloneCanvas = document.createElement("canvas");
            const cloneContext = cloneCanvas.getContext("2d");

            cloneCanvas.width = outputCanvas.width;
            cloneCanvas.height = outputCanvas.height;

            cloneContext.drawImage(outputCanvas, 0, 0);

            outputContext.fillStyle = outlineColor;
            outputContext.globalCompositeOperation = "source-over";
            outputContext.globalAlpha = 1;

            for(let pxmap in drawnPixels) {
                const parts = pxmap.split(":");
                const x = parseInt(parts[0]);
                const y = parseInt(parts[1]);

                for(let ux = x - 1; ux <= x + 1; ux++) {
                    for(let uy = y - 1; uy <= y + 1; uy++) {
                        const dx = ux * scale;
                        const dy = uy * scale;

                        outputContext.fillRect(dx, dy, scale, scale);
                    }
                }
            }

            outputContext.drawImage(cloneCanvas, 0, 0);
        }
    }

    if(opacity < 1) {
        const tmpOpacityCanvas = document.createElement("canvas");
        const tmpOpacityContext = tmpOpacityCanvas.getContext("2d");

        tmpOpacityCanvas.height = frameHeight;
        tmpOpacityCanvas.width = outputWidth;

        tmpOpacityContext.drawImage(outputCanvas, 0, 0);

        outputCanvas.height = frameHeight;
        outputCanvas.width = outputWidth;

        outputContext.globalAlpha = opacity;
        outputContext.drawImage(tmpOpacityCanvas, 0, 0);
    }

    if(options.asVPP) {
        convertCanvastoVPP(outputCanvas, outputContext, callback);
        return;
    }

    if(options.asCanvas) {
        if(callback) {
            callback(outputCanvas);
        } else {
            return outputCanvas;
        }
        
        return;
    }

    const data = outputCanvas.toDataURL();

    if(options.asDataURL) {
        if(callback) {
            callback(data);
        } else {
            return data;
        }
        
        return;
    }

    if(!callback) {
        console.log("Missing callback");
        return;
    }

    const img = new Image();
    img.onload = function(){
        callback(img);
    };
    img.src = data;
}

function convertCanvastoVPP(canvas, context, callback) {
    const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pxData = imgData.data;

    let withOffset = 0;

    const vppData = {
        author: null,
        size: 0,
        id: commonHelpers.guid(),
        voxels: [],
        precompiledat: null,
        vars: {
            created_timestamp: new Date().getTime(),
            last_edit_timestamp: new Date().getTime(),
            last_edit_app: null
        }
    };

    vppData.size = imgData.width;

    if(imgData.height > imgData.width) {
        vppData.size = imgData.height;
    }

    withOffset = Math.floor(vppData.size / 2);

    for(let i = 0; i < pxData.length; i += 4) {

        const idx = Math.floor(i / 4);
        const y = Math.floor(idx / imgData.width);
        const x = idx - (y * imgData.width);

        const r = pxData[i + 0];
        const g = pxData[i + 1];
        const b = pxData[i + 2];
        const a = pxData[i + 3];

        if(a == 0) {
            continue;
        }

        const hex = commonHelpers.rgbToHex(r, g, b);

        let vxl = {
            x: x - withOffset,
            y: 0,
            z: (imgData.height - y) - 1,
            c: hex,
            op: a / 255
        };

        vppData.voxels.push(vxl);
    }

    callback(vppData);
}

export default {
    COMPOSIT_OPERATIONS,
    PixelPaintData,
    PixelPaintLayer,
    PixelPaintFrame,
    rebuildPPPFromJSON,
    renderPPP
};