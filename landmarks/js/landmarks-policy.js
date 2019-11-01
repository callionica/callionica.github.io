// ALL RIGHTS RESERVED
import { npos } from "./landmarks-parser-types.js";
;
const charCode = {
    "0": "0".charCodeAt(0),
    "9": "9".charCodeAt(0),
    "A": "A".charCodeAt(0),
    "z": "z".charCodeAt(0),
};
export class Policy {
    constructor(data) {
        this.data = data;
    }
    get spaces() {
        return this.data.spaces;
    }
    getElementNameStart(text, pos) {
        if (pos < text.length) {
            var name_start = text.charCodeAt(pos);
            if ((charCode['0'] <= name_start && name_start <= charCode['9']) || (charCode['A'] <= name_start && name_start <= charCode['z'])) {
                return pos;
            }
        }
        return npos;
    }
    getTagID(name) {
        return name.toLowerCase();
    }
    isSameElement(lhs, rhs) {
        return lhs === rhs;
    }
    isVoidElement(tagID) {
        return this.data.voidElements.includes(tagID);
    }
    isContentElement(tagID) {
        return this.data.contentElements.includes(tagID);
    }
    isOpaqueElement(tagID) {
        return this.data.opaqueElements.includes(tagID);
    }
    isAutoclosingSibling(tagID, siblingID) {
        var entry = this.data.autocloseBySibling.find((e) => {
            return e[0] === tagID;
        });
        if (entry) {
            return entry[1].includes(siblingID);
        }
        return false;
    }
    isAutocloseByParent(tagID) {
        return this.data.autocloseByParent.includes(tagID);
    }
    isWildcardEndTag(tagID) {
        return this.data.wildcardEndTags.includes(tagID);
    }
    isAutoclosingEndTag(tagID) {
        return this.data.autoclosingEndTags.includes(tagID);
    }
}
//# sourceMappingURL=landmarks-policy.js.map