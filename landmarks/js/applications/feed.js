// deno-lint-ignore-file no-unused-vars
// ALL RIGHTS RESERVED
// A simple RSS podcast feed parser that converts RSS to JSON
// This example demonstrates early exit
//
// The parser pulls data from RSS and iTunes tags to get data about podcasts.
// It handles both HTML and CDATA properties and removes the HTML from all of them
// to produce plain text.
// It produces JSONFeed data.
// It names the attachment from the title of the podcast and the date and name of the episode.
// "feedToJSON(string) : string" converts an RSS feed string to JSON
import { BaseHandler } from "../landmarks-handler.js";
import { LandmarksParser } from "../landmarks-parser.js";
import { xml, html5 } from "../landmarks-policy-ml.js";
function first(text, count = 1) {
    return text.substring(0, count);
}
function last(text, count = 1) {
    return text.substring(text.length - count);
}
class LandmarksText {
    constructor(text) {
        // text is normalized:
        // it won't start with whitespace
        // if it contains \n, it's deliberate; \n shouldn't be merged or ignored
        // space at the end can be merged or ignored
        this.text = "";
        this.trailingWhitespace = "";
        this.append(text);
    }
    // The result includes significant whitespace, but not an ignorable trailing space
    get value() {
        if (this.trailingWhitespace != " ") {
            return this.text + this.trailingWhitespace;
        }
        return this.text;
    }
    // The result does not include any trailing whitespace
    get trimmed() {
        return this.text;
    }
    // Normalizes the whitespace
    append(text) {
        if (text.length <= 0) {
            return;
        }
        const normalizedText = text.replace(/\s+/g, " ");
        // If new text starts with space 
        // & there's no existing trailing whitespace
        // & there's existing text
        // then we need to track the new space
        if ((normalizedText[0] === " ") && (this.trailingWhitespace.length === 0) && (this.text.length)) {
            this.trailingWhitespace = " ";
        }
        const trimmed = normalizedText.trim();
        if (trimmed.length) {
            this.text += this.trailingWhitespace + trimmed;
            this.trailingWhitespace = (last(normalizedText) === " ") ? " " : "";
        }
    }
    // Appends a line break \n
    appendBreak() {
        if (this.text.length <= 0) {
            return;
        }
        this.trailingWhitespace = "\n";
        /*if (last(this.trailingWhitespace) === "\n") {
            this.trailingWhitespace += "\n";
        } else {
            this.trailingWhitespace = "\n";
        }*/
    }
}
// Removes HTML tags/attributes while preserving text
// Assumes whitespace should be normalized
// Does a small amount of tag->whitespace adjustment
// e.g. p, br, hr all produce \n
class Gleaner extends BaseHandler {
    constructor() {
        super();
        this.elements = [];
        this.text = new LandmarksText("");
        this.audio = [];
    }
    closeTag() {
        const e = this.current();
        if (["p", "br", "hr", "tr"].includes(e.localName)) {
            this.text.appendBreak();
        }
        this.elements.pop();
    }
    get path() {
        const separator = " > ";
        return separator + this.elements.map(e => e.localName).join(separator);
    }
    current(localName = undefined) {
        if (!localName) {
            return this.elements[this.elements.length - 1];
        }
        for (let index = this.elements.length - 1; index >= 0; --index) {
            const e = this.elements[index];
            if (e.localName === localName) {
                return e;
            }
        }
        return undefined;
    }
    CData(document, range) {
    }
    Text(document, range) {
        const e = this.current();
        const visible = (e === undefined) || ["p", "span", "div", "b", "i", "u", "strong", "em", "a", "h1", "h2", "h3", "h4", "tr", "td", "pre"].includes(e.localName);
        if (visible) {
            this.text.append(range.getDecodedText(document));
        }
    }
    StartTagPrefix(document, tag) {
        const qn = tag.getQualifiedName(document);
        const element = Object.assign({}, qn);
        this.elements.push(element);
    }
    StartTagAttribute(document, attribute) {
        const e = this.current();
        const qn = attribute.getQualifiedName(document);
        // TODO - currently only retrieving basics
        if (e.localName === "audio" && qn.localName === "src") {
            this.audio.push(attribute.value.getDecodedText(document));
        }
    }
    StartTag(document, tag) {
        const e = this.current();
        if (tag.isSelfClosing) {
            // There won't be an EndTag to remove the item from the stack
            this.closeTag();
        }
    }
    EndTag(document, tag) {
        if (tag.state === "unmatched" /* unmatched */) {
            // There wasn't a StartTagPrefix to push the item on the stack
            return;
        }
        // A matching end tag means we have a current element
        const e = this.current();
        this.closeTag();
    }
    EndOfInput(document, open_elements) {
    }
}
function gleanFromMarkup(text, policy = html5) {
    const parser = LandmarksParser(policy);
    const handler = new Gleaner();
    parser.parse(text, handler);
    return { text: handler.text.trimmed, audio: handler.audio };
}
// Removes markup, if any, and returns a trimmed version of the text
function removeMarkup(text, policy = html5) {
    return gleanFromMarkup(text, policy).text;
}
class Feed extends BaseHandler {
    constructor(feedHandler) {
        super();
        this.elements = [];
        this.feedHandler = feedHandler;
    }
    // Returns the current item if there is one
    get item() {
        const c = this.current("item") ?? this.current("entry") ;
        return c && c.item;
    }
    // Returns the current channel if there is one
    get channel() {
        const c = this.current("channel") ?? this.current("feed");
        return c && c.channel;
    }
    cleanupTag() {
        const c = this.current();
        const item = c && c.item;
        if (item) {
            // Send the channel before sending the first item
            const channel = this.channel;
            if (channel && !channel.sent) {
                channel.sent = true;
                this.feedHandler.Channel(channel.data);
            }
            this.feedHandler.Item(item);
        }
        else {
            // Send the channel if there are no items
            const channel = c && c.channel;
            if (channel && !channel.sent) {
                channel.sent = true;
                this.feedHandler.Channel(channel);
            }
        }
        this.elements.pop();
    }
    get path() {
        const separator = " > ";
        return separator + this.elements.map(e => e.localName).join(separator);
    }
    current(localName = undefined) {
        if (!localName) {
            return this.elements[this.elements.length - 1];
        }
        for (let index = this.elements.length - 1; index >= 0; --index) {
            const e = this.elements[index];
            if (e.localName === localName) {
                return e;
            }
        }
        return undefined;
    }
    CData(document, range) {
        // We can do this because LandmarksRange.getDecodedText works nicely for CData ranges
        this.Text(document, range);
    }
    Text(document, range) {
        const item = this.item;
        if (item !== undefined) {
            const props = [
                "author", "title", "description", "subtitle", "summary", "pubDate", "link", "duration", "guid",
                "updated", "published"
            ];
            for (const prop of props) {
                if (this.current(prop)) {
                    item[prop] = removeMarkup(range.getDecodedText(document));
                }
            }
        }
        else {
            const channel = this.channel;
            if (channel !== undefined) {
                const props = [
                    "author", "title", "description", "subtitle", "summary", "pubDate", "link",
                    "updated"
                ];
                for (const prop of props) {
                    if (this.current(prop)) {
                        channel.data[prop] = removeMarkup(range.getDecodedText(document));
                    }
                }
            }
        }
    }
    StartTagPrefix(document, tag) {
        const qn = tag.getQualifiedName(document);
        const element = Object.assign({}, qn);
        this.elements.push(element);
        switch (element.localName) {
            case "item":
            case "entry":
                element.item = { enclosure: {} };
                break;
            case "channel":
            case "feed":
                element.channel = { sent: false, data: {} };
                break;
        }
    }
    StartTagAttribute(document, attribute) {
        const e = this.current();
        const qn = attribute.getQualifiedName(document);
        const item = this.item;
        if (item) {
            if (e.localName === "enclosure") {
                item.enclosure[qn.localName] = attribute.value.getDecodedText(document);
            }
            else if (e.localName === "image" && qn.localName === "href") {
                item.image = attribute.value.getDecodedText(document);
            }
        }
        else {
            const channel = this.channel;
            if (channel) {
                if (e.localName === "image" && qn.localName === "href") {
                    channel.data.image = attribute.value.getDecodedText(document);
                }
            }
        }
    }
    StartTag(document, tag) {
        const e = this.current();
        if (tag.isSelfClosing) {
            // There won't be an EndTag to remove the item from the stack
            this.cleanupTag();
        }
    }
    EndTag(document, tag) {
        if (tag.state === "unmatched" /* unmatched */) {
            return;
        }
        // A matching end tag means we have a current element
        const e = this.current();
        this.cleanupTag();
    }
    EndOfInput(document, open_elements) {
    }
}
function secondsFromDuration(time) {
    // iTunes duration formats
    const hms = /^(?<h>\d{1,2}):(?<m>\d{1,2}):(?<s>\d{1,2})$/ig;
    const ms = /^(?<m>\d{1,2}):(?<s>\d{1,2})$/ig;
    const s = /^(?<s>\d+)$/ig;
    const formats = [hms, ms, s];
    for (const format of formats) {
        const match = format.exec(time); // TODO - as any
        if (match) {
            const o = match.groups;
            let result = 0;
            if (o.h) {
                const h = parseInt(o.h, 10);
                result += h * 60 * 60;
            }
            if (o.m) {
                const m = parseInt(o.m, 10);
                result += m * 60;
            }
            if (o.s) {
                const s = parseInt(o.s, 10);
                result += s;
            }
            return result;
        }
    }
    return undefined;
}
export function feedToJSON(text, maximumItems = -1) {
    function simplifyTitle(title) {
        return title.replace(/ podcast$/i, "");
    }
    // If we get passed json, do some updates
    if (text.slice(0, 16).includes("{")) {
        try {
            const feed = JSON.parse(text);
            if (feed.version && feed.version.startsWith("https://jsonfeed.org/version/")) {
                const simpleChannelTitle = simplifyTitle(feed.title);
                feed.items = feed.items.map((item) => {
                    if (item.content_text === undefined && item.content_html !== undefined) {
                        // TODO - make this better!
                        const b = gleanFromMarkup(item.content_html);
                        item.content_text = b.text;
                        if ((item.attachments === undefined) || (item.attachments.length === 0)) {
                            for (const a of b.audio) {
                                if (a.endsWith(".mp3")) {
                                    if (item.attachments === undefined) {
                                        item.attachments = [];
                                    }
                                    const url = a;
                                    const type = "audio/mpeg";
                                    item.attachments.push({ url, type });
                                }
                            }
                        }
                    }
                    if (item.date_published === undefined && item.date_modified !== undefined) {
                        item.date_published = item.date_modified;
                    }
                    if (item.date_published !== undefined && (item.attachments) && (item.attachments.length === 1)) {
                        const attachment = item.attachments[0];
                        if (attachment.title === undefined) {
                            const yyyy_mm_dd = item.date_published.substring(0, "yyyy-mm-dd".length);
                            const title = `${simpleChannelTitle} - ${yyyy_mm_dd} ${item.title}`;
                            attachment.title = title;
                        }
                    }
                    return item;
                });
                return JSON.stringify(feed, null, 2);
            }
        }
        catch (e) {
            // nothing
        }
        return text;
    }
    const feedHandler = {
        channel: {},
        items: [],
        Channel(channel) {
            this.channel = channel;
        },
        Item(item) {
            this.items.push(item);
            if (this.items.length === maximumItems) {
                throw this;
            }
        }
    };
    const parser = LandmarksParser(xml);
    const landmarksHandler = new Feed(feedHandler);
    try {
        parser.parse(text, landmarksHandler);
    }
    catch (e) {
        if (e === feedHandler) {
            // expected - early exit when we reached maximumItems
        }
        else {
            throw e;
        }
    }
    const { channel, items } = feedHandler;
    const simpleChannelTitle = simplifyTitle(channel.title);
    // Create jsonfeed from the extracted data
    const jsonfeed = {
        version: "https://jsonfeed.org/version/1",
        author: { name: channel.author },
        title: channel.title,
        description: channel.subtitle || channel.description,
        home_page_url: channel.link,
        icon: channel.image,
        items: items.map(item => {
            let date_published = undefined;
            let yyyy_mm_dd = undefined;
            try {
                date_published = new Date(item.pubDate).toISOString();
                yyyy_mm_dd = date_published.substring(0, "yyyy-mm-dd".length);
            }
            catch (e) {
                // nothing
            }
            let attachments = undefined;
            if (item.enclosure && item.enclosure.url) {
                const title = `${simpleChannelTitle} - ${yyyy_mm_dd} ${item.title}`;
                let duration_in_seconds = undefined;
                if (item.duration !== undefined) {
                    duration_in_seconds = secondsFromDuration(item.duration);
                }
                attachments = [
                    {
                        url: item.enclosure.url,
                        size_in_bytes: item.enclosure.length,
                        mime_type: item.enclosure.type,
                        duration_in_seconds,
                        title,
                    }
                ];
            }
            const jsonitem = {
                id: item.guid,
                author: { name: item.author },
                title: item.title,
                summary: item.subtitle,
                url: item.link,
                image: item.image,
                content_text: item.description,
                date_published,
                attachments,
            };
            return jsonitem;
        })
    };
    return JSON.stringify(jsonfeed, null, 2);
}
//# sourceMappingURL=feed.js.map