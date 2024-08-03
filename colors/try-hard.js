// A trie implementation in JavaScript 

/** @typedef { { key: string; items: Set } } LetterNode */

/**
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function setWord(root, word, items, collectionName = "prefix") {
  let current = root;
  for (const key of word) {
    /** @type LetterNode */
    let next = current[key];
    if (next === undefined) {
      next = { key };
      next[collectionName] = new Set(items);
      current[key] = next;
    } else {
      for (const item of items) {
        const collection = next[collectionName] ?? (next[collectionName] = new Set());
        collection.add(item)
      }
    }
    current = next;
  }
}

/**
 * Sets 
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function setEveryWord(root, word, items) {
  for (let index = 0; index < word.length; ++index) {
    setWord(root, word.substring(index), items, index === 0 ? "prefix" : "inner");
  }
}

/**
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { object[] } items 
 */
export function getWord(root, word) {
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