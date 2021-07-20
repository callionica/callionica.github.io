// plotter.js parses plotter files

// @ts-check
// deno-lint-ignore-file

export const TEXT_PROPERTIES = ["title", "content", "note"];

/**
 * Numeric-aware, case-insensitive text comparison for English
 * @param {string} a 
 * @param {string} b 
 */
function compare(a, b) {
    return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

/**
 * A mutable token
 *    @typedef {{
 *        type: string,
 *        start: number,
 *        end: number,
 *    }} TokenMutable
 */

/**
 * A mutable token within a tree
 *    @typedef {{
 *        type: string,
 *        start: number,
 *        end: number,
 *        children: TokenNode[]
 *    }} TokenNode
 */

/** A read-only token */
class TokenReadOnly {

    get type() {
        return "token";
    }

    get start() {
        return 0;
    }

    get end() {
        return 0;
    }

    /**
     * Returns a mutable TokenNode
     * based on this token with an empty children array
     * @returns { TokenNode }
     */
    node() {
        return { type: this.type, start: this.start, end: this.end, children: [] };
    }
}

/**
 * 
 * @param {string} text 
 */
export function truncate(text, length = 48) {
    text = text.trim();
    if (text.length > length) {
        return text.substring(0, length - 3) + "...";
    }
    return text;
}

/**
 * 
 * @param {string} text 
 * @param {string} prefix 
 */
export function removePrefix(text, prefix) {
    if (text.startsWith(prefix)) {
        return text.substring(prefix.length);
    }
    return text;
}

// Basic parsing functions
/**
 * 
 * @param { string } text 
 * @param { { includes(item: string): boolean } } characters 
 * @param { { start: number, end: number} } [range] 
 */
function findFirstOf(text, characters, range = { start: 0, end: text.length }) {
    const start = range.start ?? 0;
    const end = range.end ?? text.length;
    for (let index = start ?? 0; index < end; ++index) {
        const character = text[index];
        if (characters.includes(character)) {
            return index;
        }
    }
    return undefined;
}

/**
 * 
 * @param { string } text 
 * @param { { includes(item: string): boolean } } characters 
 * @param { { start: number, end: number } } [range]
 */
function findFirstNotOf(text, characters, range = { start: 0, end: text.length }) {
    const start = range.start ?? 0;
    const end = range.end ?? text.length;
    for (let index = start; index < end; ++index) {
        const character = text[index];
        if (!characters.includes(character)) {
            return index;
        }
    }
    return undefined;
}

/**
 * 
 * @param { string } text 
 * @param { { includes(item: string): boolean } } characters 
 * @param { { start: number, end: number} } [range] 
 */
// @ts-ignore
function _findLastOf(text, characters, range = { start: 0, end: text.length }) {
    const start = range.start ?? 0;
    const end = range.end ?? text.length;
    for (let index = end - 1; index >= start; --index) {
        const character = text[index];
        if (characters.includes(character)) {
            return index;
        }
    }
    return undefined;
}

/**
 * 
 * @param { string } text 
 * @param { { includes(item: string): boolean } } characters 
 * @param { { start: number, end: number} } [range] 
 */
function findLastNotOf(text, characters, range = { start: 0, end: text.length }) {
    const start = range.start ?? 0;
    const end = range.end ?? text.length;
    for (let index = end - 1; index >= start; --index) {
        const character = text[index];
        if (!characters.includes(character)) {
            return index;
        }
    }
    return undefined;
}

// Token parsing
/**
 * Divides the range into tokens including whitespace prefix
 * and suffix tokens (if whitespace is present at the edges) and an instance
 * of the token class provided (if the entire range is not whitespace).
 * @param { string } line 
 * @param { { start: number, end: number } } range 
 * @param { typeof Token } tokenClass 
 * @returns { Token[] }
 */
function trimmedToken(line, range, tokenClass) {
    const result = [];
    const rng = { ...range };

    const ws = whitespace(line, rng);
    if (ws !== undefined) {
        result.push(ws);
        rng.start = ws.end;
    }

    if (rng.end <= rng.start) {
        return result;
    }

    // Cannot be undefined because we've eliminated empty string and purely whitespace strings
    const end = /** @type { number } */ (findLastNotOf(line, Constants.spaces, rng)) + 1;
    if (end !== rng.end) {
        result.push(new tokenClass(rng.start, end));
        result.push(new WhitespaceToken(end, rng.end));
    } else {
        result.push(new tokenClass(rng.start, rng.end));
    }
    return result;
}

/**
 * Returns a whitespace token representing the start of the 
 * range that is whitespace or undefined if the range doesn't
 * start with whitespace.
 * @param { string } line 
 * @param { { start: number, end: number } } range 
 * @returns { WhitespaceToken | undefined }
 */
function whitespace(line, range) {
    if (range.end <= range.start) {
        return undefined;
    }

    const end = findFirstNotOf(line, Constants.spaces, range);

    if (end === undefined) {
        return new WhitespaceToken(range.start, range.end);
    }

    if (end !== range.start) {
        return new WhitespaceToken(range.start, end);
    }
}

/**
 * Parses a range into tokens
 * @param { string } line
 * @param { { start: number, end: number} } range
 * @param { string } separators
 * @param { typeof Token } tokenClass
 */
function tokenList(line, range, separators, tokenClass, separatorTokenClass = SeparatorToken) {
    /** @type { Token[] } */
    const result = [];
    const end = range.end;
    let start = range.start;
    while (start < end) {
        const separatorStart = findFirstOf(line, separators, { start, end });
        const item = { start, end: separatorStart ?? end };
        result.push(...trimmedToken(line, item, tokenClass));

        if (separatorStart === undefined) {
            break;
        }

        const separatorToken = new separatorTokenClass(separatorStart, separatorStart + 1);
        result.push(separatorToken);
        start = separatorToken.end;
    }

    return result;
}

// Basic parsing elements
export const Constants = {
    maximumPropertyLength: 32,
    spaces: " \t\n\f\r",
    connectors: ["|", "/", "\\", "."],
    propertySeparator: ":",
    valueSeparator: ",",
    relationSeparator: ":",
    hierarchySeparator: ".",
};

// Tokens
export class Token extends TokenReadOnly {
    /**
     * 
     * @param {number} start 
     * @param {number} end 
     */
    constructor(start, end) {
        super();
        this.start_ = start;
        this.end_ = end;
    }

    get start() {
        return this.start_;
    }

    get end() {
        return this.end_;
    }

    /**
     * @param {string} line 
     */
    text(line) {
        return line.substring(this.start, this.end);
    }

    /**
     * Returns the child tokens of this token
     * @param {string} line 
     * @returns { Token[] }
     */
    tokens(line) {
        return [];
    }

    /**
     * Returns a flat list of all tokens
     * @param {string} line 
     * @returns { Token[] }
     */
    flatTokens(line) {
        return [this, ...this.tokens(line).flatMap(token => token.flatTokens(line))];
    }

    /**
     * Returns a flat list of only the deepest tokens
     * @param {string} line 
     * @returns { Token[] }
     */
    deepTokens(line) {
        const tokens = this.tokens(line);
        if (tokens.length === 0) {
            return [this];
        }

        return tokens.flatMap(token => token.deepTokens(line));
    }

    /**
     * Returns a tree structure of tokens (without whitespace)
     * @param { string } line 
     * @param { TokenNode | undefined } parent 
     * @returns { TokenNode }
     */
    tree(line, parent) {
        const self = this.node();
        if (parent !== undefined) {
            parent.children.push(self);
        }

        for (const token of this.tokens(line)) {
            if (token.type !== "whitespace") {
                token.tree(line, self);
            }
        }

        return self;
    }

    /**
     * @param {number} index 
     */
    isNear(index) {
        return ((this.start - 1) <= index) && (index <= this.end);
    }
}

class ConnectorToken extends Token {
    get type() {
        return "connector";
    }
}

class WhitespaceToken extends Token {
    get type() {
        return "whitespace";
    }
}

class NameToken extends Token {
    get type() {
        return "name";
    }

    /**
     * @param {string} line
     */
    tokens(line) {
        // NameToken won't be created with empty ranges or lines that consist of only ssss
        const end = /** @type { number } */ (findLastNotOf(line, ["s", "S"], this)) + 1;
        if (end !== this.end) {
            return [new NameCoreToken(this.start, end), new NameSuffixToken(end, this.end)];
        }
        return [new NameCoreToken(this.start, this.end)];
    }

    /**
     * @param { string } line 
     * @returns { NameCoreToken | undefined }
     */
    nameCoreToken(line) {
        const tokens = this.tokens(line);
        const nameToken = /** @type { NameCoreToken | undefined } */ (tokens.find(token => token instanceof NameCoreToken));
        return nameToken;
    }

    /**
     * @param { string } line 
     * @returns { string | undefined }
     */
    id(line) {
        const token = this.nameCoreToken(line);
        return token?.id(line);
    }
}

class NameCoreToken extends Token {
    get type() {
        return "name"; // same as NameToken
    }

    /**
     * 
     * @param { string } line 
     */
    id(line) {
        return this.text(line).toLowerCase();
    }
}

class NameSuffixToken extends Token {
    get type() {
        return "name_suffix";
    }
}

class SeparatorToken extends Token {
    get type() {
        return "separator";
    }
}

class HierarchySeparatorToken extends SeparatorToken {
    get type() {
        return "separator_hierarchy";
    }
}

export class ValuesToken extends Token {
    get type() {
        return "values";
    }

    /**
     * @param { string } line 
     */
    tokens(line) {
        return tokenList(line, this, Constants.valueSeparator, ValueToken);
    }
}

export class RelationToken extends Token {
    get type() {
        return "relation";
    }

    /**
     * Returns the ID of the relation
     * @param { string } line 
     */
    id(line) {
        return this.text(line).toLowerCase();
    }
}

export class TargetToken extends Token {
    get type() {
        return "target";
    }

    /**
     * Returns the ID of the target item
     * @param { string } line 
     */
    id(line) {
        return this.text(line).toLowerCase();
    }
}

export class HierarchyToken extends Token {
    get type() {
        return "hierarchy";
    }
}

export class ValueToken extends Token {
    get type() {
        return "value";
    }

    /**
     * @param { string } line 
     */
    isReference(line) {
        return findFirstOf(line, Constants.relationSeparator, { start: this.start, end: this.end }) !== undefined;
    }

    /**
     * @param { string } line 
     * @returns { "reference" | "hierarchy" }
     */
    valueType(line) {
        return this.isReference(line) ? "reference" : "hierarchy";
    }

    /**
     * @param { string } line 
     */
    tokens(line) {
        const result = [];
        const end = this.end;
        const start = this.start;

        const colon = findFirstOf(line, Constants.relationSeparator, { start, end });
        if (colon !== undefined) {
            const relation = { start, end: colon };
            const target = { start: colon + 1, end };
            result.push(...trimmedToken(line, relation, RelationToken));
            result.push(new SeparatorToken(colon, colon + 1));
            result.push(...trimmedToken(line, target, TargetToken));
        } else {
            return tokenList(line, this, Constants.hierarchySeparator, HierarchyToken, HierarchySeparatorToken);
        }

        return result;
    }
}

export class TextValueToken extends Token {
    get type() {
        return "text";
    }
}

export class Line extends TokenReadOnly {
    /**
     * @param { string } text 
     */
    constructor(text) {
        super();
        this.text = text;
    }

    get type() {
        return "line";
    }

    get start() {
        return 0;
    }

    get end() {
        return this.text.length;
    }

    // Returns "whitespace", "property", or "content".
    //
    // This is not the true answer because it is line-local.
    // To know whether a line is a property or not, we need to
    // know about previous lines.
    category() {
        const line = this.text;

        if (line.length === 0) {
            return "whitespace"; // Zero length
        }

        const end = line.length;
        let start = 0;

        // Move past whitespace
        const ws = whitespace(line, { start, end });
        if (ws !== undefined) {
            start = ws.end;
        }

        if (start >= end) {
            return "whitespace"; // Only whitespace
        }

        const colon = findFirstOf(line, Constants.propertySeparator, { start, end: start + Constants.maximumPropertyLength });
        if (colon !== undefined && colon > start) {
            return "property"; // Colon early and not first character
        }

        return "content"; // Content is the default
    }

    /**
     * Returns the top level of tokens
     * @returns { Token[] }
     */
    tokens() {
        /** @type { Token[] } */
        const result = [];

        const line = this.text;

        if (line.length === 0) {
            return result;
        }

        const end = line.length;
        let start = 0;

        // Move past whitespace as a separate step because we need the true start for some logic
        const ws = whitespace(line, { start, end });
        if (ws !== undefined) {
            result.push(ws);
            start = ws.end;
        }

        if (start >= end) {
            return result;
        }

        const connector = findFirstOf(line, Constants.connectors, { start, end: start + 1 });
        if (connector !== undefined) {
            let s = connector + 1;
            const ws1 = whitespace(line, { start: s, end });
            if (ws1 !== undefined) {
                s = ws1.end;
            }

            if (s === end) {
                result.push(new ConnectorToken(connector, connector + 1));
                if (ws1 !== undefined) {
                    result.push(ws1);
                }
                return result;
            }
        }

        // Constrain the range in which we look for the colon
        const colon = findFirstOf(line, Constants.propertySeparator, { start, end: start + Constants.maximumPropertyLength });
        if (colon === undefined) {
            result.push(new Token(start, end));
            return result;
        }

        const name = { start, end: colon };
        const separator = { start: name.end, end: name.end + 1 };
        const values = { start: separator.end, end };

        result.push(...trimmedToken(line, name, NameToken));
        result.push(new SeparatorToken(separator.start, separator.end));
        result.push(...trimmedToken(line, values, ValuesToken));

        const nameToken = result.find(token => token instanceof NameToken);
        const valuesTokenIndex = result.findIndex(token => token instanceof ValuesToken);
        const valuesToken = result[valuesTokenIndex];
        if (nameToken !== undefined && valuesToken !== undefined) {
            const deepTokens = nameToken.deepTokens(line);
            const coreToken = /** @type { NameCoreToken } */ (deepTokens.find(token => token instanceof NameCoreToken));
            if (TEXT_PROPERTIES.includes(coreToken.id(line))) {
                result[valuesTokenIndex] = new TextValueToken(valuesToken.start, valuesToken.end);
            }
        }

        return result;
    }

    // Returns all tokens
    flatTokens() {
        return this.tokens().flatMap(token => token.flatTokens(this.text));
    }

    // Returns the bottom level of tokens
    deepTokens() {
        return this.tokens().flatMap(token => token.deepTokens(this.text));
    }

    /**
     * @returns { TokenNode }
     */
    tree() {
        const self = this.node();
        for (const token of this.tokens()) {
            if (token.type !== "whitespace") {
                token.tree(this.text, self);
            }
        }
        return self;
    }

    /**
     * 
     * @param { number } index 
     */
    definable(index) {
        const line = this.text;

        const tokens = this.tokens();
        const valuesToken = tokens.find(token => token instanceof ValuesToken);
        if ((valuesToken === undefined) || !valuesToken.isNear(index)) {
            return;
        }

        const valueTokens = valuesToken.tokens(line);
        const valueToken = valueTokens.find(token => token.isNear(index));
        if (valueToken === undefined) {
            return;
        }

        const targetToken = valueToken.tokens(line).find(t => t instanceof TargetToken);
        if (targetToken !== undefined) {
            const value = targetToken.text(line);
            return { property: "id", value };
        }

        const property = this.id();
        if (property !== undefined) {
            const value = valueToken.text(line);
            return { property, value };
        }

        // const nameToken = tokens.find(token => token instanceof NameToken);
        // if (nameToken !== undefined) {
        //     const property = nameToken.id(line);
        //     const value = valueToken.text(line);
        //     return { property, value };
        // }
    }

    id() {
        const line = this.text;
        const tokens = this.tokens();
        /** @type { NameToken | undefined } */
        // @ts-ignore It's a NameToken
        const nameToken = tokens.find(token => token instanceof NameToken);
        if (nameToken !== undefined) {
            return nameToken.id(line);
        }
    }

    /**
     * Return all the target tokens
     * @param { string | undefined } [value]
     * @returns { TargetToken[] }
     */
    targetTokens(value) {
        const line = this.text;
        const result = /** @type { TargetToken[] } */ (this.flatTokens().filter(token => token instanceof TargetToken));
        if (value !== undefined) {
            return result.filter(token => compare(token.text(line), value) === 0);
        }
        return result;
    }

    /**
     * Return all the value tokens
     * @param { string | undefined } [value]
     * @returns { ValueToken[] }
     */
    valueTokens(value) {
        const line = this.text;
        const result = /** @type { ValueToken[] } */ (this.flatTokens().filter(token => token instanceof ValueToken));
        if (value !== undefined) {
            return result.filter(token => compare(token.text(line), value) === 0);
        }
        return result;
    }

    /**
     * Return all the reference tokens
     * @returns { ValueToken[] }
     */
    referenceTokens() {
        return this.valueTokens().filter(token => token.isReference(this.text));
    }

    /**
     * Return all the hierarchy tokens
     * @returns { ValueToken[] }
     */
    hierarchyTokens() {
        return this.valueTokens().filter(token => !token.isReference(this.text));
    }

    /**
     * 
     * @param {{property: string, value: string}} param0 
     */
    findValue({ property, value }) {
        if (this.id() === property) {
            const line = this.text;
            const tokens = this.tokens();
            const valuesToken = tokens.find(token => token instanceof ValuesToken);
            if (valuesToken !== undefined) {
                const valueToken = /** @type { ValueToken } */ (valuesToken.tokens(line).find(token => (token instanceof ValueToken) && (compare(token.text(line), value) === 0)));
                return valueToken;
            }
        }
    }

    firstValue() {
        const name = this.id();
        if (name !== undefined) {
            const line = this.text;
            const tokens = this.tokens();
            // console.log(name);
            const valuesToken = tokens.find(token => token instanceof ValuesToken);
            if (valuesToken !== undefined) {
                // console.log(valuesToken);
                const valueToken = valuesToken.tokens(line).find(token => (token instanceof ValueToken) && !token.isReference(line));
                // console.log("vt", valueToken);
                const value = valueToken?.text(line);
                if (value !== undefined) {
                    return { name, value, token: valueToken };
                }
            }

            const textValueToken = tokens.find(token => token instanceof TextValueToken);
            if (textValueToken !== undefined) {
                const value = textValueToken.text(line);
                return { name, value, token: textValueToken };
            }
        }
    }
}

export class PropertyLine extends Line {

    /**
     * @returns { "property" }
     */
    category() {
        return "property";
    }

    id() {
        if (this.id_ === undefined) {
            this.id_ = super.id();
        }
        return this.id_;
    }

    tokens() {
        if (this.tokens_ === undefined) {
            this.tokens_ = super.tokens();
        }
        return this.tokens_;
    }
}

export class WhitespaceLine extends Line {
    /**
     * @returns { "whitespace" }
     */
    category() {
        return "whitespace";
    }
}

export class ContentLine extends Line {
    /**
     * @returns { "content" }
     */
    category() {
        return "content";
    }

    tokens() {
        return trimmedToken(this.text, { start: 0, end: this.text.length }, Token);
    }
}
