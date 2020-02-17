import { decodeEntities } from "./landmarks-entities.js";
// The parsing code assumes that npos is a large positive integer
export const npos = Number.MAX_SAFE_INTEGER;
;
export function isAutoclosed(state) {
    switch (state) {
        case "unmatched" /* unmatched */: // fallthrough
        case "matched" /* matched */:
            return false;
        case "autoclosedByParent" /* autoclosedByParent */: // fallthrough
        case "autoclosedBySibling" /* autoclosedBySibling */: // fallthrough
        case "autoclosedByAncestor" /* autoclosedByAncestor */:
            return true;
    }
    // TODO assert(false && "switch statement not exhaustive");
    return false;
}
;
;
export function isSelfClosing(marker, policy) {
    return policy === "required" /* required */ || (policy === "allowed" /* allowed */ && marker === "present" /* present */);
}
export class LandmarksRange {
    constructor(start = npos, end = npos) {
        if ((start < 0) || (end < start)) {
            throw "Range positions must be positive integers with start <= end";
        }
        this.start = start;
        this.end = end;
    }
    ;
    get isComplete() {
        return this.end !== npos;
    }
    get isEmpty() {
        return (this.start === npos) || this.start === this.end;
    }
    getText(document) {
        if (this.start === npos) {
            return "";
        }
        return document.substring(this.start, this.end);
    }
    getDecodedText(document) {
        return decodeEntities(this.getText(document));
    }
}
LandmarksRange.invalid = new LandmarksRange(npos, npos);
;
class Nameable {
    constructor(name) {
        this.name = name;
    }
    ;
    get isNameComplete() {
        return this.name.isComplete;
    }
    getQualifiedName(document) {
        const name = this.name.getText(document);
        const prefixEnd = name.indexOf(":");
        let prefix = "";
        let localName = name;
        if (prefixEnd >= 0) {
            prefix = name.substr(0, prefixEnd);
            localName = name.substr(prefixEnd + 1);
        }
        return { prefix, localName };
    }
}
export class LandmarksAttribute extends Nameable {
    constructor(startName, endName) {
        super(new LandmarksRange(startName, endName));
        this.all = this.name;
        this.value = new LandmarksRange(this.name.end, this.name.end);
    }
    ;
    get isComplete() {
        return this.value.isComplete;
    }
}
;
export const UnknownTagID = "(unknown)";
export class LandmarksTagPrefix extends Nameable {
    constructor(start, startName, endName) {
        super(new LandmarksRange(startName, endName));
        this.tagID = UnknownTagID;
        this.all = new LandmarksRange(start, endName);
    }
}
;
export class LandmarksStartTagPrefix extends LandmarksTagPrefix {
}
;
export class LandmarksStartTag extends LandmarksStartTagPrefix {
    constructor() {
        super(...arguments);
        this.selfClosingPolicy = "allowed" /* allowed */;
        this.selfClosingMarker = "absent" /* absent */;
    }
    get isSelfClosing() {
        return isSelfClosing(this.selfClosingMarker, this.selfClosingPolicy);
    }
}
;
export class LandmarksEndTagPrefix extends LandmarksTagPrefix {
    constructor() {
        super(...arguments);
        this.state = "unmatched" /* unmatched */;
    }
}
;
export class LandmarksEndTag extends LandmarksEndTagPrefix {
}
;
//# sourceMappingURL=landmarks-parser-types.js.map