import {
  type InlineQueryResultArticle,
  type InputTextMessageContent,
  type MessageEntity,
} from "./deps.ts";
import { type Hit } from "./search.ts";

const MAX_DESC_LEN = 300; // max number of characters in result descriptions
const ZWSP = "\u200b"; // zero-width space character
const TYPE = { type: "text_link" } as const;
const IV_RHASH = "d32ab671cec0eb";

export interface QueryHit {
  query: { query: string; label?: string };
  hit: Hit;
}
export interface Link {
  text?: string;
  url: string;
}

export function renderSingle(h: Hit): InlineQueryResultArticle {
  const link = getLink(h);
  const title = link.text;
  const message = renderSingleInputMessageContent(link);
  return {
    id: h.objectID.substring(0, 15) + "|" +
      h.objectID.substring(h.objectID.length - 15),
    type: "article",
    title,
    description: `${title}: ${h.content ?? "Title matches the search query"}`
      .substring(0, MAX_DESC_LEN),
    input_message_content: message,
  };
}
function renderSingleInputMessageContent({ text, url }: Required<Link>) {
  const message_text = `${text}${ZWSP}\n\n${url}`;
  const entities: MessageEntity[] = [
    { type: "bold", offset: 0, length: text.length },
    { ...TYPE, offset: text.length, length: 1, url: toIV(url) },
  ];
  return { message_text, entities };
}

export function render(
  texts: string[],
  hits: QueryHit[],
): InlineQueryResultArticle {
  const content = renderInputMessageContent(texts, hits);
  return {
    id: crypto.randomUUID(),
    type: "article",
    title: `Share ${hits.length === 1 ? "link" : `${hits.length} links`}`,
    description: content.message_text.substring(0, MAX_DESC_LEN),
    input_message_content: content,
  };
}
export function renderInputMessageContent(
  texts: string[],
  hits: QueryHit[],
): InputTextMessageContent {
  let message = "";
  const entities: MessageEntity[] = [];
  if (hits.length > 0) {
    message += ZWSP;
    entities.push({
      ...TYPE,
      offset: 0,
      length: 1,
      url: toIV(hits[0].hit.url),
    });
  }
  for (let i = 0; i < texts.length; i++) {
    message += texts[i];
    if (i < hits.length) {
      const offset = message.length;
      const { query, hit } = hits[i];
      const text = query.label ?? getLabel(query.query, hit);
      message += text;
      entities.push({ ...TYPE, offset, length: text.length, url: hit.url });
    }
  }
  return { message_text: message, entities };
}

export function renderNext(
  existing: InputTextMessageContent,
  { query, hit }: QueryHit,
): InlineQueryResultArticle {
  const { message_text, entities = [] } = existing;
  const text = query.label ?? getLabel(query.query, hit);
  const resultText = message_text + text;
  return {
    id: crypto.randomUUID(),
    type: "article",
    title: text,
    description: resultText.substring(0, MAX_DESC_LEN),
    input_message_content: {
      message_text: resultText,
      entities: [...entities, {
        type: "text_link",
        offset: message_text.length,
        length: text.length,
        url: hit.url,
      }],
    },
  };
}

function getLabel(query: string, hit: Hit) {
  if (query.endsWith("!")) {
    return query.substring(0, query.length - 1);
  } else if (query.endsWith("/")) {
    return hit.url;
  } else {
    return getTitle(hit);
  }
}
function getLink(hit: Hit, strip = !hit.hierarchy.lvl2): Required<Link> {
  const text = getTitle(hit);
  const url = strip ? stripAnchor(hit.url) : hit.url;
  return { text, url };
}
function getTitle(hit: Hit) {
  const h = hit.hierarchy;
  const headers = [h.lvl1, h.lvl2, h.lvl3, h.lvl4, h.lvl5, h.lvl6];
  return headers.filter((t) => !!t).join(" / ");
}
function stripAnchor(url: string) {
  const index = url.lastIndexOf("#");
  return index > 0 ? url.substring(0, index) : url;
}
function toIV(url: string) {
  return `https://t.me/iv?rhash=${IV_RHASH}&url=${url}`;
}
