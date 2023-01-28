import {
  type InlineQueryResultArticle,
  type InputTextMessageContent,
  type MessageEntity,
} from "./deps.ts";
import { type Hit } from "./search.ts";

const ZWSP = "\u200b"; // zero-width space character

export interface Link {
  text: string;
  url: string;
}

export function renderSingle(h: Hit): InlineQueryResultArticle {
  const link = getLink(h);
  const title = link.text;
  const message = renderSingleInputMessageContent(link);
  return {
    id: h.objectID,
    type: "article",
    title,
    description: `${title}: ${h.content ?? "Title matches the search query"}`,
    input_message_content: message,
  };
}
function renderSingleInputMessageContent({ text, url }: Link) {
  const message_text = `${text}${ZWSP}\n\n${url}`;
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: text.length },
    { type: "text_link", offset: text.length, length: 1, url: toIV(url) },
  ];
  return { message_text, entities };
}

export function render(
  texts: string[],
  links: Link[],
): InlineQueryResultArticle {
  const content = renderInputMessageContent(texts, links);
  return {
    id: crypto.randomUUID(),
    type: "article",
    title: `Share ${links.length === 1 ? "link" : `${links.length} links`}`,
    description: content.message_text,
    input_message_content: content,
  };
}
export function renderInputMessageContent(
  texts: string[],
  links: Link[],
): InputTextMessageContent {
  let message = "";
  const entities: MessageEntity[] = [];
  for (let i = 0; i < texts.length; i++) {
    message += texts[i];
    if (i < links.length) {
      let offset = message.length;
      const { text, url } = links[i];
      if (i === 0) {
        message += ZWSP;
        offset = message.length;
        entities.push({ type: "text_link", offset, length: 1, url: toIV(url) });
      }
      message += text;
      entities.push({ type: "text_link", offset, length: text.length, url });
    }
  }
  return { message_text: message, entities };
}

export function renderNext(
  existing: InputTextMessageContent,
  hit: Hit,
  label?: string,
): InlineQueryResultArticle {
  const { message_text, entities = [] } = existing;
  const { text, url } = getLink(hit);
  const labelOrText = label ?? text;
  const resultText = message_text + labelOrText;
  return {
    id: crypto.randomUUID(),
    type: "article",
    title: text,
    description: resultText,
    input_message_content: {
      message_text: resultText,
      entities: [...entities, {
        type: "text_link",
        offset: message_text.length,
        length: labelOrText.length,
        url,
      }],
    },
  };
}

function getLink(hit: Hit, strip = !hit.hierarchy.lvl2): Link {
  const text = getTitle(hit);
  const url = strip ? stripAnchor(hit.url) : hit.url;
  return { text, url };
}
export function getTitle(hit: Hit) {
  const h = hit.hierarchy;
  const headers = [h.lvl1, h.lvl2, h.lvl3, h.lvl4, h.lvl5, h.lvl6];
  return headers.filter((t) => !!t).join(" / ");
}
function stripAnchor(url: string) {
  const index = url.lastIndexOf("#");
  return index > 0 ? url.substring(0, index) : url;
}
function toIV(url: string) {
  return `https://t.me/iv?rhash=ca1d23e111bcad&url=${url}`;
}
