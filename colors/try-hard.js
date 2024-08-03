// A trie implementation in JavaScript 
// This trie holds multiple values, so terminals are represented by a collection of values
// A word is like a set of keys: each prefix of the word is a key
// (so the values are stored at every node/letter of the word)

/** @typedef { { key: string; values: Set; terminals?: Set; } & Record<string, LetterNode> } LetterNode */

/**
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function setValues(root, word, items, collectionName = "values", terminalCollectionName = "terminals") {
  let current = root;
  let index = 0;
  const count = word.length;
  for (const key of word) {
  
    /** @type LetterNode */
    const next = current[key] ?? (current[key] = { key });
    const collection = next[collectionName] ?? (next[collectionName] = new Set());
    for (const item of items) {
      collection.add(item)
    }
  
    if (index === count - 1) {
    	const terminalCollection = next[terminalCollectionName] ?? (next[terminalCollectionName] = new Set());
      for (const item of items) {
        terminalCollection.add(item)
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
    let next = current[key];
    if (next === undefined) {
      return result;
    }
    result.push(next);
    current = next;
  }
  return result;
}

/**
 * Returns each value that matches a prefix of the word, ordered by prefix length
 * with terminals before non-terminals
 * @param { LetterNode } root 
 * @param { string } word
 * @returns { { key: string; values: Set; }[] }
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