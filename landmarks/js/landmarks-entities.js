// A decoder for HTML5 character entities and named entities
import { getEntity } from "./entities.js";
import { UTF8String, u8 } from "./landmarks-utf8.js";
const byte_0 = u8("0")[0];
const byte_9 = u8("9")[0];
const byte_A = u8("A")[0];
const byte_F = u8("F")[0];
const byte_Z = u8("Z")[0];
const byte_a = u8("a")[0];
const byte_f = u8("f")[0];
const byte_z = u8("z")[0];
const spaces = u8(" \t\n\f\r");
function isAlphaNumeric(ch) {
    if (byte_a <= ch && ch <= byte_z) {
        return true;
    }
    if (byte_A <= ch && ch <= byte_Z) {
        return true;
    }
    if (byte_0 <= ch && ch <= byte_9) {
        return true;
    }
    return false;
}
function HexDigitToNumber(ch) {
    if (byte_0 <= ch && ch <= byte_9) {
        return ch - byte_0;
    }
    if (byte_A <= ch && ch <= byte_F) {
        return ch - byte_A + 10;
    }
    if (byte_a <= ch && ch <= byte_f) {
        return ch - byte_a + 10;
    }
    return -1;
}
function DecimalDigitToNumber(ch) {
    if (byte_0 <= ch && ch <= byte_9) {
        return ch - byte_0;
    }
    return -1;
}
const lt = new UTF8String("&lt;");
const gt = new UTF8String("&gt;");
const amp = new UTF8String("&amp;");
const byte_lt = "<".charCodeAt(0);
const byte_gt = ">".charCodeAt(0);
const byte_amp = "&".charCodeAt(0);
const byte_hash = "#".charCodeAt(0);
const byte_semi = ";".charCodeAt(0);
const byte_x = "x".charCodeAt(0);
const byte_X = "X".charCodeAt(0);
class EntityEncoder {
    constructor(capacity) {
        this.text = new UTF8String(capacity);
    }
    push_back(ch) {
        const text = this.text;
        switch (ch) {
            case byte_lt:
                text.append(lt);
                break;
            case byte_gt:
                text.append(gt);
                break;
            case byte_amp:
                text.append(amp);
                break;
            default:
                text.appendBytes([ch]);
        }
    }
    appendBytes(data) {
        for (const ch of data) {
            this.push_back(ch);
        }
        return this;
    }
    appendString(text) {
        const data = new TextEncoder().encode(text);
        return this.appendBytes(data);
    }
    append(text) {
        const data = text.value;
        return this.appendBytes(data);
    }
}
export function encodeEntities(text) {
    const encoder = new EntityEncoder(text.length);
    encoder.appendString(text);
    return encoder.text.toString();
}
const entityMaximumLength = 48; // TODO
/*
 // FROM: http://www.unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WindowsBestFit/bestfit1252.txt
 0x80	0x20ac	;Euro Sign
 0x81	0x0081
 0x82	0x201a	;Single Low-9 Quotation Mark
 0x83	0x0192	;Latin Small Letter F With Hook
 0x84	0x201e	;Double Low-9 Quotation Mark
 0x85	0x2026	;Horizontal Ellipsis
 0x86	0x2020	;Dagger
 0x87	0x2021	;Double Dagger
 0x88	0x02c6	;Modifier Letter Circumflex Accent
 0x89	0x2030	;Per Mille Sign
 0x8a	0x0160	;Latin Capital Letter S With Caron
 0x8b	0x2039	;Single Left-Pointing Angle Quotation Mark
 0x8c	0x0152	;Latin Capital Ligature Oe
 0x8d	0x008d
 0x8e	0x017d	;Latin Capital Letter Z With Caron
 0x8f	0x008f
 0x90	0x0090
 0x91	0x2018	;Left Single Quotation Mark
 0x92	0x2019	;Right Single Quotation Mark
 0x93	0x201c	;Left Double Quotation Mark
 0x94	0x201d	;Right Double Quotation Mark
 0x95	0x2022	;Bullet
 0x96	0x2013	;En Dash
 0x97	0x2014	;Em Dash
 0x98	0x02dc	;Small Tilde
 0x99	0x2122	;Trade Mark Sign
 0x9a	0x0161	;Latin Small Letter S With Caron
 0x9b	0x203a	;Single Right-Pointing Angle Quotation Mark
 0x9c	0x0153	;Latin Small Ligature Oe
 0x9d	0x009d
 0x9e	0x017e	;Latin Small Letter Z With Caron
 0x9f	0x0178	;Latin Capital Letter Y With Diaeresis
 */
const compatabilityCP1252 = [
    0x20ac,
    0x0081,
    0x201a,
    0x0192,
    0x201e,
    0x2026,
    0x2020,
    0x2021,
    0x02c6,
    0x2030,
    0x0160,
    0x2039,
    0x0152,
    0x008d,
    0x017d,
    0x008f,
    0x0090,
    0x2018,
    0x2019,
    0x201c,
    0x201d,
    0x2022,
    0x2013,
    0x2014,
    0x02dc,
    0x2122,
    0x0161,
    0x203a,
    0x0153,
    0x009d,
    0x017e,
    0x0178,
];
var EPState;
(function (EPState) {
    EPState[EPState["start"] = 0] = "start";
    EPState[EPState["possible"] = 1] = "possible";
    EPState[EPState["named"] = 2] = "named";
    EPState[EPState["numeric"] = 3] = "numeric";
    EPState[EPState["hex"] = 4] = "hex";
    EPState[EPState["decimal"] = 5] = "decimal";
})(EPState || (EPState = {}));
;
export function* decodeEntitiesU8(data) {
    const checkNamesWithoutSemicolon = true;
    const last = data.length - 1;
    let pos = 0;
    let state = EPState.start;
    let first = pos;
    let unicode_character = 0;
    let high_first = 0;
    let high_last = 0;
    let high_surrogate = 0;
    function handleNumeric() {
        // Control characters are mapped to useful characters from CP1252
        if (0x80 <= unicode_character && unicode_character <= 0x9f) {
            const index = unicode_character - 0x80;
            unicode_character = compatabilityCP1252[index];
        }
        if (0xD800 <= unicode_character && unicode_character <= 0xDBFF) { // High surrogate
            // A high surrogate will remain encoded unless immediately followed by a low surrogate
            high_surrogate = unicode_character;
            high_first = first;
            high_last = pos;
        }
        else if (0xDC00 <= unicode_character && unicode_character <= 0xDFFF) { // Low surrogate
            // A low surrogate will remain encoded unless immediately preceded by a high surrogate
            if (high_first && (first == high_last + 1)) {
                // http://unicode.org/faq/utf_bom.html#utf16-4
                const SURROGATE_OFFSET = 0x10000 - (0xD800 << 10) - 0xDC00;
                const codepoint = (high_surrogate << 10) + unicode_character + SURROGATE_OFFSET;
                return codepoint;
            }
        }
        else {
            return unicode_character;
        }
        return undefined;
    }
    while (pos < data.length) {
        const character = data[pos];
        switch (state) {
            case EPState.start: {
                if (character === byte_amp) {
                    if (pos > first) {
                        yield new UTF8String(data.subarray(first, pos));
                    }
                    first = pos;
                    state = EPState.possible;
                }
                break;
            }
            case EPState.possible: {
                if (character === byte_hash) {
                    state = EPState.numeric;
                    unicode_character = 0;
                }
                else {
                    state = EPState.named;
                }
                break;
            }
            case EPState.numeric: {
                if (character === byte_x || character == byte_X) {
                    state = EPState.hex;
                }
                else {
                    state = EPState.decimal;
                    const digit = DecimalDigitToNumber(character);
                    if (digit < 0) {
                        state = EPState.start;
                    }
                    else {
                        unicode_character *= 10;
                        unicode_character += digit;
                    }
                }
                break;
            }
            case EPState.hex: {
                if (character === byte_semi) {
                    let entity = handleNumeric();
                    if (entity !== undefined) {
                        yield new UTF8String(String.fromCodePoint(entity));
                        first = pos + 1;
                    }
                    state = EPState.start;
                    break;
                }
                if (pos - first > 8) {
                    state = EPState.start;
                    break;
                }
                const digit = HexDigitToNumber(character);
                if (digit < 0) {
                    state = EPState.start;
                }
                else {
                    unicode_character *= 16;
                    unicode_character += digit;
                }
                break;
            }
            case EPState.decimal: {
                if (character === byte_semi) {
                    let entity = handleNumeric();
                    if (entity !== undefined) {
                        yield new UTF8String(String.fromCodePoint(entity));
                        first = pos + 1;
                    }
                    state = EPState.start;
                    break;
                }
                if (pos - first > 10) {
                    state = EPState.start;
                    break;
                }
                const digit = DecimalDigitToNumber(character);
                if (digit < 0) {
                    state = EPState.start;
                }
                else {
                    unicode_character *= 10;
                    unicode_character += digit;
                }
                break;
            }
            case EPState.named: {
                if (checkNamesWithoutSemicolon || character === byte_semi) {
                    const name = new UTF8String(data.subarray(first, pos + 1));
                    const entity = getEntity(name.toString()); // TODO avoid conversions
                    if (entity !== undefined) {
                        const next = data[pos + 1];
                        if (next === byte_semi) {
                            ++pos;
                        }
                        yield new UTF8String(entity.characters);
                        first = pos + 1;
                        state = EPState.start;
                        break;
                    }
                }
                if (!isAlphaNumeric(character)) {
                    state = EPState.start;
                    break;
                }
                if (pos - first > entityMaximumLength) {
                    state = EPState.start;
                    break;
                }
                break;
            }
            default: {
                break;
            }
        }
        ++pos;
    }
    if (pos > first) {
        yield new UTF8String(data.subarray(first, pos));
    }
}
export function decodeEntities(text) {
    const input = new UTF8String(text);
    const result = new UTF8String(input.length);
    for (const piece of decodeEntitiesU8(input.value)) {
        result.append(piece);
    }
    return result.toString();
}
var NWState;
(function (NWState) {
    NWState[NWState["start"] = 0] = "start";
    NWState[NWState["startPiece"] = 1] = "startPiece";
    NWState[NWState["initialWhitespace"] = 2] = "initialWhitespace";
    NWState[NWState["interiorWhitespace"] = 3] = "interiorWhitespace";
    NWState[NWState["content"] = 4] = "content";
})(NWState || (NWState = {}));
;
function* normalizeWhitespace(pieces) {
    const space = u8(" ");
    let state = NWState.start;
    let first = 0;
    for (const piece of pieces) {
        let pos = 0;
        while (pos < piece.length) {
            const character = piece[pos];
            switch (state) {
                case NWState.start:
                    if (spaces.includes(character)) {
                        first = pos + 1;
                    }
                    else {
                        first = pos;
                        state = NWState.content;
                    }
                    break;
                case NWState.startPiece:
                    if (spaces.includes(character)) {
                        first = pos;
                        state = NWState.interiorWhitespace;
                    }
                    else {
                        first = pos;
                        state = NWState.content;
                    }
                    break;
                case NWState.content:
                    if (spaces.includes(character)) {
                        yield piece.subarray(first, pos);
                        first = pos;
                        state = NWState.interiorWhitespace;
                    }
                    break;
                case NWState.interiorWhitespace:
                    if (!spaces.includes(character)) {
                        yield space;
                        first = pos;
                        state = NWState.content;
                    }
                    break;
            }
            ++pos;
        } // while
        switch (state) {
            case NWState.content:
                yield piece.subarray(first, pos);
                state = NWState.startPiece;
                break;
        }
    } // for
}
// export function decodeEntities(text: string): string {
//     const input = new UTF8String(text);
//     const result = new UTF8String(input.length);
//     for (const piece of decodeEntitiesU8(input.value)) {
//         result.append(piece);
//     }
//     return result.toString();
// }
//# sourceMappingURL=landmarks-entities.js.map