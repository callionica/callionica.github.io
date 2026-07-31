
// Frets are numbered from 1 with low numbers near the head of the guitar (low numbers are low notes)
// x is an unplayed or muted string
// 0 is an open string
// Strings are numbered from 1 with low numbers for thinner strings near the bottom of the guitar (low numbers are high notes)
// This is the standard way of string numbering

/**
 *
 * @typedef { number } GString;
 * @typedef { number } GFinger;
 * @typedef { number } GFret;
 * @typedef { 0 | GFret } GFretCommand;
 * @typedef { 'x' | GFretCommand } GStringCommand;
 * @typedef { { string: GString, fret: GStringCommand } } GStringPosition;
 * @typedef { { finger: GFinger, fret: GStringCommand, strings: GString[] } } GFingerPosition;
 * */

/** Ordered from thick to thin strings (6 to 1) */
const GUITAR_STRINGS = [6, 5, 4, 3, 2, 1];

/** @type GStringCommand */
const UNUSED = 'x';

/** @type GStringCommand */
const OPEN = 0;

function range(first, last) {
    console.log("range", first, last);
    let list = [];
    for (let n = first; n <= last; n++) {
        list.push(n);
    }
    return list;
}

/**
 * Given a string that is a number or 'x', return a number or 'x'
 * @param { string } x 
 * @returns { GStringCommand | undefined }
 */
function parseCommand(x) {
    if (x === UNUSED) {
        return x;
    }

    return parseInt(x, 10) ?? undefined;
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
 * Given text like '0 x 2 3 0 0' or '0x2300', return an array of { string, fret } objects.
 * 
 * Strings that are not played or are muted (indicated by 'x') are not returned as objects.
 * Open strings (indicated by '0') are returned as objects.
 * 
 * If the text only contains single character frets, no spaces are necessary.
 * If the text contains multi-character frets (frets 10 or above), spaces between each fret are necessary.
 * 
 * Unknown characters are IGNORED, so invalid text might return empty arrays or odd results rather than erroring 
 * 
 * @param { string } text 
 * @returns { GStringPosition[] }
 */
export function parseStringPositions(text) {
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

    return positions;
}

/**
 * Given a string like 'x 2+456 3+5', return an array of objects
 * Fingers that are not used are not returned as objects
 * @param { string } text 
 * @returns { GFingerPosition[] }
 */
export function parseFingerPositions(text) {

    const played = text.toLowerCase().split(" ").filter(fp => fp.length > 0).map((x, n) => {
        const p = x.split("+");
        const fret = parseCommand(p[0]);
        const strings = (p[1] ? p[1].split("").map(x => parseInt(x, 10)) : []).toSorted((a, b) => a - b);
        return { finger: n + 1, fret, strings };
    }).filter(o => o.fret !== UNUSED);

    return played;
}

/**
 * 
 * @param { GStringPosition } position 
 * @returns 
 */
function isCovered(position) {
    return (position.fret !== UNUSED && position.fret !== OPEN);
}

/**
 * 
 * @param { GStringPosition[] } positions 
 * @param { GString } stringNumber
 */
function findCover(positions, stringNumber) {
    let best = undefined;
    for (let position of positions) {
        if (position.string === stringNumber && isCovered(position)) {
            if (best === undefined || position.fret > best.fret) {
                best = position;
            }
        }
    }
    return best;
}

/**
 * A finger positioning algorithm:
 * Each fretted string gets a finger starting with
 * the lowest fret number (closest to the neck) and
 * the lowest string number (bottom of the guitar)
 * @param { GStringPosition[] } positions 
 * @returns { GFingerPosition[] }
 */
export function stringsToFingers(positions, options) {
    const sortedPositions = positions.filter(s => s.fret !== OPEN && s.fret !== UNUSED).toSorted((l, r) => {
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
                console.log("missing", missing);
                const anyUncovered = missing.some(v => {
                    const cover = findCover(positions, v);
                    if (cover === undefined || (cover.fret < o.fret)) {
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

    return sortedPositions.filter(o => !o.disabled).map((s, n) => ({ finger: n + 1, fret: s.fret, strings: s.strings }));
}

export function positionsToText(positions) {
    // positions are assumed to be in correct order, but positions may be missing if unused
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

export function fingersToText(fingers) {
    // fingers are assumed to be in correct order, but fingers may be missing if unused
    const result = [];
    let previous = 0;
    for (let f of fingers) {
        if (f.finger !== previous + 1) {
            result.push(...range(previous, f.finger - 1).map(n => 'X'));
        }
        previous = f.finger;

        result.push(`${f.fret}+${f.strings.join("")}`)
    }
    return result.join(" ");
}

class Chord {
    /** @type string */
    name;

    /** @type string */
    strings;

    /** @type string */
    fingers;
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
            const a = parseStringPositions(ss);
            console.log(a);

            console.log("POS", ss, positionsToText(a));

            for (let sn of GUITAR_STRINGS) {
                const c = findCover(a, sn)
                // console.log("cover", sn, c);
            }

            const fs = stringsToFingers(a, { interiorBars: true, hiddenBars: true });
            console.log(ss, fingersToText(fs), fs);
        }

        const ffs = ["1+4 2+23 X", " x 2+456 3+5 "];
        for (let ff of ffs) {
            const a = parseFingerPositions(ff);
            console.log(ff, a);
        }
    });
}