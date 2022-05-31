// deno-lint-ignore-file no-explicit-any camelcase
import {
  Bot,
  InlineKeyboard,
  webhookCallback,
} from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { serve } from "https://deno.land/std@0.141.0/http/server.ts";
import {
  InlineQueryResultArticle,
  MessageEntity,
} from "https://deno.land/x/grammy@v1.8.3/platform.deno.ts";

const ZWSP = "\u200b"; // zero-width space character

const APPLICATION_ID = "RBF5Q0D7QV";
const API_KEY = "33782ffb584887e3b8cdf9e760ea8e60";

const SEARCH_HOST = `https://${APPLICATION_ID}-dsn.algolia.net`;
const SEARCH_INDEX = "grammy";
const SEARCH_URL = `${SEARCH_HOST}/1/indexes/${SEARCH_INDEX}/query`;

const token = Deno.env.get("BOT_TOKEN");
if (token === undefined) throw new Error("Missing BOT_TOKEN");

const bot = new Bot(token);

bot.drop((ctx) => ctx.msg?.via_bot?.id === ctx.me.id).on(
  "message",
  (ctx) =>
    ctx.reply("I can search for grammY documentation inline.", {
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("Search here").row()
        .switchInline("Share article"),
    }),
);

const enc = new TextEncoder();
const headers = {
  "X-Algolia-API-Key": API_KEY,
  "X-Algolia-Application-Id": APPLICATION_ID,
};
async function search(query: string): Promise<{ hits: Hit[] }> {
  const params = new URLSearchParams({ query, facetFilters: '["lang:en-US"]' });
  const body = enc.encode(JSON.stringify({ params: params.toString() }));
  const res = await fetch(SEARCH_URL, { method: "POST", headers, body });
  return await res.json();
}
interface Hit {
  objectID: string;
  content: string;
  url: string;
  hierarchy: Record<`lvl${1 | 2 | 3 | 4 | 5 | 6}`, string>;
}

bot.on("inline_query", async (ctx) => {
  const match = matchQuery(ctx.inlineQuery.query);
  const { hits } = await search(match.query);
  hits.length = Math.min(50, hits.length);
  await ctx.answerInlineQuery(
    hits.map((hit): InlineQueryResultArticle => {
      const { title, description, text, entities } = renderMessage(hit, match);
      return {
        id: hit.objectID,
        type: "article",
        title,
        description,
        input_message_content: { message_text: text, entities },
      };
    }),
    { cache_time: 0 }, // 24 hours
  );
});

if (Deno.env.get("DEBUG")) {
  bot.catch(console.error);
  bot.start();
} else {
  serve(webhookCallback(bot, "std/http"));
}

function renderMessage(hit: Hit, match: QueryMatch) {
  const { title, iv, url } = getText(hit, { strip: !hit.hierarchy.lvl2 });
  let text: string;
  let description: string;
  let entities: MessageEntity[];
  if (match.original !== match.query) {
    text = description = replaceQueryMatch(match, url);
    const offset = match.index - 1;
    entities = [{ type: "text_link", offset, length: 1, url: iv }];
  } else {
    const content = hit.content ?? "Title matches the search query";
    text = `${title}${ZWSP}\n\n${url}`;
    description = `${title}: ${content}`;
    entities = [
      { type: "bold", offset: 0, length: title.length },
      { type: "text_link", offset: title.length, length: 1, url: iv },
    ];
  }
  return { title, text, description, entities };
}

function getText(hit: Hit, options: { strip: boolean }) {
  const title = getTitle(hit);
  const url = options.strip ? stripAnchor(hit.url) : hit.url;
  const iv = `https://t.me/iv?rhash=ca1d23e111bcad&url=${url}`;
  return { title, iv, url };
}
function getTitle(hit: Hit) {
  const h = hit.hierarchy;
  const headers = [h.lvl1, h.lvl2, h.lvl3, h.lvl4, h.lvl5, h.lvl6];
  return headers.filter((t) => !!t).join(" » ");
}
function stripAnchor(url: string) {
  const index = url.lastIndexOf("#");
  return index >= 0 ? url.substring(0, index) : url;
}

interface QueryMatch {
  original: string;
  query: string;
  index: number;
}
function matchQuery(original: string): QueryMatch {
  const match = /\+([^\+]+)\+/g.exec(original);
  if (match !== null) return { original, query: match[0], index: match.index };
  const index = original.indexOf("+");
  if (index >= 0) return { original, query: original.substring(index), index };
  return { original, query: original, index: 0 };
}
function replaceQueryMatch(match: QueryMatch, text: string) {
  if (match.original === match.query) return text;
  const l = match.index;
  const r = match.index + match.query.length;
  return match.original.substring(0, l) + text + match.original.substring(r);
}
