export interface ParseResult {
  /** Current search term */
  currentQuery?: LabeledQuery;
  /** Completed searches */
  completedQueries: LabeledQuery[];
  /** Interspersed text fragments */
  texts: string[];
}
export interface LabeledQuery {
  query: string;
  label?: string;
}

export function parse(query: string) {
  const result: ParseResult = {
    completedQueries: [],
    texts: [],
  };
  const parts = query.split("+");
  const len = parts.length;
  if (len === 1) { // includes no '+' chars
    result.currentQuery = { query };
  } else {
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      if (i % 2 === 0) result.texts.push(part);
      else {
        let [query, label] = part.split("|");
        if (label === undefined && query.endsWith("!")) {
          label = query.substring(0, query.length - 1);
        }
        result.completedQueries.push({ query, ...{ label } });
      }
    }
    if (len % 2 === 0) {
      result.currentQuery = result.completedQueries.pop()!;
    }
  }
  return result;
}
