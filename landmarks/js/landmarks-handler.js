// ALL RIGHTS RESERVED
;
export class BaseHandler {
    Text(document, range) { }
    Comment(document, range) { }
    CData(document, range) { }
    Processing(document, range) { }
    Declaration(document, range) { }
    StartTagPrefix(document, tag) { }
    StartTagAttribute(document, attribute) { }
    StartTag(document, tag) { }
    EndTagPrefix(document, tag) { }
    EndTagAttribute(document, attribute) { }
    EndTag(document, tag) { }
    EndOfInput(document, open_elements) { }
}
export class LogHandler {
    Text(document, range) { console.log(range); }
    Comment(document, range) { console.log(range); }
    CData(document, range) { console.log(range); }
    Processing(document, range) { console.log(range); }
    Declaration(document, range) { console.log(range); }
    StartTagPrefix(document, tag) { console.log(tag); }
    StartTagAttribute(document, attribute) { console.log(attribute); }
    StartTag(document, tag) { console.log(tag); console.log(tag.getQualifiedName(document)); }
    EndTagPrefix(document, tag) { console.log(tag); }
    EndTagAttribute(document, attribute) { console.log(attribute); }
    EndTag(document, tag) { console.log(tag); }
    EndOfInput(document, open_elements) { console.log(open_elements); }
}
//# sourceMappingURL=landmarks-handler.js.map