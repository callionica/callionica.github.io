
// Frets are numbered from 1 with low numbers near the head of the guitar (low numbers are low notes)
// x is an unplayed or muted string
// 0 is an open string
// Strings are numbered from 1 with low numbers near the top of the guitar (low numbers are low notes)
// TODO THIS IS THE OPPOSITE OF STANDARD STRING NUMBERING where thinnest string is 1

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

const GUITAR_STRINGS = [1, 2, 3, 4, 5, 6];

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
 * @returns { GStringCommand }
 */
function parseCommand(x) {
    if (x === UNUSED) {
        return x;
    }

    return parseInt(x, 10);
}

/**
 * Given a string like '0 x 2 3 0 0', return an array of objects
 * Strings that are not played or are muted are not returned as objects
 * @param { string } text 
 * @returns { GStringPosition[] }
 */
export function parseStringPositions(text) {
    const positions = text.toLowerCase().split(" ").filter(fp => fp.length > 0).map(parseCommand).map((fret, n) => {
        return { string: n + 1, fret };
    }).filter(o => o.fret !== UNUSED);

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
        const strings = (p[1] ? p[1].split("").map(x => parseInt(x, 10)) : []).toSorted((a, b) => b - a);
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
 * the highest string number (bottom of the guitar)
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
        return -sd;
    }).map(o => ({ fret: o.fret, strings: [o.string] }));

    const considerBars = options?.bars || options?.hiddenBars || options?.interiorBars;

    let previous = undefined;
    for (let o of sortedPositions) {
        if (previous?.fret === o.fret && considerBars) {
            const nextString = previous.strings.at(-1) - 1;
            // contiguous bar candidate
            if (o.strings[0] === nextString) {
                previous.strings.push(...o.strings);
                o.disabled = true;
                continue;
            } else if (options?.hiddenBars) {
                const missing = range(o.strings[0] + 1, nextString).toReversed();
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

class Chord {
    /** @type string */
    name;

    /** @type string */
    strings;

    /** @type string */
    fingers;
}
