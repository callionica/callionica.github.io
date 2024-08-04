// A trie implementation in JavaScript 
// This trie holds multiple values, so terminals are represented by a collection of values
// A word is like a set of keys: each prefix of the word is a key
// (so the values are stored at every node/letter of the word)

/** @typedef { string } Letter */
/** @typedef { { key: Letter; values: Set; terminals?: Set; } } LetterNode */ // & Record<Letter, LetterNode>

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
 * @returns { LetterNode[] }
 */
export function getNodes(root, word) {
  /** @type LetterNode[] */
  const result = [];
  let current = root;
  for (const key of word) {
    /** @type LetterNode */
    const next = current[key];
    if (next === undefined) {
      return result;
    }
    result.push(next);
    current = next;
  }
  return result;
}

/**
 * Returns the longest paths matching a prefix of the input word including wildcards.
 * @param { LetterNode } root 
 * @param { string } word 
 * @returns { LetterNode[][] }
 */
export function getNodesWithWildcards(root, word) {
  /** @type LetterNode[] */
  const result = [];
  let current = root;
  let remainStart = 0; 
  for (const key of word) {
    ++remainStart;
    if (key === ".") {
      // Create a word from the unused parts of the current word
      const remaining = word.substring(remainStart);

      // Get all the possible nodes that can act as roots for the new word
      /** @type LetterNode[] */
      const roots = [..."abcdefghijklmnopqrstuvwxyz"].map(k => current[k]).filter(r => r !== undefined);
      console.log(remaining, roots);
      
      // If there aren't any further nodes, just return the result we have
      if (roots.length === 0) {
        return result.length === 0 ? [] : [result];
      }

      // Treat each node as a root then combine the results with the results we had already obtained
      /** @type LetterNode[][] */
      const spreads = roots.flatMap(r => {
        const subresult = getNodesWithWildcards(r, remaining);
        if (subresult.length === 0) {
          return [[...result, r]];
        }
        return subresult.map(single => [...result, r, ...single]);
      });
      return spreads;

    } else {
      /** @type LetterNode */
      const next = current[key];
      if (next === undefined) {
        return result;
      }
      result.push(next);
      current = next;
    }
  }

  return result.length === 0 ? [] : [result];
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