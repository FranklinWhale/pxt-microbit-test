"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var imul = Math.imul;
var pageSize = 1024;
var numPages = 256;
var timeoutMessage = "timeout";
var membase = 0x20000000;
var loadAddr = membase;
var dataAddr = 0x20002000;
var stackAddr = 0x20001000;
var flashPageBINquick = new Uint32Array([
    0xbe00be00,
    0x2480b5f0, 0x00e42300, 0x58cd58c2, 0xd10342aa, 0x42a33304, 0xbdf0d1f8,
    0x4b162502, 0x509d4a16, 0x2d00591d, 0x24a1d0fc, 0x511800e4, 0x3cff3c09,
    0x591e0025, 0xd0fc2e00, 0x509c2400, 0x2c00595c, 0x2401d0fc, 0x509c2580,
    0x595c00ed, 0xd0fc2c00, 0x00ed2580, 0x002e2400, 0x5107590f, 0x2f00595f,
    0x3404d0fc, 0xd1f742ac, 0x50992100, 0x2a00599a, 0xe7d0d0fc, 0x4001e000,
    0x00000504,
]);
// doesn't check if data is already there - for timing
var flashPageBIN = new Uint32Array([
    0xbe00be00,
    0x2402b5f0, 0x4a174b16, 0x2480509c, 0x002500e4, 0x2e00591e, 0x24a1d0fc,
    0x511800e4, 0x2c00595c, 0x2400d0fc, 0x2480509c, 0x002500e4, 0x2e00591e,
    0x2401d0fc, 0x595c509c, 0xd0fc2c00, 0x00ed2580, 0x002e2400, 0x5107590f,
    0x2f00595f, 0x3404d0fc, 0xd1f742ac, 0x50992100, 0x2a00599a, 0xbdf0d0fc,
    0x4001e000, 0x00000504,
]);
// void computeHashes(uint32_t *dst, uint8_t *ptr, uint32_t pageSize, uint32_t numPages)
var computeChecksums2 = new Uint32Array([
    0x4c27b5f0, 0x44a52680, 0x22009201, 0x91004f25, 0x00769303, 0x24080013,
    0x25010019, 0x40eb4029, 0xd0002900, 0x3c01407b, 0xd1f52c00, 0x468c0091,
    0xa9044665, 0x506b3201, 0xd1eb42b2, 0x089b9b01, 0x23139302, 0x9b03469c,
    0xd104429c, 0x2000be2a, 0x449d4b15, 0x9f00bdf0, 0x4d149e02, 0x49154a14,
    0x3e01cf08, 0x2111434b, 0x491341cb, 0x405a434b, 0x4663405d, 0x230541da,
    0x4b10435a, 0x466318d2, 0x230541dd, 0x4b0d435d, 0x2e0018ed, 0x6002d1e7,
    0x9a009b01, 0x18d36045, 0x93003008, 0xe7d23401, 0xfffffbec, 0xedb88320,
    0x00000414, 0x1ec3a6c8, 0x2f9be6cc, 0xcc9e2d51, 0x1b873593, 0xe6546b64,
]);
var startTime = 0;
function log(msg) {
    var now = Date.now();
    if (!startTime)
        startTime = now;
    now -= startTime;
    var ts = ("00000" + now).slice(-5);
    pxt.log("dap " + ts + ": " + msg);
}
function murmur3_core(data) {
    var h0 = 0x2F9BE6CC;
    var h1 = 0x1EC3A6C8;
    for (var i = 0; i < data.length; i += 4) {
        var k = pxt.HF2.read32(data, i) >>> 0;
        k = imul(k, 0xcc9e2d51);
        k = (k << 15) | (k >>> 17);
        k = imul(k, 0x1b873593);
        h0 ^= k;
        h1 ^= k;
        h0 = (h0 << 13) | (h0 >>> 19);
        h1 = (h1 << 13) | (h1 >>> 19);
        h0 = (imul(h0, 5) + 0xe6546b64) >>> 0;
        h1 = (imul(h1, 5) + 0xe6546b64) >>> 0;
    }
    return [h0, h1];
}
var DAPWrapper = /** @class */ (function () {
    function DAPWrapper(io) {
        var _this = this;
        this.io = io;
        this.flashing = false;
        this.readSerialId = 0;
        this.pbuf = new pxt.U.PromiseBuffer();
        this.icon = "usb";
        this.familyID = 0x0D28; // this is the microbit vendor id, not quite UF2 family id
        this.io.onDeviceConnectionChanged = function (connect) {
            return _this.disconnectAsync()
                .then(function () { return connect && _this.reconnectAsync(); });
        };
        this.io.onData = function (buf) {
            // console.log("RD: " + pxt.Util.toHex(buf))
            _this.pbuf.push(buf);
        };
        this.allocDAP();
    }
    DAPWrapper.prototype.startReadSerial = function () {
        var _this = this;
        log("start read serial");
        var rid = this.readSerialId;
        var readSerial = function () {
            if (rid != _this.readSerialId) {
                log("stopped read serial " + rid);
                return;
            }
            if (_this.flashing) {
                setTimeout(readSerial, 500);
                return;
            }
            // done
            _this.cmsisdap.cmdNums(0x83, [])
                .then(function (r) {
                var len = r[1];
                var str = "";
                for (var i = 2; i < len + 2; ++i) {
                    str += String.fromCharCode(r[i]);
                }
                if (str.length > 0) {
                    pxt.U.nextTick(readSerial);
                    if (_this.onSerial) {
                        var utf8Str = pxt.U.toUTF8(str);
                        _this.onSerial(pxt.U.stringToUint8Array(utf8Str), false);
                    }
                }
                else
                    setTimeout(readSerial, 50);
            }, function (err) {
                log("read error: " + err.message);
                _this.disconnectAsync(); // force disconnect
            });
        };
        readSerial();
    };
    DAPWrapper.prototype.stopSerialAsync = function () {
        log("stopping serial reader");
        this.readSerialId++;
        return Promise.delay(200);
    };
    DAPWrapper.prototype.allocDAP = function () {
        log("alloc dap");
        this.dap = new DapJS.DAP({
            write: writeAsync,
            close: this.disconnectAsync,
            read: readAsync,
        });
        this.cmsisdap = this.dap.dap;
        this.cortexM = new DapJS.CortexM(this.dap);
        var h = this.io;
        var pbuf = this.pbuf;
        function writeAsync(data) {
            // console.log("WR: " + pxt.Util.toHex(new Uint8Array(data)));
            return h.sendPacketAsync(new Uint8Array(data));
        }
        function readAsync() {
            return pbuf.shiftAsync();
        }
    };
    DAPWrapper.prototype.reconnectAsync = function () {
        var _this = this;
        log("reconnect");
        // configure serial at 115200
        return this.stopSerialAsync()
            .then(function () { return _this.io.reconnectAsync(); })
            .then(function () { return _this.cortexM.init(); })
            .then(function () { return _this.cmsisdap.cmdNums(0x82, [0x00, 0xC2, 0x01, 0x00]); })
            .then(function () { return _this.startReadSerial(); });
    };
    DAPWrapper.prototype.disconnectAsync = function () {
        var _this = this;
        log("disconnect");
        return this.stopSerialAsync()
            .then(function () { return _this.io.disconnectAsync(); });
    };
    DAPWrapper.prototype.reflashAsync = function (resp) {
        var _this = this;
        log("reflash");
        startTime = 0;
        pxt.tickEvent("hid.flash.start");
        this.flashing = true;
        return (this.io.isConnected() ? Promise.resolve() : this.io.reconnectAsync())
            .then(function () { return _this.cortexM.init(); })
            .then(function () { return _this.cortexM.reset(true); })
            .then(function () { return _this.cortexM.memory.readBlock(0x10001014, 1, pageSize); })
            .then(function (v) {
            if (pxt.HF2.read32(v, 0) != 0x3C000) {
                pxt.tickEvent("hid.flash.uicrfail");
                return _this.fullVendorCommandFlashAsync(resp);
            }
            return _this.quickHidFlashAsync(resp);
        })
            .finally(function () { _this.flashing = false; })
            .then(function () { return Promise.delay(100); })
            .then(function () { return _this.disconnectAsync(); });
    };
    DAPWrapper.prototype.fullVendorCommandFlashAsync = function (resp) {
        var _this = this;
        log("full flash");
        var chunkSize = 62;
        var aborted = false;
        return Promise.resolve()
            .then(function () {
            return _this.cmsisdap.cmdNums(0x8A /* DAPLinkFlash.OPEN */, [1]);
        })
            .then(function (res) {
            var hexUint8 = pxt.U.stringToUint8Array(resp.outfiles[pxtc.BINARY_HEX]);
            var hexArray = Array.prototype.slice.call(hexUint8);
            var sendPages = function (offset) {
                if (offset === void 0) { offset = 0; }
                var end = Math.min(hexArray.length, offset + chunkSize);
                var nextPage = hexArray.slice(offset, end);
                nextPage.unshift(nextPage.length);
                return _this.cmsisdap.cmdNums(0x8C /* DAPLinkFlash.WRITE */, nextPage)
                    .then(function () {
                    if (!aborted && end < hexArray.length) {
                        return sendPages(end);
                    }
                    return Promise.resolve();
                });
            };
            return sendPages();
        })
            .then(function (res) {
            return _this.cmsisdap.cmdNums(0x8B /* DAPLinkFlash.CLOSE */, []);
        })
            .timeout(60000, timeoutMessage)
            .catch(function (e) {
            aborted = true;
            return _this.cmsisdap.cmdNums(0x89 /* DAPLinkFlash.RESET */, [])
                .catch(function (e2) {
                // Best effort reset, no-op if there's an error
            })
                .then(function () {
                return Promise.reject(e);
            });
        });
    };
    DAPWrapper.prototype.quickHidFlashAsync = function (resp) {
        var _this = this;
        log("quick flash");
        var logV = function (msg) { };
        //let logV = log
        var aborted = false;
        var runFlash = function (b, dataAddr) {
            var cmd = _this.cortexM.prepareCommand();
            cmd.halt();
            cmd.writeCoreRegister(15 /* PC */, loadAddr + 4 + 1);
            cmd.writeCoreRegister(14 /* LR */, loadAddr + 1);
            cmd.writeCoreRegister(13 /* SP */, stackAddr);
            cmd.writeCoreRegister(0, b.targetAddr);
            cmd.writeCoreRegister(1, dataAddr);
            return Promise.resolve()
                .then(function () {
                logV("setregs");
                return cmd.go();
            })
                .then(function () {
                logV("dbg en");
                // starts the program
                return _this.cortexM.debug.enable();
            });
        };
        var checksums;
        return this.getFlashChecksumsAsync()
            .then(function (buf) {
            checksums = buf;
            log("write code");
            return _this.cortexM.memory.writeBlock(loadAddr, flashPageBIN);
        })
            .then(function () {
            log("convert");
            // TODO this is seriously inefficient (130ms on a fast machine)
            var uf2 = ts.pxtc.UF2.newBlockFile();
            ts.pxtc.UF2.writeHex(uf2, resp.outfiles[pxtc.BINARY_HEX].split(/\r?\n/));
            var bytes = pxt.U.stringToUint8Array(ts.pxtc.UF2.serializeFile(uf2));
            var parsed = ts.pxtc.UF2.parseFile(bytes);
            var aligned = DAPWrapper.pageAlignBlocks(parsed, pageSize);
            log("initial: " + aligned.length + " pages");
            aligned = DAPWrapper.onlyChanged(aligned, checksums);
            log("incremental: " + aligned.length + " pages");
            return Promise.mapSeries(pxt.U.range(aligned.length), function (i) {
                if (aborted)
                    return Promise.resolve();
                var b = aligned[i];
                if (b.targetAddr >= 0x10000000)
                    return Promise.resolve();
                logV("about to write at 0x" + b.targetAddr.toString(16));
                var writeBl = Promise.resolve();
                var thisAddr = (i & 1) ? dataAddr : dataAddr + pageSize;
                var nextAddr = (i & 1) ? dataAddr + pageSize : dataAddr;
                if (i == 0) {
                    var u32data = new Uint32Array(b.data.length / 4);
                    for (var i_1 = 0; i_1 < b.data.length; i_1 += 4)
                        u32data[i_1 >> 2] = pxt.HF2.read32(b.data, i_1);
                    writeBl = _this.cortexM.memory.writeBlock(thisAddr, u32data);
                }
                return writeBl
                    .then(function () { return runFlash(b, thisAddr); })
                    .then(function () {
                    var next = aligned[i + 1];
                    if (!next)
                        return Promise.resolve();
                    logV("write next");
                    var buf = new Uint32Array(next.data.buffer);
                    return _this.cortexM.memory.writeBlock(nextAddr, buf);
                })
                    .then(function () {
                    logV("wait");
                    return _this.cortexM.waitForHalt(500);
                })
                    .then(function () {
                    logV("done block");
                });
            })
                .then(function () {
                log("flash done");
                pxt.tickEvent("hid.flash.done");
                return _this.cortexM.reset(false);
            });
        })
            .timeout(25000, timeoutMessage)
            .catch(function (e) {
            aborted = true;
            return Promise.reject(e);
        });
    };
    DAPWrapper.prototype.getFlashChecksumsAsync = function () {
        var _this = this;
        log("flash checksums");
        var pages = numPages;
        return this.cortexM.runCode(computeChecksums2, loadAddr, loadAddr + 1, 0xffffffff, stackAddr, true, dataAddr, 0, pageSize, pages)
            .then(function () { return _this.cortexM.memory.readBlock(dataAddr, pages * 2, pageSize); });
    };
    DAPWrapper.onlyChanged = function (blocks, checksums) {
        return blocks.filter(function (b) {
            var idx = b.targetAddr / pageSize;
            pxt.U.assert((idx | 0) == idx);
            pxt.U.assert(b.data.length == pageSize);
            if (idx * 8 + 8 > checksums.length)
                return true; // out of range?
            var c0 = pxt.HF2.read32(checksums, idx * 8);
            var c1 = pxt.HF2.read32(checksums, idx * 8 + 4);
            var ch = murmur3_core(b.data);
            if (c0 == ch[0] && c1 == ch[1])
                return false;
            return true;
        });
    };
    DAPWrapper.pageAlignBlocks = function (blocks, pageSize) {
        pxt.U.assert(pageSize % 256 == 0);
        var res = [];
        for (var i = 0; i < blocks.length;) {
            var b0 = blocks[i];
            var newbuf = new Uint8Array(pageSize);
            var startPad = b0.targetAddr & (pageSize - 1);
            var newAddr = b0.targetAddr - startPad;
            for (; i < blocks.length; ++i) {
                var b = blocks[i];
                if (b.targetAddr + b.payloadSize > newAddr + pageSize)
                    break;
                pxt.U.memcpy(newbuf, b.targetAddr - newAddr, b.data, 0, b.payloadSize);
            }
            var bb = pxt.U.flatClone(b0);
            bb.data = newbuf;
            bb.targetAddr = newAddr;
            bb.payloadSize = pageSize;
            res.push(bb);
        }
        return res;
    };
    return DAPWrapper;
}());
function mkPacketIOWrapper(io) {
    pxt.log("packetio: mk wrapper dap");
    return new DAPWrapper(io);
}
exports.mkPacketIOWrapper = mkPacketIOWrapper;
