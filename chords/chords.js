
// Frets are numbered from 1 with low numbers near the head of the guitar (low numbers are low notes)
// x is an unplayed or muted string
// 0 is an open string
// Strings are numbered from 1 with low numbers for thinner strings near the bottom of the guitar (low numbers are high notes)
// This is the standard way of string numbering
// Fingers are numbered from 1-4 with 5 being the thumb (marked as T)

/**
 *
 * @typedef { number } GString;
 * @typedef { GString[] } GStrings;
 * @typedef { 1 | 2 | 3 | 4 | 5 } GFinger;
 * @typedef { number } GFret;
 * @typedef { 0 | GFret } GFretCommand;
 * @typedef { 'x' | GFretCommand } GStringCommand;
 * @typedef { { string: GString; fret: GStringCommand; } } GStringPosition;
 * @typedef { { finger: GFinger; fret: GStringCommand; strings: GString[]; mutedStrings: GString[] | undefined; } } GFingerPosition;
 * */

// Ordered from thick to thin strings (6 to 1)

/** @type GStrings */
const GUITAR_STRINGS = [6, 5, 4, 3, 2, 1];

/** @type GStringCommand */
const UNUSED = 'x';

/** @type GStringCommand */
const OPEN = 0;

/** @type GFinger */
const THUMB = 5;

/** Separators allowed in FretHand syntax */
const SEPARATORS = /[+@]/ig;

// class Finger {
//     /**
//      * The core value representing the finger in the range 1-5 where the thumb is 5
//      * @type GFinger
//     */
//     value;

//     /**
//      * Is this finger acting like another finger for the purposes of this chord?
//      * This is particularly useful for a thumb where it can be replacing a finger
//      * and we want the notation to reflect that by putting the thumb instruction
//      * at the position where the finger instruction would normally be.
//      * @type GFinger | undefined
//     */
//     replacing;

//     /**
//      * Text representing the finger (1-4 or T)
//      */
//     get id() {
//         if (this.value === 5) {
//             return 'T';
//         }
//         return '' + this.value;
//     }

//     static idToValue(text) {
//         if (text.toLowerCase() === 't') {
//             return 5;
//         }

//         switch (text) {
//             case '1':
//                 return 1;
//             case '2':
//                 return 2;
//             case '3':
//                 return 3;
//             case '4':
//                 return 4;
//             case '5':
//                 return 5;
//         }
//         return undefined;
//     }

//     /**
//      * The position of this finger instruction within the hand instruction
//      * @type number
//      */
//     get position() {
//         return this.replacing ?? this.value;
//     }
// }

function range(first, last) {
    // console.log("range", first, last);
    let list = [];
    for (let n = first; n <= last; n++) {
        list.push(n);
    }
    return list;
}

/**
 * Given text that is a number or 'x', return a number or 'x'
 * @param { string } text 
 * @returns { GStringCommand | undefined }
 */
function parseCommand(text) {
    if (text === UNUSED) {
        return text;
    }

    return parseInt(text, 10) ?? undefined;
}

/**
 * Is the value 'x' or an integer?
 * @param {any} x 
 * @returns { x is GStringCommand }
 */
function isCommand(x) {
    return x === UNUSED || Number.isInteger(x);
}

/**
 * True if the string is sounded
 * @param { GStringPosition } position 
 * @returns 
 */
function isPlayed(position) {
    return (position.fret !== UNUSED);
}

/**
 * True if the string is sounded and not open
 * @param { GStringPosition } position 
 * @returns 
 */
function isCovered(position) {
    return (isPlayed(position) && position.fret !== OPEN);
}

export class GChord {
    /**
     * True if the specified string is played in this chord
     * 
     * @param {GString} s The string being tested
     */
    isPlayed(s) {
        return false;
    }

    /**
     * True if the specified string is played with cover (fretted) in this chord.
     * 
     * Where the chord specifies finger positions, a string could be 'covered' but still end up muted or unplayed,
     * in which case this method should return `false`. It represents the final effect of the chord.
     * 
     * @param {GString} s The string being tested
     */
    isCovered(s) {
        return this.getCover(s) !== undefined;
    }

    /**
     * True if the specified string is played without cover
     * 
     * @param {GString} s The string being tested
     */
    isOpen(s) {
        return this.isPlayed(s) && !this.isCovered(s);
    }

    /**
     * Returns the fret covered for this string or `undefined` if not covered or string is unplayed
     * 
     * Where the chord specifies finger positions, a string could be 'covered' but still end up muted or unplayed,
     * in which case this method should return `undefined`. It represents the final effect of the chord.
     * 
     * @param {GString} s The string being tested
     * @returns { GFret | undefined }
     */
    getCover(s) {
        return undefined;
    }

    /**
     * Returns the command for this string: 'x' (unplayed/muted), `0` (open), or fret number (covered)
     * @param {GString} s 
     * @returns { GStringCommand }
     */
    getCommand(s) {
        if (!this.isPlayed(s)) {
            return UNUSED;
        }

        if (this.isOpen(s)) {
            return OPEN;
        }

        return this.getCover(s);
    }

    /** @type GStrings */
    get availableStrings() {
        return GUITAR_STRINGS;
    }

    /** @type GStrings */
    get silentStrings() {
        return this.availableStrings.filter(n => !this.isPlayed(n));
    }

    /** @type GStrings */
    get openStrings() {
        return this.availableStrings.filter(n => this.isOpen(n));
    }

    /** @type GStrings */
    get coveredStrings() {
        return this.availableStrings.filter(n => this.isCovered(n));
    }

    toStringChord() {
        const result = new GStringChord();
        result.strings = this.availableStrings.map(s => ({ string: s, fret: this.getCommand(s) }));
        return result;
    }

    /**
     * @param { string } text 
     */
    static parse(text) {
        if (text.match(SEPARATORS)) {
            return GFingerChord.parse(text);
        }
        return GStringChord.parse(text);
    }
}

// Values are chosen for easy sorting
const MENTION_PLAY = 1;
const MENTION_MUTE = 2;
const MENTION_UNPLAYED = 3;

export class GFingerChord extends GChord {
    /** @type GFingerPosition[] */
    fingers = [];

    /** @type GString[] */
    unplayedStrings = [];

    /**
     * 
     * @param { GString } s 
     * @returns { ({ type: 1 | 2, fret: GFret } | { type: 3 })[] }
     */
    getMentions(s) {
        /** @type ({ type: 1 | 2, fret: GFret } | { type: 3 })[] */
        const m = this.fingers.flatMap(f => {
            const result = f.strings.filter(n => n === s).map(n => ({ fret: f.fret, type: MENTION_PLAY }));
            if (f.mutedStrings !== undefined) {
                result.push(...f.mutedStrings.filter(n => n === s).map(n => ({ fret: f.fret, type: MENTION_MUTE })));
            }
            return result;
        });

        const result = m.toSorted((a, b) => {
            const d = a.fret - b.fret;
            if (d !== 0) {
                return d;
            }

            return a.type - b.type;
        });

        if (this.unplayedStrings.includes(s)) {
            result.push(({ type: MENTION_UNPLAYED }));
        }

        // console.log("MENTIONS", s, result);
        return result;
    }

    /**
     * True if the specified string is played in this chord
     * @param {GString} s The string being tested
     */
    isPlayed(s) {
        return this.isOpen(s) || this.isCovered(s);
    }

    /**
     * True if the specified string is played open
     * @param {GString} s The string being tested
     */
    isOpen(s) {
        const mentions = this.getMentions(s);

        // Unmentioned strings are played open
        return (mentions.length === 0);
    }

    /**
     * Returns the fret covered for this string or undefined if not covered or string is unplayed
     * @param {GString} s The string being tested
     * @returns { GFret | undefined }
     */
    getCover(s) {
        const mentions = this.getMentions(s);
        const potentialCover = mentions.at(-1);
        if (potentialCover !== undefined) {
            if (potentialCover.type === MENTION_PLAY) {
                return potentialCover.fret;
            }
        }
        return undefined;
    }

    toString() {
        const UNUSED_FINGER = 'X';
        const SILENT_STRINGS = 'X';
        const MUTED_STRINGS = 'x';
        const SEPARATOR = '+';

        const sorting = (a, b) => b - a;

        /**
         * @param {GFingerPosition[]} fingers 
         */
        function fingersToText(fingers) {
            // fingers are assumed to be in correct order, but fingers may be missing if unused
            const result = [];
            let previous = 0;
            for (let f of fingers) {
                if (f.finger !== previous + 1) {
                    result.push(...range(previous + 1, f.finger - 1).map(n => UNUSED_FINGER));
                }
                previous = f.finger;

                const muted = (f.mutedStrings ?? []).toSorted(sorting);
                const thumb = (f.isThumb || (f.finger === THUMB)) ? "T" : "";
                result.push(`${thumb}${f.fret}${SEPARATOR}${f.strings.toSorted(sorting).join("")}${(muted.length ? `${MUTED_STRINGS}${muted.join("")}` : "")}`)
            }
            return result.join(" ");
        }

        const unplayed = this.unplayedStrings.toSorted(sorting).join("");
        return fingersToText(this.fingers) + (unplayed.length > 0 ? ` ${SILENT_STRINGS}${SEPARATOR}${unplayed}` : "");
    }

    toHTML() {
        const UNUSED_FINGER = 'X';
        const UNPLAYED_STRINGS = 'X';
        const MUTED_STRINGS = 'x';
        const SEPARATOR = '+';

        const sorting = (a, b) => b - a;

        /**
         * @param {GFingerPosition[]} fingers 
         */
        function fingersToText(fingers) {
            // fingers are assumed to be in correct order, but fingers may be missing if unused
            const result = [];
            let previous = 0;
            for (let f of fingers) {
                if (f.finger !== previous + 1) {
                    result.push(...range(previous + 1, f.finger - 1).map(n => `<span fh-finger='${n}' fh-unused>${UNUSED_FINGER}</span>`));
                }
                previous = f.finger;

                const muted = (f.mutedStrings ?? []).toSorted(sorting);
                const isThumb = (f.isThumb || (f.finger === THUMB));
                const thumb =  isThumb ? "<span fh-indicator='thumb'>T</span>" : "";
                const fingerNumber = isThumb ? THUMB : f.finger;
                const covered = f.strings.toSorted(sorting);
                result.push(`<span fh-finger='${fingerNumber}'>${thumb}<span fh-fret='${f.fret}'>${f.fret}</span><span fh-indicator='separator'>${SEPARATOR}</span><span fh-strings='covered'>${covered.map(s => `<span fh-string='${s}'>${s}</span>`).join("")}</span>${(muted.length ? `<span fh-strings='muted'><span fh-indicator='muted'>${MUTED_STRINGS}</span>${muted.join("")}</span>` : "")}</span>`)
            }
            return result.join(" ");
        }

        const unplayed = this.unplayedStrings.toSorted(sorting).map(s => `<span fh-string='${s}'>${s}</span>`).join("");
        return fingersToText(this.fingers) + (unplayed.length > 0 ? ` <span fh-strings='unplayed'><span fh-indicator='unplayed'>${UNPLAYED_STRINGS}</span><span fh-indicator='separator'>${SEPARATOR}</span>${unplayed}</span>` : "");
    }

    /**
     * 
     * @param { string } text 
     * @returns 
     */
    static parse(text) {

        /**
         * Given a string like 'x 2+456 3+5', return an array of objects
         * x on its own means a finger that is not used
         * Fingers that are not used are not returned as objects
         * x+123 means strings 1, 2, and 3 are not played
         * Strings not mentioned are played open by default
         * @param { string } text 
         * @returns { { fingers: GFingerPosition[]; unplayedStrings: GString[]; } }
         */
        function parseFingerPositions(text) {

            const UNPLAYED = /^x[+@]/ig;
            /**
             * strings are covered strings optionally followed by an 'x' and then muted strings
             * @param {string} text 
             */
            function parseStrings(text) {
                /** @type string[] */
                let strings = [];

                /** @type string[] | undefined */
                let mutedStrings = undefined;

                for (const c of text) {
                    if (mutedStrings !== undefined) {
                        const n = parseInt(c, 10);
                        if (Number.isInteger(n)) {
                            mutedStrings.push(n);
                        }
                    } else if (c === 'x') {
                        mutedStrings = [];
                    } else {
                        const n = parseInt(c, 10);
                        if (Number.isInteger(n)) {
                            strings.push(n);
                        }
                    }
                }

                strings = strings?.toSorted((a, b) => a - b);
                mutedStrings = mutedStrings?.toSorted((a, b) => a - b);

                return { strings, mutedStrings };
            }

            const pieces = text.toLowerCase().split(" ").filter(fp => fp.length > 0);

            const unplayedStrings = pieces.filter(p => p.match(UNPLAYED))
                .flatMap(p => [...(p.split(SEPARATORS)[1])].map(x => parseInt(x, 10)))
                .toSorted((a, b) => a - b)
                ;

            const fingers = pieces.filter(p => !p.match(UNPLAYED)).map((x, n) => {
                const p = x.split(SEPARATORS);
                let fretText = p[0];
                let isThumb = false;
                if (fretText.startsWith("t")) {
                    fretText = fretText.substring(1);
                    isThumb = true;
                }
                const fret = parseCommand(fretText);
                const o = parseStrings(p[1] ?? "");
                return { finger: n + 1, fret, isThumb, ...o };
            }).filter(o => o.fret !== UNUSED);

            return { fingers, unplayedStrings };
        }

        const { fingers, unplayedStrings } = parseFingerPositions(text);
        const result = new GFingerChord();
        result.fingers = fingers;
        result.unplayedStrings = unplayedStrings;
        return result;
    }
}

export class GStringChord extends GChord {
    /** @type GStringPosition[] */
    strings = [];

    /**
     * True if the specified string is played in this chord
     * @param {GString} s The string being tested
     */
    isPlayed(s) {
        return this.strings.some(o => o.string === s && isPlayed(o));
    }

    /**
     * Returns the fret covered for this string or undefined if not covered or string is unplayed
     * @param {GString} s The string being tested
     * @returns { GFret | undefined }
     */
    getCover(s) {
        return this.strings.find(o => o.string === s && isCovered(o))?.fret;
    }

    toString() {
        // positions are assumed to be in correct order, but positions may be missing if unused
        const positions = this.strings;
        const result = [];
        let previous = 0;
        for (let p of positions) {
            if (p.string !== previous - 1) {
                result.push(...range(p.finger + 1, previous).map(n => 'x'));
            }
            previous = p.string;

            result.push(`${p.fret}`)
        }
        return (result.some(x => x.length > 1) ? result.join(" ") : result.join(""));
    }

    toHTML() {
        return `<span>${this.toString()}</span>`; // TODO
    }

    static parse(text) {
        /**
         * Given text like '0 x 2 3 0 0' or '0x2300', return an array of { string, fret } objects.
         * 
         * Strings that are not played or are muted (indicated by 'x') are not returned as objects.
         * Open strings (indicated by '0') are returned as objects.
         * 
         * If the text only contains single character frets, no spaces are necessary.
         * If the text contains multi-character frets (frets 10 or above), spaces between each fret are necessary.
         * 
         * Unknown characters are IGNORED, so invalid text might return empty arrays or odd results rather than erroring 
         */

        text = text.toLowerCase();

        const pieces = text.includes(" ") ? text.split(" ") : [...text];

        const positions = pieces
            .filter(piece => piece.length > 0)
            .map(parseCommand)
            .filter(isCommand)
            .map((fret, n) => {
                return { string: GUITAR_STRINGS[0] - n, fret };
            })
            .filter(fret => fret !== UNUSED)
            ;

        const result = new GStringChord();
        result.strings = positions;
        return result;
    }

    toFingerChord(options = { bars: true, interiorBars: true, hiddenBars: true }) {
        const sortedPositions = this.strings.filter(s => s.fret !== OPEN && s.fret !== UNUSED).toSorted((l, r) => {
            const fd = l.fret - r.fret;
            if (fd !== 0) {
                return fd;
            }

            const sd = l.string - r.string;
            return sd;
        }).map(o => ({ fret: o.fret, strings: [o.string] }));

        const considerBars = options?.bars || options?.hiddenBars || options?.interiorBars;

        let previous = undefined;
        for (let o of sortedPositions) {
            if (previous?.fret === o.fret && considerBars) {
                const nextString = previous.strings.at(-1) + 1;
                // contiguous bar candidate
                if (o.strings[0] === nextString) {
                    previous.strings.push(...o.strings);
                    o.disabled = true;
                    continue;
                } else if (options?.hiddenBars) {
                    const missing = range(nextString, o.strings[0] - 1);

                    const anyUncovered = missing.some(v => {
                        const cover = this.getCover(v);
                        if (cover === undefined || (cover < o.fret)) {
                            return true;
                        }
                    });

                    if (!anyUncovered) {
                        previous.strings.push(...missing);

                        previous.strings.push(...o.strings);
                        o.disabled = true;
                        continue;
                    }
                }
            }

            previous = o;

            if (previous.strings[0] !== 6 && !options?.interiorBars) {
                previous = undefined;
            }
        }

        // hidden bars are ones where high number frets cover gaps in low number frets
        // edge bars start at string 6
        // edge bar limit constrains the max width of an edge bar
        // interior bars start otherwise
        // interior bar limit constrains the max width of an interior bar

        /** @type GFingerPosition[] */
        const fingers = sortedPositions.filter(o => !o.disabled).map((s, n) => ({ finger: n + 1, fret: s.fret, strings: s.strings }));

        const result = new GFingerChord();
        result.fingers = fingers;
        result.unplayedStrings = this.silentStrings;
        return result;
    }
}

if ("Deno" in globalThis) {
    Deno.test("HMS", async function () {
        const sss = [
            "X 0 12 13 1",
            "202",
            "rr999",
            "9c#99",
            "022100",
            " 0 2 2 1 0 0",
            "x X  0 2 3 2 ",
            "x X  2 2 3 2 ",
            "x 2 4 3 2 X",
            "x X  3 4 2 3 ",
        ];
        for (let ss of sss) {
            const o = GStringChord.parse(ss);
            console.log("CLASS STR1", o.toString());

            const c = o.toStringChord();
            console.log("CLASS STR2", c.toString());

            const fc = o.toFingerChord();
            console.log("CLASS FING", fc.toString());
        }

        const ffs = [
            "1+4 2+4",
            "1+4x3",
            "1+4 2+23 X X+56 X+1",
            " x 2+456 3+5 ",
            "1+2 T2+3 3+4"
        ];
        for (let ff of ffs) {
            const c = GFingerChord.parse(ff);
            console.log("CLASS FING", c.toString());

            console.log("CLASS FHTM", c.toHTML());

            const o = c.toStringChord();
            console.log("CLASS STR1", o.toString());

            // console.log("isPlayed(3)", c.isPlayed(3));
            // console.log("silentStrings", c.silentStrings);
            // console.log("openStrings", c.openStrings);
            // console.log("coveredStrings", c.coveredStrings);
            // console.log("toStringChord", c.toStringChord().toString());
        }
    });
}