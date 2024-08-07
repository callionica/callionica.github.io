// A trie implementation in JavaScript 
// This trie holds multiple values, so terminals are represented by a collection of values
// A word is like a set of keys: each prefix of the word is a key
// (so the values are stored at every node/letter of the word)

/** @typedef { string } Letter */
/** @typedef { { key: Letter; values: Set; terminals?: Set; } } LetterNode */ // & Record<Letter, LetterNode>
/** @typedef { LetterNode[] } LetterPath */

/**
 * @param { LetterNode } node
 */
function children(node) {
  return Object.entries(node).filter(([k, v]) => k.length === 1).map(([k, v]) => v);
}

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
export function getPath(root, word) {
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

const wildcard = "."; // Any single character

/**
 * Returns the longest paths matching a prefix of the input word including wildcards.
 * @param { LetterNode } root 
 * @param { string } word 
 * @returns { LetterPath[] }
 */
export function getPathsWithWildcards(root, word) {
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
      const roots = children(current);
      // console.log(roots);

      // If there aren't any further nodes, just return the result we have
      if (roots.length === 0) {
        break;
      }

      // Treat each node as a root then combine the results with the results we had already obtained
      /** @type LetterPath[] */
      const paths = roots.flatMap(r => {
        const paths = getPathsWithWildcards(r, remaining);
        // console.log("SUB", subresult);
        if (paths.length === 0) {
          return [[...result, r]];
        }
        return paths.map(path => [...result, r, ...path]);
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
 * @param { LetterPath[] | undefined } result 
 */
export function getPathsWithReplace(root, word, result) {
  result = result ?? [];
  for (let index = 0; index < word.length; ++index) {
    const replacement = [...word];
    replacement[index] = wildcard;
    const paths = getPathsWithWildcards(root, replacement.join(""));
    for (const path of paths) {
      if (path.length > index) { // Ignore results unaffected by the replacement
        result.push(path);
      }
    }
  }
  return result; // result.sort((a, b) => b.length - a.length);
}

/**
 * Removes each character in the word so that single character errors can be found
 * (Doesn't require wildcards)
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { LetterPath[] | undefined } result 
 */
export function getPathsWithDelete(root, word, result) {
  result = result ?? [];
  for (let index = 0; index < word.length; ++index) {
    const replacement = word.substring(0, index) + word.substring(index + 1);
    const paths = getPathsWithWildcards(root, replacement);
    for (const path of paths) {
      if (path.length > index) { // Ignore results unaffected by the replacement
        result.push(path);
      }
    }
  }
  return result; // result.sort((a, b) => b.length - a.length);
}

/**
 * Adds a wildcard between each character in the word so that single character errors can be found
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { LetterPath[] | undefined } result 
 */
export function getPathsWithAdd(root, word, result) {
  result = result ?? [];
  for (let index = 0; index <= word.length; ++index) {
    const replacement = word.substring(0, index) + wildcard + word.substring(index);
    const paths = getPathsWithWildcards(root, replacement);
    for (const path of paths) {
      if (path.length > index) { // Ignore results unaffected by the replacement
        result.push(path);
      }
    }
  }
  return result; // result.sort((a, b) => b.length - a.length);
}

/**
 * Swaps pairs of letters so that single pair swaps can be found
 * (Doesn't require wildcards)
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { LetterPath[] | undefined } result 
 */
export function getPathsWithSwap(root, word, result) {
  result = result ?? [];
  for (let index = 0; index < word.length - 1; ++index) {
    const replacement = [...word];
    const first = replacement[index];
    const second = replacement[index + 1];
    replacement[index] = second;
    replacement[index + 1] = first;

    const paths = getPathsWithWildcards(root, replacement.join(""));
    for (const path of paths) {
      if (path.length > index) { // Ignore results unaffected by the swap
        result.push(path);
      }
    }
  }
  return result; // result.sort((a, b) => b.length - a.length);
}

/**
 * Gets the main path and all the paths when the word has been adjusted by a single error of type: add, delete, replace, or swap 
 * @param { LetterNode } root 
 * @param { string } word 
 */
export function getPathsWithError(root, word) {
  /** @type LetterPath[] | undefined */
  const result = [];

  result.push(getPath(root, word));
  getPathsWithAdd(root, word, result);
  getPathsWithDelete(root, word, result);
  getPathsWithReplace(root, word, result);
  getPathsWithSwap(root, word, result);

  return normalizePaths(result, word);
}

/**
 * Returns a new collection of paths with duplicates removed
 * @param { LetterPath[] } paths 
 */
export function uniquePaths(paths) {
  const seen = new Set();
  return paths.filter(path => {
    const lastNode = path[path.length - 1];
    const exists = seen.has(lastNode);
    seen.add(lastNode);
    return !exists;
  });
}

/**
 * Expands the paths to include all prefixes
 * Doesn't sort, but does prevent duplicates
 * @param { LetterPath[] } paths 
 */
export function expandPaths(paths) {
  const seenPath = new Set();
  return paths.flatMap(path => {
    const result = [];
    let current = path;
    let last = current[current.length - 1];
    while (last !== undefined && !seenPath.has(last)) {
      seenPath.add(last);
      result.push(current);
      current = path.slice(0, current.length - 1);
      last = current[current.length - 1];
    }
    return result;
  });
}

/**
 * Removes prefixes from the set of paths (for example, [ABCDE, ABC] -> [ABCDE])
 * Must be sorted by longest first prior to calling
 * @param { LetterPath[] } paths 
 */
export function condensePaths(paths) {
  const seen = new Set();
  return paths.filter(path => {
    const last = path[path.length - 1];
    if (seen.has(last)) { return false; }
    path.forEach(node => seen.add(node));
    return true;
  });
}

/**
 * Counts the number of elements in common at the start of both sequences
 * @param { LetterPath } path
 * @param { string } word
 */
export function commonPrefixCount(path, word) {
  let count = 0;
  for (let index = 0; index < Math.min(path.length, word.length); ++index) {
    if (path[index].key === word[index]) {
      ++count;
    } else {
      break;
    }
  }
  return count;
}

/**
 * @param { LetterPath } path 
 * @returns boolean
 */
function hasTerminals(path) {
  return path.at(-1)?.terminals !== undefined;
}

/**
 * Sorts paths longer first then by name with priority to names with longest prefix match to word
 * @param { LetterPath[] } paths 
 * @param { string | undefined } word 
 */
export function sortPaths(paths, word) {

  paths.sort((p1, p2) => {
    // Longer paths are better, but terminals get a boost
    const l1 = p1.length + (hasTerminals(p1) ? 1 : 0);
    const l2 = p2.length + (hasTerminals(p2) ? 1 : 0);
    const score = l2 - l1;
    if (score !== 0) {
      return score;
    }

    if (word !== undefined) {
      const cp1 = commonPrefixCount(p1, word);
      const cp2 = commonPrefixCount(p2, word);
      if (cp1 !== cp2) {
        return cp2 - cp1;
      }
    }

    const k1 = p1.map(n => n.key).join("");
    const k2 = p2.map(n => n.key).join("");
    return k1.localeCompare(k2);
  });
  return paths;
}

/**
 * Returns a collection of unique, sorted paths
 * @param { LetterPath[] } paths 
 * @param { string | undefined } word 
 */
export function normalizePaths(paths, word) {
  return condensePaths(sortPaths(paths, word));
}

/**
 * Expands a path into a list of values covered by any prefix of the path
 * starting with those that cover the longest prefixes.
 * @param { LetterPath } path 
 * @param { Value[] | undefined } result 
 */
function pathToValues(path, result) {
  result = result ?? [];

  const seen = new Set();
  const fullKey = path.map(n => n.key).join("");
  for (let index = path.length - 1; index >= 0; --index) {
    const key = fullKey.substring(0, index + 1);
    const currentPath = path.slice(0, index + 1);
    const node = path[index];
    if (node.terminals !== undefined) {
      for (const value of node.terminals) {
        if (!seen.has(value)) {
          result.push({ key, path: currentPath, value, isTerminal: true });
        }
        seen.add(value);
      }
    }
    for (const value of node.values) {
      if (!seen.has(value)) {
        result.push({ key, path: currentPath, value, isTerminal: false });
      }
      seen.add(value);
    }
  }
  return result;
}

/** @typedef { { path: LetterPath; value: T; isTerminal: boolean; } } Value **/
/** @typedef { Value[] } ValueList **/
/** @typedef { { path: LetterPath; isTerminal: boolean; listRank: number; rank: number; } } Match **/
/** @typedef { { value: T; matches: Match[] } } ValueMatch **/

/**
 * @param { ValueMatch } a 
 * @param { ValueMatch } b 
 */
function compareValueMatch(a, b) {

  function score(fn) {
    const fn2 = (previous, match) => previous + fn(match);
    const scoreA = a.matches.reduce(fn2, 0);
    const scoreB = b.matches.reduce(fn2, 0);
    return scoreB - scoreA; // higher score ordered first by default
  }

  // The primary score is how many letters across all words were matched
  // with a boost for a terminal match
  const lengthScore = score(match => match.path.length + (match.isTerminal ? 1 : 0));
  if (lengthScore !== 0) {
    return lengthScore;
  }

  // If we're still equal, we see if one matched more words than the other
  if (a.matches.length !== b.matches.length) {
    return b.matches.length - a.matches.length;
  }

  {
    // Now take the longest individual match path
    const scoreA = Math.max(...a.matches.map(match => match.path.length));
    const scoreB = Math.max(...b.matches.map(match => match.path.length));
    const score = scoreB - scoreA;
    if (score !== 0) {
      return score;
    }
  }

  // If an item has 1st place and 3rd, it comes after 1st place and 2nd
  // (This is where prefix matching of the word comes in because that controls the ranking within a list)
  const rankScore = score(match => match.rank);
  if (rankScore !== 0) {
    return -rankScore; // lower rank number is better (note we've already determined same number of matches)
  }

  // If the matched letter count is the same, we count how many matches were complete words
  const terminalScore = score(match => match.isTerminal ? 1 : 0);
  if (terminalScore !== 0) {
    return terminalScore;
  }

  // If a match comes from the first list (word), that's better than a match from the 3rd list (word)
  const listRankScore = score(match => match.listRank);
  if (listRankScore !== 0) {
    return -listRankScore; // lower rank number is better (note we've already determined same number of matches)
  }

  return a.value.title.localeCompare(b.value.title); // TODO
}

/**
 * Given multiple lists of values ordered by preference
 * (typically from searching on separate words)
 * we can combine them by ordering by their properties plus
 * their index within their source list if necessary
 * @param { ValueList[] } lists 
 **/
export function combineValueLists(lists) {
  /** @type Map<T, ValueMatch> **/
  const map = new Map();

  /**
   * @param { T } k 
   * @param { ValueMatch } v 
   */
  function set(k, v) {
    map.set(k, v);
    return v;
  }

  lists.forEach((list, listIndex) => {
    list.forEach((item, itemIndex) => {
      const match = { path: item.path, isTerminal: item.isTerminal, listRank: listIndex, rank: itemIndex };
      const entry = map.get(item.value) ?? set(item.value, { value: item.value, matches: [] });
      entry.matches.push(match);
    });
  });

  return [...map.values()].sort(compareValueMatch);
}

/**
 * @param { LetterNode } root 
 * @param { string } word 
 * @param { number } limit The maximum number of results to return
 * @returns { Value[] }
 */
export function getValuesWithError(root, word, limit = 20) {
  /** @type Value[] */
  const result = [];

  getPathsWithError(root, word).forEach(path => pathToValues(path, result));

  // We need to re-sort the values because pathToValues expands a path back along all its prefixes
  // but doesn't ensure that the result collection is sorted at the end

  // We need to eliminate duplicate values after sorting so that only the best paths are chosen

  // Note that we can't get pathToValues to eliminate dupes across calls
  // Consider we might have two paths: CORD and CORK
  // pathToValues on CORD will include COR (Cork) which needs de-duping so that CO (Cork) and C (Cork) are excluded
  // but calling pathToValues again with CORK and the same de-duper would eliminate CORK (Cork)

  const seen = new Set();

  return result.sort((a, b) => {

    const scoreA = a.path.length + (a.isTerminal ? 1 : 0);
    const scoreB = b.path.length + (b.isTerminal ? 1 : 0);
    const score = scoreB - scoreA;
    if (score !== 0) {
      return score;
    }

    if (word !== undefined) {
      const cp1 = commonPrefixCount(a.path, word);
      const cp2 = commonPrefixCount(b.path, word);
      if (cp1 !== cp2) {
        return cp2 - cp1;
      }
    }

    if (a.isTerminal !== b.isTerminal) {
      return a.isTerminal ? -1 : +1;
    }

    return a.key.localeCompare(b.key);
  }).filter(v => {
    if (seen.has(v.value)) {
      return false;
    }
    seen.add(v.value);
    return true;
  }).slice(0, limit); // TOO
}

/**
 * @param { LetterNode } root 
 * @param { string[] } word
 * @param {number} limit
 */
export function getValuesByWords(root, words, limit = 20) {
  return combineValueLists(words.map(word => getValuesWithError(root, word, Infinity))).slice(0, limit);
}

/**
 * Returns each value that matches a prefix of the word, ordered by prefix length
 * with terminals before non-terminals
 * @param { LetterNode } root 
 * @param { string } word
 * @returns { Value[] }
 */
export function getValues(root, word) {
  const path = getPath(root, word);
  return pathToValues(path);
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
   * @returns { { key: string; value: T; isTerminal: boolean; }[] }
   */
  getValuesWithError(word) {
    return getValuesWithError(this, word);
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