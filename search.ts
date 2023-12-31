const APPLICATION_ID = "RBF5Q0D7QV";
const API_KEY = "33782ffb584887e3b8cdf9e760ea8e60";

const SEARCH_HOST = `https://${APPLICATION_ID}-dsn.algolia.net`;
const SEARCH_INDEX = "grammy";
const SEARCH_URL = `${SEARCH_HOST}/1/indexes/${SEARCH_INDEX}/query`;

const enc = new TextEncoder();
const headers = {
  "X-Algolia-API-Key": API_KEY,
  "X-Algolia-Application-Id": APPLICATION_ID,
};
export interface SearchPaginationOptions {
  offset: number;
  length?: number;
}
export interface Hit {
  objectID: string;
  content: string;
  url: string;
  hierarchy: Record<`lvl${1 | 2 | 3 | 4 | 5 | 6}`, string>;
}
export async function searchOne(query: string) {
  const [hit] = await search(query, { offset: 0, length: 1 });
  return hit;
}
export async function search(
  query: string,
  lang: string,
  options?: SearchPaginationOptions,
): Promise<Hit[]> {
  const page = options === undefined ? undefined : {
    offset: options.offset.toString(),
    length: options.length?.toString(),
  };
  const params = new URLSearchParams({
    query,
    ...page,
    facetFilters: `["${lang}"]`,
  });
  const body = enc.encode(JSON.stringify({ params: params.toString() }));
  const res = await fetch(SEARCH_URL, { method: "POST", headers, body });
  const { hits = [] } = await res.json();
  return hits;
}
