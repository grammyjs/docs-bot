import {
  Bot,
  InlineKeyboard,
  type InlineQueryResultArticle,
  serve,
  webhookCallback,
} from "./deps.ts";
import { parse } from "./parse.ts";
import {
  render,
  renderInputMessageContent,
  renderNext,
  renderSingle,
} from "./render.ts";
import { search, searchOne } from "./search.ts";

const token = Deno.env.get("BOT_TOKEN");
if (token === undefined) throw new Error("Missing BOT_TOKEN");

const searchKeyboard = new InlineKeyboard()
  .switchInlineCurrent("Search here").row()
  .switchInline("Share article");

const bot = new Bot(token);

bot.command(
  "help",
  (ctx) =>
    ctx.reply(
      `Welcome to the grammY documentation bot!

This bot uses the search that you find at the top of \
grammy.dev. Type @${ctx.me.username} followed by a \
search query to quickly share links to grammY docs.

If you want to send a message with a link to the docs \
embedded in it, you can surround your +search query+ \
by '+' characters. This will insert the title of the \
page as a text link to the respective URL.
– Use +search query|this link+ to send a custom link text.
– Use +search query!+ with a '!' suffix to use the \
search query as the link text.
– Use +search query/+ with a '/' suffix to share the \
URL itself instead of the page title.

To find results in specific locales, you can prepend '!locale-code' to your search query.
- For Spanish, use '!es search query'.
- For Indonesian, use '!id search query'.
- For Ukrainian, use '!uk search query'.
- For Chinese, use '!zh search query'.

You may also put them all together like this:
'!es +search query|this link+'

Join @grammyjs!`,
      { reply_markup: searchKeyboard },
    ),
);

bot.drop((ctx) => ctx.msg?.via_bot?.id === ctx.me.id)
  .on("message", async (ctx) => {
    await ctx.reply("I can search for grammY documentation inline. /help", {
      reply_markup: searchKeyboard,
    });
  });

bot.on("inline_query", async (ctx) => {
  const { query, offset } = ctx.inlineQuery;
  const { currentQuery, texts, completedQueries, lang } = parse(query);
  const links = await Promise.all(
    completedQueries.map(async (query) => ({
      query,
      hit: await searchOne(query.query),
    })),
  );
  let nextOffset = offset;
  let results: InlineQueryResultArticle[];
  if (currentQuery === undefined) {
    // only completed queries, render them
    results = [render(texts, links)];
  } else {
    // pending current query
    const off = parseInt(offset, 10);
    const hits = isNaN(off)
      ? await search(currentQuery.query, lang)
      : await search(currentQuery.query, lang, { offset: off });
    nextOffset += hits.length;
    if (texts.length === 0) {
      // no rendering
      results = hits.map(renderSingle);
    } else {
      // render and continue to search
      const content = renderInputMessageContent(texts, links);
      results = hits.map((hit) =>
        renderNext(content, { query: currentQuery, hit })
      );
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
