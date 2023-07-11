export interface ParseResult {
  /** Current search term */
  currentQuery?: LabeledQuery;
  /** Completed searches */
  completedQueries: LabeledQuery[];
  /** Interspersed text fragments */
  texts: string[];
  lang: string;
}
export interface LabeledQuery {
  query: string;
  label?: string;
}

export function parse(query: string) {
  let facetFilters = "lang:en-US";
  const re = /^!(es|id|uk|zh)(?:\s)(.*)$/i;
  const match = query.match(re);

  if (match) {
    const [, lang, _query] = match;
    switch (lang.toLowerCase()) {
      case "es":
        facetFilters = "lang:es-ES";
        break;
      case "id":
        facetFilters = "lang:id";
        break;
      case "uk":
        facetFilters = "lang:uk-UA";
        break;
      case "zh":
        facetFilters = "lang:zh";
        break;
    }
    query = _query;
  }

  const result: ParseResult = {
    completedQueries: [],
    texts: [],
    lang: facetFilters,
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
        const [query, label] = part.split("|");
        result.completedQueries.push({ query, ...{ label } });
      }
    }
    if (len % 2 === 0) {
      result.currentQuery = result.completedQueries.pop()!;
    }
  }
  return result;
}
