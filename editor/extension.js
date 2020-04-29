"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../node_modules/pxt-core/localtypings/pxtarget.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtblocks.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtcompiler.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxtlib.d.ts" />
/// <reference path="../node_modules/pxt-core/built/pxteditor.d.ts" />
/// <reference path="dapjs.d.ts" />
var dialogs = require("./dialogs");
var flash = require("./flash");
var patch = require("./patch");
pxt.editor.initExtensionsAsync = function (opts) {
    pxt.debug('loading microbit target extensions...');
    var manyAny = Math;
    if (!manyAny.imul)
        manyAny.imul = function (a, b) {
            var ah = (a >>> 16) & 0xffff;
            var al = a & 0xffff;
            var bh = (b >>> 16) & 0xffff;
            var bl = b & 0xffff;
            // the shift by 0 fixes the sign on the high part
            // the final |0 converts the unsigned value into a signed value
            return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
        };
    var res = {
        hexFileImporters: [{
                id: "blockly",
                canImport: function (data) { return data.meta.cloudId == "microbit.co.uk" && data.meta.editor == "blockly"; },
                importAsync: function (project, data) {
                    pxt.tickEvent('import.legacyblocks.redirect');
                    return dialogs.cantImportAsync(project);
                }
            }, {
                id: "td",
                canImport: function (data) { return data.meta.cloudId == "microbit.co.uk" && data.meta.editor == "touchdevelop"; },
                importAsync: function (project, data) {
                    pxt.tickEvent('import.legacytd.redirect');
                    return dialogs.cantImportAsync(project);
                }
            }]
    };
    pxt.usb.setFilters([{
            vendorId: 0x0D28,
            productId: 0x0204,
            classCode: 0xff,
            subclassCode: 0x03
        }]);
    res.mkPacketIOWrapper = flash.mkPacketIOWrapper;
    res.blocklyPatch = patch.patchBlocks;
    res.renderBrowserDownloadInstructions = dialogs.renderBrowserDownloadInstructions;
    res.renderUsbPairDialog = dialogs.renderUsbPairDialog;
    return Promise.resolve(res);
};
