"use strict";
/**
 *       <block type="device_show_leds">
    <field name="LED00">FALSE</field>
    <field name="LED10">FALSE</field>
    <field name="LED20">FALSE</field>
    <field name="LED30">FALSE</field>
    <field name="LED40">FALSE</field>
    <field name="LED01">FALSE</field>
    <field name="LED11">FALSE</field>
    <field name="LED21">FALSE</field>
    <field name="LED31">TRUE</field>
    <field name="LED41">FALSE</field>
    <field name="LED02">FALSE</field>
    <field name="LED12">FALSE</field>
    <field name="LED22">FALSE</field>
    <field name="LED32">FALSE</field>
    <field name="LED42">FALSE</field>
    <field name="LED03">FALSE</field>
    <field name="LED13">TRUE</field>
    <field name="LED23">FALSE</field>
    <field name="LED33">FALSE</field>
    <field name="LED43">FALSE</field>
    <field name="LED04">FALSE</field>
    <field name="LED14">FALSE</field>
    <field name="LED24">FALSE</field>
    <field name="LED34">FALSE</field>
    <field name="LED44">FALSE</field>
  </block>
 
  to
<block type="device_show_leds">
    <field name="LEDS">`
    # # # # #
    . . . . #
    . . . . .
    . . . . #
    . . . . #
    `
    </field>
  </block>
 */
Object.defineProperty(exports, "__esModule", { value: true });
function patchBlocks(pkgTargetVersion, dom) {
    // is this a old script?
    if (pxt.semver.majorCmp(pkgTargetVersion || "0.0.0", "1.0.0") >= 0)
        return;
    // showleds
    var nodes = pxt.U.toArray(dom.querySelectorAll("block[type=device_show_leds]"))
        .concat(pxt.U.toArray(dom.querySelectorAll("block[type=device_build_image]")))
        .concat(pxt.U.toArray(dom.querySelectorAll("shadow[type=device_build_image]")))
        .concat(pxt.U.toArray(dom.querySelectorAll("block[type=device_build_big_image]")))
        .concat(pxt.U.toArray(dom.querySelectorAll("shadow[type=device_build_big_image]")));
    nodes.forEach(function (node) {
        // don't rewrite if already upgraded, eg. field LEDS already present
        if (pxt.U.toArray(node.children).filter(function (child) { return child.tagName == "field" && "LEDS" == child.getAttribute("name"); })[0])
            return;
        // read LEDxx value and assmebly into a new field
        var leds = [[], [], [], [], []];
        pxt.U.toArray(node.children)
            .filter(function (child) { return child.tagName == "field" && /^LED\d+$/.test(child.getAttribute("name")); })
            .forEach(function (lednode) {
            var n = lednode.getAttribute("name");
            var col = parseInt(n[3]);
            var row = parseInt(n[4]);
            leds[row][col] = lednode.innerHTML == "TRUE" ? "#" : ".";
            // remove node
            node.removeChild(lednode);
        });
        // add new field
        var f = node.ownerDocument.createElement("field");
        f.setAttribute("name", "LEDS");
        var s = '`\n' + leds.map(function (row) { return row.join(''); }).join('\n') + '\n`';
        f.appendChild(node.ownerDocument.createTextNode(s));
        node.insertBefore(f, null);
    });
    // radio
    /*
<block type="radio_on_packet" x="174" y="120">
<mutation callbackproperties="receivedNumber" renamemap="{}"></mutation>
<field name="receivedNumber">receivedNumber</field>
</block>
<block type="radio_on_packet" disabled="true" x="127" y="263">
<mutation callbackproperties="receivedString,receivedNumber" renamemap="{&quot;receivedString&quot;:&quot;name&quot;,&quot;receivedNumber&quot;:&quot;value&quot;}"></mutation>
<field name="receivedString">name</field>
<field name="receivedNumber">value</field>
</block>
<block type="radio_on_packet" disabled="true" x="162" y="420">
<mutation callbackproperties="receivedString" renamemap="{}"></mutation>
<field name="receivedString">receivedString</field>
</block>
 
converts to
 
<block type="radio_on_number" x="196" y="208">
<field name="HANDLER_receivedNumber" id="DCy(W;1)*jLWQUpoy4Mm" variabletype="">receivedNumber</field>
</block>
<block type="radio_on_value" x="134" y="408">
<field name="HANDLER_name" id="*d-Jm^MJXO]Djs(dTR*?" variabletype="">name</field>
<field name="HANDLER_value" id="A6HQjH[k^X43o3h775+G" variabletype="">value</field>
</block>
<block type="radio_on_string" x="165" y="583">
<field name="HANDLER_receivedString" id="V9KsE!h$(iO?%W:[32CV" variabletype="">receivedString</field>
</block>
*/
    var varids = {};
    function addField(node, renameMap, name) {
        var f = node.ownerDocument.createElement("field");
        f.setAttribute("name", "HANDLER_" + name);
        f.setAttribute("id", varids[renameMap[name] || name]);
        f.appendChild(node.ownerDocument.createTextNode(name));
        node.appendChild(f);
    }
    pxt.U.toArray(dom.querySelectorAll("variable")).forEach(function (node) { return varids[node.innerHTML] = node.getAttribute("id"); });
    pxt.U.toArray(dom.querySelectorAll("block[type=radio_on_packet]"))
        .forEach(function (node) {
        var mutation = node.querySelector("mutation");
        if (!mutation)
            return;
        var renameMap = JSON.parse(node.getAttribute("renamemap") || "{}");
        var props = mutation.getAttribute("callbackproperties");
        if (props) {
            var parts = props.split(",");
            // It's tempting to generate radio_on_number if parts.length === 0 but
            // that would create a variable named "receivedNumber" and possibly shadow
            // an existing variable in the user's program. It's safer to stick to the
            // old block.
            if (parts.length === 1) {
                if (parts[0] === "receivedNumber") {
                    node.setAttribute("type", "radio_on_number");
                    node.removeChild(node.querySelector("field[name=receivedNumber]"));
                    addField(node, renameMap, "receivedNumber");
                }
                else if (parts[0] === "receivedString") {
                    node.setAttribute("type", "radio_on_string");
                    node.removeChild(node.querySelector("field[name=receivedString]"));
                    addField(node, renameMap, "receivedString");
                }
                else {
                    return;
                }
                node.removeChild(mutation);
            }
            else if (parts.length === 2 && parts.indexOf("receivedNumber") !== -1 && parts.indexOf("receivedString") !== -1) {
                node.setAttribute("type", "radio_on_value");
                node.removeChild(node.querySelector("field[name=receivedNumber]"));
                node.removeChild(node.querySelector("field[name=receivedString]"));
                addField(node, renameMap, "name");
                addField(node, renameMap, "value");
                node.removeChild(mutation);
            }
        }
    });
    // device_random now refers to randomRange() so we need to add the missing lower bound argument
    pxt.U.toArray(dom.querySelectorAll("block[type=device_random]"))
        .concat(pxt.U.toArray(dom.querySelectorAll("shadow[type=device_random]")))
        .forEach(function (node) {
        if (getValue(node, "min"))
            return;
        var v = node.ownerDocument.createElement("value");
        v.setAttribute("name", "min");
        addNumberShadow(v);
        node.appendChild(v);
    });
    /*
    <block type="math_arithmetic">
        <field name="OP">DIVIDE</field>
        <value name="A">
            <shadow type="math_number"><field name="NUM">0</field></shadow>
            <block type="math_number"><field name="NUM">2</field></block>
        </value>
        <value name="B">
            <shadow type="math_number"><field name="NUM">1</field></shadow>
            <block type="math_number"><field name="NUM">3</field></block>
        </value>
    </block>
    */
    pxt.U.toArray(dom.querySelectorAll("block[type=math_arithmetic]"))
        .concat(pxt.U.toArray(dom.querySelectorAll("shadow[type=math_arithmetic]")))
        .forEach(function (node) {
        var op = getField(node, "OP");
        if (!op || op.textContent.trim() !== "DIVIDE")
            return;
        // Convert to integer division
        /*
        <block type="math_js_op">
            <mutation op-type="infix"></mutation>
            <field name="OP">idiv</field>
            <value name="ARG0">
                <shadow type="math_number"><field name="NUM">0</field></shadow>
            </value>
            <value name="ARG1">
                <shadow type="math_number"><field name="NUM">0</field></shadow>
            </value>
        </block>
        */
        node.setAttribute("type", "math_js_op");
        op.textContent = "idiv";
        var mutation = node.ownerDocument.createElement("mutation");
        mutation.setAttribute("op-type", "infix");
        // mutation has to be first or Blockly will drop the second argument
        node.insertBefore(mutation, node.firstChild);
        var a = getValue(node, "A");
        if (a)
            a.setAttribute("name", "ARG0");
        var b = getValue(node, "B");
        if (b)
            b.setAttribute("name", "ARG1");
    });
    renameField(dom, "math_number_minmax", "NUM", "SLIDER");
    renameField(dom, "device_note", "note", "name");
}
exports.patchBlocks = patchBlocks;
function renameField(dom, blockType, oldName, newName) {
    pxt.U.toArray(dom.querySelectorAll("block[type=" + blockType + "]"))
        .concat(pxt.U.toArray(dom.querySelectorAll("shadow[type=" + blockType + "]")))
        .forEach(function (node) {
        var thefield = getField(node, oldName);
        if (thefield) {
            thefield.setAttribute("name", newName);
        }
    });
}
function getField(parent, name) {
    return getFieldOrValue(parent, name, true);
}
function getValue(parent, name) {
    return getFieldOrValue(parent, name, false);
}
function getFieldOrValue(parent, name, isField) {
    var nodeType = isField ? "field" : "value";
    for (var i = 0; i < parent.children.length; i++) {
        var child = parent.children.item(i);
        if (child.tagName === nodeType && child.getAttribute("name") === name) {
            return child;
        }
    }
    return undefined;
}
function addNumberShadow(valueNode) {
    var s = valueNode.ownerDocument.createElement("shadow");
    s.setAttribute("type", "math_number");
    var f = valueNode.ownerDocument.createElement("field");
    f.setAttribute("name", "NUM");
    f.textContent = "0";
    s.appendChild(f);
    valueNode.appendChild(s);
}
