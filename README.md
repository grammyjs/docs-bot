# grammYdocsbot

The [@grammYdocsbot](https://t.me/grammYdocsbot) is a Telegram bot that can be used to quickly search and send links to the documentation website of the grammY bot framework.
It is used in inline mode, i.e. by typing _@grammydocsbot search query_ in any chat field, and by selecting an article.
This is mainly useful in the [@grammyjs](https://t.me/grammyjs) community chat.

Internally, it reuses the Algolia search index that powers the search bar on <https://grammy.dev>.

The bot also sends Instant View pages.
This repo contains a set of rules (`rhash=ca1d23e111bcad`) which can generate an IV article.
The links are injected via zero-width spaces.
The rules are also uploaded to this repo in the `iv-rules.txt` file.
However, the rules are not perfect yet.
If you know Instant View or are able to write some XPath 1.0, please help out.
https://github.com/grammyjs/docs-bot/issues/1 is used to track progress for this.
