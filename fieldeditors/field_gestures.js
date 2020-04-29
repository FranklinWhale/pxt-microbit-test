"use strict";
/// <reference path="../node_modules/pxt-core/localtypings/blockly.d.ts"/>
/// <reference path="../node_modules/pxt-core/built/pxtblocks.d.ts"/>
/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var FieldGestures = /** @class */ (function (_super) {
    __extends(FieldGestures, _super);
    function FieldGestures(text, options, validator) {
        var _this = _super.call(this, text, options, validator) || this;
        _this.isFieldCustom_ = true;
        _this.buttonClick_ = function (e) {
            var value = e.target.getAttribute('data-value');
            this.setValue(value);
            Blockly.DropDownDiv.hide();
        };
        _this.columns_ = parseInt(options.columns) || 4;
        _this.width_ = parseInt(options.width) || 350;
        _this.addLabel_ = true;
        _this.renderSelectedImage_ = Blockly.FieldDropdown.prototype.renderSelectedText_;
        _this.updateSize_ = Blockly.Field.prototype.updateSize_;
        return _this;
    }
    FieldGestures.prototype.trimOptions_ = function () {
    };
    return FieldGestures;
}(pxtblockly.FieldImages));
exports.FieldGestures = FieldGestures;
