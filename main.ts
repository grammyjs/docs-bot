import {
  Bot,
  InlineKeyboard,
  type InlineQueryResultArticle,
  serve,
  webhookCallback,
} from "./deps.ts";
import {
  getTitle,
  render,
  renderInputMessageContent,
  renderNext,
  renderSingle,
} from "./render.ts";
import { parse } from "./parse.ts";
import { search, searchOne } from "./search.ts";

const token = Deno.env.get("BOT_TOKEN");
if (token === undefined) throw new Error("Missing BOT_TOKEN");

const bot = new Bot(token);

bot.drop((ctx) => ctx.msg?.via_bot?.id === ctx.me.id)
  .on("message", async (ctx) => {
    await ctx.reply("I can search for grammY documentation inline.", {
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("Search here").row()
        .switchInline("Share article"),
    });
  });

bot.on("inline_query", async (ctx) => {
  const { query, offset } = ctx.inlineQuery;
  const { currentQuery, texts, completedQueries } = parse(query);
  const completed = await Promise.all(
    completedQueries.map(async (query) => ({
      query,
      hit: await searchOne(query.query),
    })),
  );
  let nextOffset = offset;
  const links = completed.map(({ query, hit }) => ({
    text: query.label ?? getTitle(hit),
    url: hit.url,
  }));
  let results: InlineQueryResultArticle[];
  if (currentQuery === undefined) {
    // only completed queries, render them
    results = [render(texts, links)];
  } else {
    // pending current query
    const off = parseInt(offset, 10);
    const hits = isNaN(off)
      ? await search(currentQuery.query)
      : await search(currentQuery.query, { offset: off });
    nextOffset += hits.length;
    if (texts.length === 0) {
      // no rendering
      results = hits.map(renderSingle);
    } else {
      // render and continue to search
      const content = renderInputMessageContent(texts, links);
      results = hits.map((hit) => renderNext(content, hit, currentQuery.label));
    }
  }
  await ctx.answerInlineQuery(results, {
    next_offset: nextOffset,
    cache_time: 24 * 60 * 60, // 24 hours (algolia re-indexing)
  });
});

if (Deno.env.get("DEBUG")) {
  bot.catch(console.error);
  bot.start();
} else {
  serve(webhookCallback(bot, "std/http"));
}
