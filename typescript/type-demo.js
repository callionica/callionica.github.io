// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

var LZString = function() {
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};
    function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
            baseReverseDic[alphabet] = {};
            for(var i = 0; i < alphabet.length; i++){
                baseReverseDic[alphabet][alphabet.charAt(i)] = i;
            }
        }
        return baseReverseDic[alphabet][character];
    }
    var LZString = {
        compressToBase64: function(input) {
            if (input == null) return "";
            var res = LZString._compress(input, 6, function(a) {
                return keyStrBase64.charAt(a);
            });
            switch(res.length % 4){
                default:
                case 0:
                    return res;
                case 1:
                    return res + "===";
                case 2:
                    return res + "==";
                case 3:
                    return res + "=";
            }
        },
        decompressFromBase64: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            return LZString._decompress(input.length, 32, function(index) {
                return getBaseValue(keyStrBase64, input.charAt(index));
            });
        },
        compressToUTF16: function(input) {
            if (input == null) return "";
            return LZString._compress(input, 15, function(a) {
                return f(a + 32);
            }) + " ";
        },
        decompressFromUTF16: function(compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString._decompress(compressed.length, 16384, function(index) {
                return compressed.charCodeAt(index) - 32;
            });
        },
        compressToUint8Array: function(uncompressed) {
            var compressed = LZString.compress(uncompressed);
            var buf = new Uint8Array(compressed.length * 2);
            for(var i = 0, TotalLen = compressed.length; i < TotalLen; i++){
                var current_value = compressed.charCodeAt(i);
                buf[i * 2] = current_value >>> 8;
                buf[i * 2 + 1] = current_value % 256;
            }
            return buf;
        },
        decompressFromUint8Array: function(compressed) {
            if (compressed === null || compressed === undefined) {
                return LZString.decompress(compressed);
            } else {
                var buf = new Array(compressed.length / 2);
                for(var i = 0, TotalLen = buf.length; i < TotalLen; i++){
                    buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
                }
                var result = [];
                buf.forEach(function(c) {
                    result.push(f(c));
                });
                return LZString.decompress(result.join(''));
            }
        },
        compressToEncodedURIComponent: function(input) {
            if (input == null) return "";
            return LZString._compress(input, 6, function(a) {
                return keyStrUriSafe.charAt(a);
            });
        },
        decompressFromEncodedURIComponent: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            input = input.replace(/ /g, "+");
            return LZString._decompress(input.length, 32, function(index) {
                return getBaseValue(keyStrUriSafe, input.charAt(index));
            });
        },
        compress: function(uncompressed) {
            return LZString._compress(uncompressed, 16, function(a) {
                return f(a);
            });
        },
        _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
            if (uncompressed == null) return "";
            var i, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
            for(ii = 0; ii < uncompressed.length; ii += 1){
                context_c = uncompressed.charAt(ii);
                if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                    context_dictionary[context_c] = context_dictSize++;
                    context_dictionaryToCreate[context_c] = true;
                }
                context_wc = context_w + context_c;
                if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                    context_w = context_wc;
                } else {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for(i = 0; i < context_numBits; i++){
                                context_data_val = context_data_val << 1;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for(i = 0; i < 8; i++){
                                context_data_val = context_data_val << 1 | value & 1;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for(i = 0; i < context_numBits; i++){
                                context_data_val = context_data_val << 1 | value;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for(i = 0; i < 16; i++){
                                context_data_val = context_data_val << 1 | value & 1;
                                if (context_data_position == bitsPerChar - 1) {
                                    context_data_position = 0;
                                    context_data.push(getCharFromInt(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for(i = 0; i < context_numBits; i++){
                            context_data_val = context_data_val << 1 | value & 1;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    context_dictionary[context_wc] = context_dictSize++;
                    context_w = String(context_c);
                }
            }
            if (context_w !== "") {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for(i = 0; i < context_numBits; i++){
                            context_data_val = context_data_val << 1;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                        }
                        value = context_w.charCodeAt(0);
                        for(i = 0; i < 8; i++){
                            context_data_val = context_data_val << 1 | value & 1;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for(i = 0; i < context_numBits; i++){
                            context_data_val = context_data_val << 1 | value;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for(i = 0; i < 16; i++){
                            context_data_val = context_data_val << 1 | value & 1;
                            if (context_data_position == bitsPerChar - 1) {
                                context_data_position = 0;
                                context_data.push(getCharFromInt(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for(i = 0; i < context_numBits; i++){
                        context_data_val = context_data_val << 1 | value & 1;
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
            }
            value = 2;
            for(i = 0; i < context_numBits; i++){
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }
            while(true){
                context_data_val = context_data_val << 1;
                if (context_data_position == bitsPerChar - 1) {
                    context_data.push(getCharFromInt(context_data_val));
                    break;
                } else context_data_position++;
            }
            return context_data.join('');
        },
        decompress: function(compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            return LZString._decompress(compressed.length, 32768, function(index) {
                return compressed.charCodeAt(index);
            });
        },
        _decompress: function(length, resetValue, getNextValue) {
            var dictionary = [], enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c, data = {
                val: getNextValue(0),
                position: resetValue,
                index: 1
            };
            for(i = 0; i < 3; i += 1){
                dictionary[i] = i;
            }
            bits = 0;
            maxpower = Math.pow(2, 2);
            power = 1;
            while(power != maxpower){
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            switch(bits){
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2, 8);
                    power = 1;
                    while(power != maxpower){
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2, 16);
                    power = 1;
                    while(power != maxpower){
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++);
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 2:
                    return "";
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while(true){
                if (data.index > length) {
                    return "";
                }
                bits = 0;
                maxpower = Math.pow(2, numBits);
                power = 1;
                while(power != maxpower){
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                switch(c = bits){
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while(power != maxpower){
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while(power != maxpower){
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++);
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 2:
                        return result.join('');
                }
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
                if (dictionary[c]) {
                    entry = dictionary[c];
                } else {
                    if (c === dictSize) {
                        entry = w + w.charAt(0);
                    } else {
                        return null;
                    }
                }
                result.push(entry);
                dictionary[dictSize++] = w + entry.charAt(0);
                enlargeIn--;
                w = entry;
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
            }
        }
    };
    return LZString;
}();
const lzstring = LZString;
function iterable(generator) {
    return (...args)=>{
        return {
            repeatable: true,
            [Symbol.iterator]: ()=>{
                return generator(...args);
            }
        };
    };
}
function getCategory(ch) {
    const mapper = {
        "|": "union-separator",
        "?": "optional",
        ".": "spread",
        "(": "group-start",
        ")": "group-end",
        "[": "list-start",
        "]": "list-end",
        ",": "list-separator",
        " ": "space",
        "\t": "space",
        "\r": "space",
        "\n": "space"
    };
    const cat = mapper[ch];
    if (cat !== undefined) {
        return cat;
    }
    return "identifier";
}
function tokens(text) {
    function* tokens_(text) {
        let index = 0;
        let category = "identifier";
        let token = [];
        const length = text.length;
        while(index < length){
            const ch = text[index];
            ++index;
            const cat = getCategory(ch);
            if (cat !== category || [
                "group-start",
                "group-end",
                "list-start",
                "list-end",
                "list-separator"
            ].includes(category)) {
                if (token.length > 0) {
                    yield {
                        category,
                        value: token.join("")
                    };
                }
                token = [
                    ch
                ];
                category = cat;
            } else {
                token.push(ch);
            }
        }
        if (token.length > 0) {
            yield {
                category,
                value: token.join("")
            };
        }
    }
    return iterable(tokens_)(text);
}
function parse(text) {
    let container = {
        items: []
    };
    let item = container;
    const stack = [
        container
    ];
    for (const token of tokens(text)){
        if (token.category === "space") {} else if (token.category === "group-start") {
            const newItem = {
                items: [],
                grouping: token.value
            };
            absorbSpread(newItem);
            container.items.push(newItem);
            container = newItem;
            item = container;
            stack.push(container);
        } else if (token.category === "group-end") {
            divideListUnion(container);
            stack.pop();
            item = container;
            container = stack[stack.length - 1];
        } else if (token.category === "list-start") {
            const newItem1 = {
                items: [],
                grouping: token.value
            };
            absorbSpread(newItem1);
            container.items.push(newItem1);
            container = newItem1;
            item = container;
            stack.push(container);
        } else if (token.category === "list-end") {
            divideListUnion(container);
            stack.pop();
            item = container;
            container = stack[stack.length - 1];
            if (item.items.length === 0) {
                const previous = container.items[container.items.length - 2];
                if (container.items[container.items.length - 1] === item && (previous?.identifier !== undefined || previous?.grouping !== undefined)) {
                    const newItem2 = {
                        grouping: "array",
                        item: previous,
                        spread: previous.spread
                    };
                    delete previous.spread;
                    container.items.pop();
                    container.items.pop();
                    container.items.push(newItem2);
                    item = newItem2;
                }
            }
        } else if (token.category === "list-separator") {
            container.list = true;
            const newItem3 = {
                separator: "list"
            };
            container.items.push(newItem3);
            item = newItem3;
        } else if (token.category === "union-separator") {
            container.union = true;
            const newItem4 = {
                separator: "union"
            };
            container.items.push(newItem4);
            item = newItem4;
        } else if (token.category === "spread") {
            const newItem5 = {
                isSpread: true
            };
            container.items.push(newItem5);
            item = newItem5;
        } else if (token.category === "optional") {
            item.optional = true;
        } else if (token.category === "identifier") {
            const newItem6 = {
                identifier: token.value
            };
            absorbSpread(newItem6);
            container.items.push(newItem6);
            item = newItem6;
        }
    }
    divideListUnion(container);
    return stack[0];
    function absorbSpread(newItem) {
        const previous = container.items[container.items.length - 1];
        if (previous?.isSpread) {
            container.items.pop();
            newItem.spread = true;
        }
    }
    function divideListUnion(item) {
        if (item.list && item.union) {
            let currentListItem = [];
            const subitems = [];
            for (const subitem of item.items){
                if (subitem.separator === "list") {
                    groupify(currentListItem, subitems);
                    currentListItem = [];
                    subitems.push(subitem);
                } else {
                    currentListItem.push(subitem);
                }
            }
            groupify(currentListItem, subitems);
            delete item.union;
            item.items = subitems;
        }
        function groupify(currentListItem, subitems) {
            if (currentListItem.length > 1) {
                subitems.push({
                    items: currentListItem,
                    union: currentListItem.find((o)=>o.separator === "union") !== undefined
                });
            } else if (currentListItem.length === 1) {
                subitems.push(currentListItem[0]);
            }
        }
    }
}
function toType(o) {
    let type = {
        kind: o.identifier
    };
    if (o.grouping === "array") {
        type = {
            kind: "array",
            member: toType(o.item)
        };
    } else if (o.list || o.grouping === "[") {
        type = {
            kind: "tuple",
            members: o.items.filter((i)=>i.separator === undefined).map((i)=>toType(i))
        };
    } else if (o.union) {
        type = {
            kind: "union",
            members: o.items.filter((i)=>i.separator === undefined).map((i)=>toType(i))
        };
    } else if (o.grouping === "(") {
        return toType(o.items[0]);
    }
    if (o.optional) {
        type.optional = o.optional;
    }
    if (o.spread) {
        type.spread = o.spread;
    }
    return type;
}
function toTuple(text) {
    const o = parse(text);
    let type = toType(o.items[0]);
    if (type.kind !== "tuple") {
        type = {
            kind: "tuple",
            members: [
                type
            ]
        };
    }
    return type;
}
function toCall(args, parameters) {
    const a = toTuple(args);
    const p = toTuple(parameters);
    let restParameter = undefined;
    const last = p.members[p.members.length - 1];
    if (last !== undefined && last.kind === "array" && last.spread) {
        restParameter = last;
        p.members.pop();
    }
    const firstOptional = p.members.findIndex((m)=>m.optional);
    const fn = {
        parameters: p.members,
        requiredParameters: firstOptional >= 0 ? firstOptional : p.members.length,
        restParameter
    };
    const call = {
        function: fn,
        arguments: a.members.map((a)=>a.spread ? {
                kind: "spread",
                type: a
            } : {
                kind: "basic",
                type: a
            })
    };
    return call;
}
function toTypeScriptType(type) {
    if (type.kind === "array") {
        return toTypeScriptType(type.member) + "[]";
    }
    if (type.kind === "union") {
        return "(" + type.members.map((m)=>toTypeScriptType(m)).join(" | ") + ")";
    }
    if (type.kind === "tuple") {
        return "[" + type.members.map((m)=>toTypeScriptType(m)).join(", ") + "]";
    }
    return type.kind;
}
function toTypeScriptCall(call) {
    const fn = call.function;
    const code = [];
    code.push(`declare function fn(`);
    for (const [index, parameter] of fn.parameters.entries()){
        const separator = index == 0 ? "" : ", ";
        const type = toTypeScriptType(parameter);
        const optional = index >= fn.requiredParameters ? "?" : "";
        code.push(`${separator}p${index}${optional}: ${type}`);
    }
    if (fn.restParameter !== undefined) {
        const parameter1 = fn.restParameter;
        const separator1 = fn.parameters.length === 0 ? "" : ", ";
        const type1 = toTypeScriptType(parameter1);
        code.push(`${separator1}...rest: ${type1}`);
    }
    code.push(`) : void;`);
    code.push("\n\n");
    for (const [index1, argument] of call.arguments.entries()){
        const type2 = toTypeScriptType(argument.type);
        code.push(`declare const a${index1} : ${type2};\n`);
    }
    code.push("\n");
    code.push(`fn(`);
    for (const [index2, argument1] of call.arguments.entries()){
        const separator2 = index2 == 0 ? "" : ", ";
        code.push(separator2);
        if (argument1.kind === "spread") {
            code.push("...");
        }
        code.push(`a${index2}`);
    }
    code.push(`);`);
    return code.join("");
}
function toPlaygroundURL(code) {
    const url = new URL("https://www.typescriptlang.org/play?ts=4.7.4");
    const hash = `#code/${lzstring.compressToEncodedURIComponent(code)}`;
    url.hash = hash;
    return url;
}
function isArgumentTypeCompatible(arg, param) {
    return arg.kind === param.kind || param.kind === "union" && param.members.find((m)=>m.kind === arg.kind) !== undefined;
}
function typeCheckCall(call) {
    const fn = call.function;
    const params = fn.parameters;
    const restParam = fn.restParameter;
    const args = call.arguments;
    let index = 0;
    let ambiguity = false;
    function checkArg(arg) {
        const param = params[index] ?? restParam?.member;
        if (!isArgumentTypeCompatible(arg.type, param)) {
            const paramDescription = index < params.length ? `parameter ${index}` : `rest parameter`;
            throw `Incompatible types in ${paramDescription}: ${arg.type.kind} is not ${param.kind}`;
        }
    }
    function spread(arg) {
        if (![
            "tuple",
            "array",
            "iterable"
        ].includes(arg.kind)) {
            throw `Not spreadable: ${arg.kind} is not tuple, array, or iterable`;
        }
        if (arg.kind === "tuple") {
            return arg.members.map((member)=>({
                    kind: "basic",
                    type: member
                }));
        }
        if (arg.kind === "array" || arg.kind === "iterable") {
            const remainingParameters = fn.parameters.length - index;
            let length = remainingParameters + 1;
            if (arg.length !== undefined) {
                length = Math.min(length, arg.length);
            }
            return [
                ...Array(remainingParameters + 1).keys()
            ].map((n)=>({
                    kind: "basic",
                    type: arg.member
                }));
        }
        return [
            {
                kind: "basic",
                type: arg
            }
        ];
    }
    function check(args) {
        for (const arg of args){
            if (ambiguity) {
                throw "Ambiguous spread - uncertain argument-parameter relationship (opt)";
            }
            if (index > params.length) {
                throw "ERROR IN ALGORITHM";
            }
            if (index === params.length) {
                if (restParam === undefined) {
                    throw "excess arguments";
                }
            }
            if (arg.kind === "spread") {
                const members = arg.type.kind === "union" ? arg.type.members : [
                    arg.type
                ];
                let startIndex = index;
                let floatingIndex = undefined;
                for (const member of members){
                    index = startIndex;
                    const spreadArgs = spread(member);
                    check(spreadArgs);
                    if (floatingIndex === undefined) {
                        floatingIndex = index;
                    } else if (floatingIndex !== index) {
                        floatingIndex = Math.min(index, floatingIndex);
                        if (floatingIndex < fn.requiredParameters) {
                            throw "Ambiguous spread - uncertain argument-parameter relationship (req)";
                        }
                        ambiguity = true;
                    }
                }
                index = floatingIndex ?? index;
            } else {
                checkArg(arg);
                if (index < params.length) {
                    ++index;
                }
            }
        }
    }
    check(args);
    if (index < fn.requiredParameters) {
        throw "too few arguments";
    }
}
const argsElement = document.querySelector(".arguments");
const paramsElement = document.querySelector(".parameters");
const resultElement = document.querySelector(".result");
const errorsElement = document.querySelector(".errors");
const playgroundLinkElement = document.querySelector(".playground");
function update() {
    resultElement.innerText = "";
    playgroundLinkElement.href = "#";
    const args = argsElement.value;
    const params = paramsElement.value;
    const call = toCall(args, params);
    const code = toTypeScriptCall(call);
    resultElement.innerText = code;
    playgroundLinkElement.href = toPlaygroundURL(code).toString();
    try {
        typeCheckCall(call);
        errorsElement.innerText = "No error";
    } catch (e) {
        errorsElement.innerText = e;
    }
}
argsElement.onchange = ()=>{
    update();
};
paramsElement.onchange = ()=>{
    update();
};
