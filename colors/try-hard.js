// A trie implementation in JavaScript 
// This trie holds multiple values, so terminals are represented by a collection of values
// A word is like a set of keys: each prefix of the word is a key
// (so the values are stored at every node/letter of the word)

/** @typedef { string } Letter */
/** @typedef { { key: Letter; values: Set; terminals?: Set; } } LetterNode */ // & Record<Letter, LetterNode>
/** @typedef { LetterNode[] } LetterPath */

/**
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function setValues(root, word, items) {
  let current = root;
  let index = 0;
  const count = word.length;
  for (const key of word) {

    /** @type LetterNode */
    const next = current[key] ?? (current[key] = { key });
    const values = next.values ?? (next.values = new Set());
    for (const item of items) {
      values.add(item)
    }

    if (index === count - 1) {
      const terminals = next.terminals ?? (next.terminals = new Set());
      for (const item of items) {
        terminals.add(item)
      }
    }

    current = next;
    ++index;
  }
}

/**
 * Sets values passing each suffix of the word to `setValues`
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function setSuffixes(root, word, items) {
  for (let index = 0; index < word.length; ++index) {
    setValues(root, word.substring(index), items);
  }
}

/**
 * Returns the longest path matching a prefix of the input word
 * @param { LetterNode } root 
 * @param { string } word 
 * @returns { LetterPath }
 */
export function getNodes(root, word) {
  /** @type LetterNode[] */
  const result = [];
  let current = root;
  for (const key of word) {
    /** @type LetterNode */
    const next = current[key];
    if (next === undefined) {
      break;
    }
    result.push(next);
    current = next;
  }
  return result;
}

const alphabet = [..."abcdefghijklmnopqrstuvwxyz"];
const wildcard = ".";

/**
 * Returns the longest paths matching a prefix of the input word including wildcards.
 * @param { LetterNode } root 
 * @param { string } word 
 * @returns { LetterPath[] }
 */
export function getNodesWithWildcards(root, word) {
  /** @type LetterNode[] */
  const result = [];
  let current = root;
  let remainStart = 0; 
  for (const key of word) {
    ++remainStart;
    if (key === wildcard) {
      // Create a word from the unused parts of the current word
      const remaining = word.substring(remainStart);
      console.log(remaining);
      // Get all the possible nodes that can act as roots for the new word
      /** @type LetterNode[] */
      const roots = alphabet.map(k => current[k]).filter(r => r !== undefined);
      // console.log(roots);

      // If there aren't any further nodes, just return the result we have
      if (roots.length === 0) {
        break;
      }

      // Treat each node as a root then combine the results with the results we had already obtained
      /** @type LetterPath[] */
      const paths = roots.flatMap(r => {
        const subresult = getNodesWithWildcards(r, remaining);
        // console.log("SUB", subresult);
        if (subresult.length === 0) {
          return [[...result, r]];
        }
        return subresult.map(path => [...result, r, ...path]);
      });
      return paths;

    } else {
      /** @type LetterNode */
      const next = current[key];
      if (next === undefined) {
        break;
      }
      result.push(next);
      current = next;
    }
  }

  return result.length === 0 ? [] : [result];
}

/**
 * Replaces each character in the word with a wildcard so that single character replacements can be found
 * @param { LetterNode } root 
 * @param { string } word 
 */
export function getNodesWithReplace(root, word, all) {
  all = all ?? [];
  for (let index = 0; index < word.length; ++index) {
    const replacement = [...word];
    replacement[index] = wildcard;
    const results = getNodesWithWildcards(root, replacement.join(""));
    for (const result of results) {
      if (result.length > index) { // Ignore results unaffected by the replacement
        all.push(result);
      }
    }
  }
  return all.sort((a, b) => b.length - a.length);
}

/**
 * Removes each character in the word so that single character errors can be found
 * (Doesn't require wildcards)
 * @param { LetterNode } root 
 * @param { string } word 
 */
export function getNodesWithDelete(root, word, all) {
  all = all ?? [];
  for (let index = 0; index < word.length; ++index) {
    const replacement = word.substring(0, index) + word.substring(index + 1);
    const results = getNodesWithWildcards(root, replacement);
    for (const result of results) {
      if (result.length > index) { // Ignore results unaffected by the replacement
        all.push(result);
      }
    }
  }
  return all.sort((a, b) => b.length - a.length);
}

/**
 * Adds a wildcard between each character in the word so that single character errors can be found
 * @param { LetterNode } root 
 * @param { string } word 
 */
export function getNodesWithAdd(root, word, all) {
	all = all ?? [];
  for (let index = 0; index < word.length; ++index) {
    const replacement = word.substring(0, index) + wildcard + word.substring(index);
    const results = getNodesWithWildcards(root, replacement);
    for (const result of results) {
      if (result.length > index) { // Ignore results unaffected by the replacement
        all.push(result);
      }
    }
  }
  return all.sort((a, b) => b.length - a.length);
}

/**
 * Swaps pairs of letters so that single pair swaps can be found
 * (Doesn't require wildcards)
 * @param { LetterNode } root 
 * @param { string } word 
 */
export function getNodesWithSwap(root, word, all) {
  all = all ?? [];
  for (let index = 0; index < word.length - 1; ++index) {
    const replacement = [...word];
    const first = replacement[index];
    const second = replacement[index + 1];
    replacement[index] = second;
    replacement[index + 1] = first;

    const results = getNodesWithWildcards(root, replacement.join(""));
    for (const result of results) {
      if (result.length > index) { // Ignore results unaffected by the swap
        all.push(result);
      }
    }
  }
  return all.sort((a, b) => b.length - a.length);
}

/**
 * Returns each value that matches a prefix of the word, ordered by prefix length
 * with terminals before non-terminals
 * @param { LetterNode } root 
 * @param { string } word
 * @returns { { key: string; value: T; isTerminal: boolean; }[] }
 */
export function getValues(root, word) {
  const nodes = getNodes(root, word);
  const fullKey = nodes.map(n => n.key).join("");

  const seen = new Set();
  const result = [];
  for (let index = nodes.length - 1; index >= 0; --index) {
    const key = fullKey.substring(0, index + 1);
    const node = nodes[index];
    if (node.terminals !== undefined) {
      for (const value of node.terminals) {
        if (!seen.has(value)) {
          result.push({ key, value, isTerminal: true });
        }
        seen.add(value);
      }
    }
    for (const value of node.values) {
      if (!seen.has(value)) {
        result.push({ key, value, isTerminal: false });
      }
      seen.add(value);
    }
  }
  return result;
}

/**
 * @template { object } T
 */
export class Trie {

  /**
   * @param { string } word
   * @returns { { key: string; value: T; isTerminal: boolean; }[] }
   */
  getValues(word) {
    return getValues(this, word);
  }

  /**
   * @param { string } word
   * @param { Iterable<T> } items
   */
  setValues(word, items) {
    setValues(this, word, items);
  }

  /**
   * @param { string } word
   * @param { Iterable<T> } items
   */
  setSuffixes(word, items) {
    setSuffixes(this, word, items);
  }
}

/*

HIT-SKIP

A structure for finding words with 1 replacement
GOBLIN ->[{g: v}, {o: v}, ...]

BOBLIN
initial set: union values from first two positions: BO
for each position:
if value from initial set is not present, move to marked set
if value from marked set is not present, remove it

UNDERBAR

REPLACEMENTS
Create N keys for a word of length N GOBLIN -> _OBLIN, G_BLIN, GO_LIN, etc
Create N keys for a query of length N BOBLIN -> _OBLIN, B_BLIN
Look up by underbar key

SWAPS
GOBLIN -> OGBLIN GBOLIN GOLBIN GOBILN GOBLNI

DELETIONS
N keys
GOBLIN -> OBLIN GBLIN GOLIN GOBIN GOBLN [GOBLI X]


=========
Prefix+Suffix is similar to a single error

=========
trie should map to word, not object, when multiple objects use same words
allows scoring against the word being matched

*/