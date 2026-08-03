import nodeHtmlToImage from 'node-html-to-image';
import type { Buffer } from 'node:buffer';
import type { Message as DiscordMessage, Attachment as DiscordAttachment, User as DiscordUser } from "discord.js";

export interface RenderOptions {
  width?: number;
  height?: number;
  format?: "image" | "html";
  doLink?: boolean;
}

export interface RenderableUser {
  displayName?: string;
  username?: string;
  avatarURL?: string | (() => string | null) | null;
}

export interface RenderableMember {
  nickname?: string;
  roles?: {
    cache?: unknown;
  };
}

export interface RenderableAttachment {
  contentType?: string;
  url?: string;
  name?: string;
  size?: number;
}

export interface RenderableSticker {
  id?: string;
  name?: string;
}

export interface RenderableGuild {
  id?: string | number;
  members?: {
    cache?: {
      get?: (id: string | number) => any;
    };
  };
  channels?: {
    cache?: {
      get?: (id: string | number) => any;
    };
  };
  roles?: {
    cache?: {
      get?: (id: string | number) => any;
    };
  };
}

export interface RenderableMessage {
  id?: string | number;
  content?: string;
  createdAt?: Date | string | number;
  embeds?: unknown[];
  attachments?: Array<RenderableAttachment> | { size?: number; values?: () => RenderableAttachment[] } | null;
  stickers?: Array<RenderableSticker> | { size?: number; values?: () => RenderableSticker[] } | null;
  reference?: { messageId?: string | number } | null;
  channel?: {
    messages?: {
      fetch?: (messageId: string | number) => Promise<RenderableMessage | null>;
    };
  } | null;
  guild?: RenderableGuild | null;
  author?: RenderableUser | null;
  member?: RenderableMember | null;
  username?: string;
  avatarURL?: string | null;
  userColor?: string;
  name?: string;
  roleIcon?: string | null;
  reply?: ReplyMessageData | null;
}

export type RenderableMessageInput = RenderableMessage | DiscordMessage;

export interface ReplyMessageData {
  author?: RenderableUser | null;
  content?: string;
  avatarURL?: string;
  name?: string;
  userColor?: string;
}

export type RenderResult<T extends RenderOptions['format'] | undefined = undefined> =
  T extends 'html' ? string :
  T extends 'image' ? Buffer :
  string | Buffer;

/**
 * Formats a Discord timestamp to match Discord's display format
 * @param date - The date to format
 * @returns Formatted timestamp string (e.g., "Today at 14:30", "Yesterday at 09:15", "25/12/2023 16:45")
 */
function formatDiscordTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const pad = (n: number): string => n.toString().padStart(2, "0");
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (isToday) {
    return timeStr;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${timeStr}`;
  }
}

/**
 * Extracts user information from a Discord message
 * @param msg - The Discord message to extract user info from
 * @returns Object containing avatar URL, display name, user color, and role icon
 */
function extractUserInfo(msg: RenderableMessageInput): {
  avatarURL: string;
  name: string;
  userColor: string;
  roleIcon: string | null;
} {
  const customMsg = msg as RenderableMessage;
  const author = customMsg.author;

  const authorAvatar = author?.avatarURL
    ? typeof author.avatarURL === "function"
      ? author.avatarURL()
      : author.avatarURL
    : null;

  const avatarURL = customMsg.avatarURL || authorAvatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  let name = customMsg.username || customMsg.name || author?.displayName || author?.username || "Unknown User";
  let userColor = customMsg.userColor || "#ffffff";
  let roleIcon: string | null = customMsg.roleIcon || null;

  if (customMsg.member) {
    name = customMsg.member.nickname || name;

    const rolesCache = (customMsg.member as { roles?: { cache?: any } } | undefined)?.roles?.cache;
    if (rolesCache && typeof rolesCache.filter === "function") {
      const roles = rolesCache
        .filter((role: { color?: number; id?: string }) => role.color !== 0 && (!customMsg.guild || role.id !== customMsg.guild.id))
        .sort((a: { position?: number }, b: { position?: number }) => (b.position ?? 0) - (a.position ?? 0));

      const highestColoredRole = roles.first();

      if (highestColoredRole) {
        userColor = `#${(highestColoredRole.color ?? 0).toString(16).padStart(6, "0")}`;
        if (typeof highestColoredRole.iconURL === "function") {
          roleIcon = highestColoredRole.iconURL();
        }
      }
    }
  }

  return { avatarURL, name, userColor, roleIcon };
}

/**
 * Extracts user info from a referenced message for replies
 * @param referencedMessage - The referenced message
 * @returns Object containing avatar URL, name, and user color
 */
async function extractReplyUserInfo(referencedMessage: RenderableMessageInput): Promise<{
  avatarURL: string;
  name: string;
  userColor: string;
}> {
  const authorAvatar = referencedMessage.author?.avatarURL
    ? typeof referencedMessage.author.avatarURL === "function"
      ? referencedMessage.author.avatarURL()
      : referencedMessage.author.avatarURL
    : null;

  const avatarURL = authorAvatar || (referencedMessage as RenderableMessage).avatarURL || "https://cdn.discordapp.com/embed/avatars/0.png";
  let name = (referencedMessage as RenderableMessage).username || referencedMessage.author?.displayName || referencedMessage.author?.username || "Unknown User";
  let userColor = (referencedMessage as RenderableMessage).userColor || "#b5bac1";

  if ((referencedMessage as RenderableMessage).member) {
    name = (referencedMessage as RenderableMessage).member?.nickname || name;

    const rolesCache = ((referencedMessage as RenderableMessage).member as { roles?: { cache?: any } } | undefined)?.roles?.cache;
    if (rolesCache && typeof rolesCache.filter === "function") {
      const roles = rolesCache
        .filter((role: { color?: number; id?: string }) => role.color !== 0 && (!referencedMessage.guild || role.id !== referencedMessage.guild.id))
        .sort((a: { position?: number }, b: { position?: number }) => (b.position ?? 0) - (a.position ?? 0));

      const highestColoredRole = roles.first();

      if (highestColoredRole) {
        userColor = `#${(highestColoredRole.color ?? 0).toString(16).padStart(6, "0")}`;
      }
    }
  }

  return { avatarURL, name, userColor };
}

/**
 * Escapes HTML special characters to prevent XSS and rendering issues
 * @param text - The text to escape
 * @returns HTML-escaped text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCollectionValues<T>(collection: unknown): T[] {
  if (Array.isArray(collection)) {
    return collection as T[];
  }

  if (
    collection &&
    typeof collection === "object" &&
    "values" in collection &&
    typeof (collection as { values?: unknown }).values === "function"
  ) {
    return Array.from((collection as { values: () => Iterable<T> }).values());
  }

  return [];
}

function getCollectionSize(collection: unknown): number {
  if (Array.isArray(collection)) {
    return collection.length;
  }

  if (collection && typeof collection === "object") {
    if ("size" in collection && typeof (collection as { size?: unknown }).size === "number") {
      return (collection as { size: number }).size;
    }

    if (
      "values" in collection &&
      typeof (collection as { values?: unknown }).values === "function"
    ) {
      return Array.from((collection as { values: () => Iterable<unknown> }).values()).length;
    }
  }

  return 0;
}

function getEmojiUrl(emoji: string): string | null {
  const codePoint = emoji.codePointAt(0);
  if (!codePoint) return null;

  const hex = codePoint.toString(16).toLowerCase();

  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hex}.png`;
}

/**
 * Parses Discord markdown and converts it to HTML with emoji support
 * @param content - The markdown content to parse
 * @param isReply - Whether this is for a reply message (smaller emojis)
 * @param msg - The Discord message object for resolving mentions
 * @returns HTML string with parsed markdown
 */
function parseMarkdown(content: string, isReply: boolean = false, msg?: RenderableMessageInput): string {
  const emojiOnlyRegex =
    /^[\s\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*(?:<a?:[^:]+:\d+>[\s]*)*$/u;
  const hasText = !emojiOnlyRegex.test(content.trim());

  let parsed = escapeHtml(content);

  const emojiSize = isReply ? "16px" : hasText ? "18px" : "45px";
  const emojiClass = isReply
    ? "emoji reply-emoji"
    : hasText
    ? "emoji text-emoji"
    : "emoji large-emoji";

  parsed = parsed.replace(
    /(^|[^"=])(https?:\/\/[^\s<>"]+\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s<>"]*)?)/gi,
    (match, prefix, url, ext, params) => {
      return `${prefix}<div class="direct-image-container"><img class="direct-image" src="${url}" alt="Image (${ext.toUpperCase()})" loading="eager" crossorigin="anonymous" /></div><!--PROCESSED_URL-->`;
    }
  );

  parsed = parsed.replace(
    /(^|[^"=])(https?:\/\/tenor\.com\/view\/[^\s<>"]+)/gi,
    (match, prefix, url) => {
      const directUrl = `${url}.gif`;
      return `${prefix}<div class="direct-image-container"><img class="direct-image tenor-gif" src="${directUrl}" alt="Tenor GIF" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><a href="${url}" target="_blank" rel="noopener noreferrer" style="display: none; color: #00aff4;">${url}</a></div><!--PROCESSED_URL-->`;
    }
  );

  parsed = parsed.replace(
    /(^|[^"=])(https?:\/\/giphy\.com\/gifs\/[^\s<>"]+)/gi,
    (match, prefix, url) => {
      const giphyMatch = url.match(/\/gifs\/(?:[^-]+-)*([a-zA-Z0-9]+)$/);
      if (giphyMatch) {
        const giphyId = giphyMatch[1];
        const directUrl = `https://media.giphy.com/media/${giphyId}/giphy.gif`;
        return `${prefix}<div class="direct-image-container"><img class="direct-image giphy-gif" src="${directUrl}" alt="Giphy GIF" loading="eager" crossorigin="anonymous" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><a href="${url}" target="_blank" rel="noopener noreferrer" style="display: none; color: #00aff4;">${url}</a></div><!--PROCESSED_URL-->`;
      }
      return match;
    }
  );

  parsed = parsed.replace(
    /(^|[^"=])(https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?)/gi,
    (match, prefix, url, imgurId) => {
      const directUrl = `https://i.imgur.com/${imgurId}.gif`;
      return `${prefix}<div class="direct-image-container"><img class="direct-image imgur-gif" src="${directUrl}" alt="Imgur Image" loading="eager" crossorigin="anonymous" onerror="this.src='https://i.imgur.com/${imgurId}.jpg'; this.onerror=function(){this.style.display='none'; this.nextSibling.style.display='inline';}" /><a href="${url}" target="_blank" rel="noopener noreferrer" style="display: none; color: #00aff4;">${url}</a></div><!--PROCESSED_URL-->`;
    }
  );

  parsed = parsed.replace(
    /(^|[^"=])(https?:\/\/[^\s<>"]+)(?!.*<!--PROCESSED_URL-->)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
  );

  parsed = parsed.replace(/<!--PROCESSED_URL-->/g, "");

  parsed = parsed.replace(/&lt;(a?):([^:]+):(\d+)&gt;/g, (match, animated, name, id) => {
    const extension = animated === "a" ? "gif" : "webp";
    return `<img class="${emojiClass}" alt=":${escapeHtml(
      name
    )}:" src="https://cdn.discordapp.com/emojis/${id}.${extension}?size=48" style="width: ${emojiSize}; height: ${emojiSize};" />`;
  });

  parsed = parsed.replace(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    (emoji) => {
      const emojiUrl = getEmojiUrl(emoji);
      if (emojiUrl) {
        return `<img class="${emojiClass}" alt="${emoji}" src="${emojiUrl}" style="width: ${emojiSize}; height: ${emojiSize};" />`;
      }
      return emoji;
    }
  );

  let codeBlockRegex = /```/g;
  let match;
  let lastIndex = 0;
  let result = "";

  while ((match = codeBlockRegex.exec(parsed)) !== null) {
    result += parsed.slice(lastIndex, match.index);

    let openIndex = match.index;
    let closeIndex = parsed.indexOf("```", openIndex + 3);

    if (closeIndex !== -1) {
      let code = parsed.slice(openIndex + 3, closeIndex);

      const lines = code.split("\n");
      const firstLine = lines[0]?.trim();
      const isLanguage = firstLine && !firstLine.includes(" ") && firstLine.length < 20;

      if (isLanguage && lines.length > 1) {
        const language = firstLine;
        const codeContent = lines.slice(1).join("\n").trim();
        result += `<pre class="code-block" data-language="${escapeHtml(
          language
        )}"><code>${codeContent}</code></pre>`;
      } else {
        result += `<pre class="code-block"><code>${code.trim()}</code></pre>`;
      }

      lastIndex = closeIndex + 3;
      codeBlockRegex.lastIndex = closeIndex + 3;
    } else {
      result += "```";
      lastIndex = openIndex + 3;
      codeBlockRegex.lastIndex = openIndex + 3;
    }
  }

  result += parsed.slice(lastIndex);
  parsed = result;

  // Inline code `text`
  parsed = parsed.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

  // Discord subtext -#
  parsed = parsed.replace(/^-#\s+(.+)$/gm, '<span class="subtext">$1</span>');

  // Headers
  parsed = parsed.replace(/^#{3}\s+(.+)$/gm, '<h3 class="header-3">$1</h3>');
  parsed = parsed.replace(/^#{2}\s+(.+)$/gm, '<h2 class="header-2">$1</h2>');
  parsed = parsed.replace(/^#{1}\s+(.+)$/gm, '<h1 class="header-1">$1</h1>');

  // Bold text **text** or __text__
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  parsed = parsed.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic text *text* or _text_
  parsed = parsed.replace(/\*(.*?)\*/g, "<em>$1</em>");
  parsed = parsed.replace(/_(.*?)_/g, "<em>$1</em>");

  // Strikethrough ~~text~~
  parsed = parsed.replace(/~~(.*?)~~/g, "<del>$1</del>");

  // Line breaks
  parsed = parsed.replace(/\n/g, "<br>");

  // User mentions <@123456789>
  parsed = parsed.replace(/&lt;@!?(\d+)&gt;/g, (match, userId) => {
    const guild = (msg as RenderableMessage | undefined)?.guild;
    if (guild?.members?.cache) {
      try {
        const member = guild.members.cache.get?.(userId);
        if (member) {
          const displayName = member.nickname || member.user?.displayName || member.user?.username;
          return `<span class="mention user-mention">@${escapeHtml(displayName)}</span>`;
        }
      } catch {}
    }
    return '<span class="mention user-mention">@User</span>';
  });

  // Channel mentions <#123456789>
  parsed = parsed.replace(/&lt;#(\d+)&gt;/g, (match, channelId) => {
    const guild = (msg as RenderableMessage | undefined)?.guild;
    if (guild?.channels?.cache) {
      try {
        const channel = guild.channels.cache.get?.(channelId);
        if (channel && typeof channel === "object" && "name" in channel) {
          return `<span class="mention channel-mention">#${escapeHtml(channel.name as string)}</span>`;
        }
      } catch {}
    }
    return '<span class="mention channel-mention">#channel</span>';
  });

  // Role mentions <@&123456789>
  parsed = parsed.replace(/&lt;@&amp;(\d+)&gt;/g, (match, roleId) => {
    const guild = (msg as RenderableMessage | undefined)?.guild;
    if (guild?.roles?.cache) {
      try {
        const role = guild.roles.cache.get?.(roleId);
        if (role && typeof role === "object" && "name" in role) {
          return `<span class="mention role-mention">@${escapeHtml(role.name as string)}</span>`;
        }
      } catch {}
    }
    return '<span class="mention role-mention">@role</span>';
  });

  return parsed;
}

/**
 * Generates HTML for a reply message preview
 * @param replyMsg - The reply message data or null
 * @param msg - The Discord message object for mention resolution
 * @returns HTML string for the reply or empty string if no reply
 */
function generateReplyHTML(replyMsg: ReplyMessageData | null, msg?: RenderableMessageInput): string {
  if (!replyMsg) return "";

  const replyAuthor = escapeHtml(replyMsg.name || "Unknown User");
  const replyAvatar = replyMsg.avatarURL || "https://cdn.discordapp.com/embed/avatars/0.png";
  const replyColor = replyMsg.userColor || "#b5bac1";

  let replyContent = parseMarkdown(
    replyMsg.content?.substring(0, 100) || "Click to see attachment",
    true,
    msg
  );
  replyContent = replyContent.replace(/<br>/g, " ");

  return `
    <div class="reply-wrapper">
      <div class="reply-container">
        <img src="${replyAvatar}" alt="${replyAuthor}'s avatar" class="reply-avatar" />
        <div class="reply-content">
          <span class="reply-author" style="color: ${replyColor};">${replyAuthor}</span>
          <span class="reply-text">${replyContent}${
    (replyMsg.content?.length || 0) > 100 ? "..." : ""
  }</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates HTML for message attachments with Discord-style grid layouts
 * @param attachments - Array of Discord attachments
 * @returns HTML string for all attachments or empty string if none
 */
function generateAttachmentsHTML(attachments: RenderableAttachment[]): string {
  if (!attachments || attachments.length === 0) return "";

  const count = attachments.length;
  let html = '<div class="attachments">';

  const createImageElement = (attachment: RenderableAttachment, className: string) => {
    const isImage = attachment.contentType?.startsWith("image/");
    const isVideo = attachment.contentType?.startsWith("video/");

    if (isImage) {
      return `<div class="attachment-item ${className}">
        <img src="${attachment.url}" alt="${escapeHtml(
        attachment.name || "Image"
      )}" class="attachment-image" style="${
        (count === 10 || count === 7) && className === "big-top"
          ? "object-fit: cover !important; height: 200px !important;"
          : ""
      }" />
      </div>`;
    } else if (isVideo) {
      return `<div class="attachment-item ${className}">
        <video controls class="attachment-video">
          <source src="${attachment.url}" type="${attachment.contentType}">
          Your browser does not support the video tag.
        </video>
      </div>`;
    } else {
      return `<div class="attachment-item ${className} file-attachment">
        <div class="file-info">
          <div class="file-icon">📄</div>
          <div class="file-details">
            <div class="file-name">${escapeHtml(attachment.name || "Unknown file")}</div>
            <div class="file-size">${formatFileSize(attachment.size || 0)}</div>
          </div>
        </div>
      </div>`;
    }
  };

  switch (count) {
    case 1:
      html += `<div class="grid-1">${createImageElement(attachments[0]!, "single")}</div>`;
      break;

    case 2:
      html += `<div class="grid-2">
        ${createImageElement(attachments[0]!, "half")}
        ${createImageElement(attachments[1]!, "half")}
      </div>`;
      break;

    case 3:
      html += `<div class="grid-3">
        <div class="left-big">${createImageElement(attachments[0]!, "big")}</div>
        <div class="right-small">
          ${createImageElement(attachments[1]!, "small")}
          ${createImageElement(attachments[2]!, "small")}
        </div>
      </div>`;
      break;

    case 4:
      html += `<div class="grid-4">
        <div class="left-column">
          ${createImageElement(attachments[0]!, "quarter")}
          ${createImageElement(attachments[1]!, "quarter")}
        </div>
        <div class="right-column">
          ${createImageElement(attachments[2]!, "quarter")}
          ${createImageElement(attachments[3]!, "quarter")}
        </div>
      </div>`;
      break;

    case 5:
      html += `<div class="grid-5">
        <div class="top-row">
          ${createImageElement(attachments[0]!, "half")}
          ${createImageElement(attachments[1]!, "half")}
        </div>
        <div class="bottom-row">
          ${createImageElement(attachments[2]!, "third")}
          ${createImageElement(attachments[3]!, "third")}
          ${createImageElement(attachments[4]!, "third")}
        </div>
      </div>`;
      break;

    case 6:
      html += `<div class="grid-6">
        <div class="top-row">
          ${createImageElement(attachments[0]!, "third")}
          ${createImageElement(attachments[1]!, "third")}
          ${createImageElement(attachments[2]!, "third")}
        </div>
        <div class="bottom-row">
          ${createImageElement(attachments[3]!, "third")}
          ${createImageElement(attachments[4]!, "third")}
          ${createImageElement(attachments[5]!, "third")}
        </div>
      </div>`;
      break;

    case 7:
      html += `<div class="grid-7">
        <div class="top-big">${createImageElement(attachments[0]!, "big-top")}</div>
        <div class="middle-row">
          ${createImageElement(attachments[1]!, "third")}
          ${createImageElement(attachments[2]!, "third")}
          ${createImageElement(attachments[3]!, "third")}
        </div>
        <div class="bottom-row">
          ${createImageElement(attachments[4]!, "third")}
          ${createImageElement(attachments[5]!, "third")}
          ${createImageElement(attachments[6]!, "third")}
        </div>
      </div>`;
      break;

    case 8:
      html += `<div class="grid-8">
        <div class="top-row">
          ${createImageElement(attachments[0]!, "half")}
          ${createImageElement(attachments[1]!, "half")}
        </div>
        <div class="middle-row">
          ${createImageElement(attachments[2]!, "third")}
          ${createImageElement(attachments[3]!, "third")}
          ${createImageElement(attachments[4]!, "third")}
        </div>
        <div class="bottom-row">
          ${createImageElement(attachments[5]!, "third")}
          ${createImageElement(attachments[6]!, "third")}
          ${createImageElement(attachments[7]!, "third")}
        </div>
      </div>`;
      break;

    case 9:
      html += `<div class="grid-9">
        ${attachments.map((attachment) => createImageElement(attachment, "ninth")).join("")}
      </div>`;
      break;

    case 10:
      html += `<div class="grid-10">
        <div class="top-big">${createImageElement(attachments[0]!, "big-top")}</div>
        <div class="bottom-grid">
          ${attachments
            .slice(1)
            .map((attachment) => createImageElement(attachment, "ninth"))
            .join("")}
        </div>
      </div>`;
      break;

    default:
      html += `<div class="grid-9">
        ${attachments
          .slice(0, 8)
          .map((attachment) => createImageElement(attachment, "ninth"))
          .join("")}
        <div class="attachment-item ninth more-overlay">
          ${createImageElement(attachments[8]!, "ninth")}
          <div class="more-count">+${count - 9}</div>
        </div>
      </div>`;
      break;
  }

  html += "</div>";
  return html;
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB", "256 KB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generates HTML for Discord stickers
 * @param stickers - Array of Discord stickers
 * @returns HTML string for all stickers or empty string if none
 */
function generateStickersHTML(stickers: RenderableSticker[]): string {
  if (!stickers || stickers.length === 0) return "";

  let html = '<div class="stickers">';

  stickers.forEach((sticker) => {
    const stickerPngUrl = `https://media.discordapp.net/stickers/${sticker.id}.png`;
    const stickerName = escapeHtml(sticker.name || "Sticker");

    html += `
      <div class="sticker-container">
        <img class="sticker" src="${stickerPngUrl}" alt="${stickerName}" loading="eager" />
      </div>
    `;
  });

  html += "</div>";
  return html;
}

/**
 * Generates the inner HTML markup for a Discord message
 * @param avatarURL - User's avatar URL
 * @param name - User's display name
 * @param userColor - User's role color
 * @param content - Message content
 * @param timestamp - Formatted timestamp
 * @param roleIcon - User's role icon URL or null
 * @param replyMsg - Reply message data or null
 * @param attachments - Array of message attachments
 * @param stickers - Array of message stickers
 * @param msg - The Discord message object for mention resolution
 * @returns Inner HTML string for the message
 */
function getMessageIdentity(message: RenderableMessageInput): string {
  const customMessage = message as RenderableMessage;
  const author = customMessage.author as RenderableUser | undefined;
  return (
    (customMessage as RenderableMessage & { author?: RenderableUser & { id?: string | number } }).author?.id?.toString() ||
    author?.username ||
    author?.displayName ||
    customMessage.username ||
    customMessage.name ||
    ""
  );
}

function shouldCompactMessage(previous: RenderableMessageInput, current: RenderableMessageInput): boolean {
  if (!previous || !current) return false;

  const previousTime = previous.createdAt ? new Date(previous.createdAt).getTime() : NaN;
  const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : NaN;
  const previousIdentity = getMessageIdentity(previous);
  const currentIdentity = getMessageIdentity(current);

  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) return false;
  const diff = currentTime - previousTime;

  return previousIdentity !== "" && currentIdentity !== "" && previousIdentity === currentIdentity && diff >= 0 && diff <= 7 * 60 * 1000;
}

function buildTimestampHTML(message: RenderableMessageInput, timestamp: string, doLink: boolean): string {
  const hasTimestamp = Boolean(message.createdAt);
  const messageId = (message as RenderableMessage).id;
  const hasLinkableId = messageId !== undefined && messageId !== null && messageId !== "";

  if (doLink && hasTimestamp && hasLinkableId) {
    return `<a href="#message-${messageId}" class="timestamp-link"><span class="timestamp">${timestamp}</span></a>`;
  }

  return `<span class="timestamp">${timestamp}</span>`;
}

function generateMessageMarkup(
  avatarURL: string,
  name: string,
  userColor: string,
  content: string,
  timestamp: string,
  roleIcon: string | null,
  replyMsg: ReplyMessageData | null,
  attachments: RenderableAttachment[],
  stickers: RenderableSticker[],
  msg?: RenderableMessageInput,
  compact: boolean = false,
  doLink: boolean = false
): string {
  const parsedContent = parseMarkdown(content, false, msg);
  const escapedName = escapeHtml(name);
  const replyHTML = generateReplyHTML(replyMsg, msg);
  const attachmentsHTML = generateAttachmentsHTML(attachments);
  const stickersHTML = generateStickersHTML(stickers);
  const timestampHTML = buildTimestampHTML(msg ?? {}, timestamp, doLink);

  const roleIconHTML = roleIcon
    ? `<img src="${roleIcon}" alt="Role icon" class="role-icon" />`
    : "";

  const hasReplyClass = replyMsg ? "has-reply" : "";
  const compactClass = compact ? "compact-message" : "";
  const messageId = (msg as RenderableMessage | undefined)?.id;
  const avatarHTML = compact ? "" : `<img src="${avatarURL}" alt="${escapedName}'s avatar" class="avatar" />`;

  return `
  <div class="discord-message"${messageId !== undefined && messageId !== null && messageId !== "" ? ` id="message-${messageId}"` : ""}>
    <div class="message-container ${hasReplyClass} ${compactClass}">
      ${replyMsg ? '<div class="reply-spine-container"><div class="reply-spine"></div></div>' : ""}
      ${avatarHTML}
      <div class="content-wrapper">
        ${replyHTML}
        ${compact ? "" : `<div class="header">
          <span class="username" style="color: ${userColor};">${escapedName}</span>
          ${roleIconHTML}
          ${timestampHTML}
        </div>`}
        ${compact ? `<div class="compact-content">
          ${parsedContent}
        </div>` : `<div class="content">${parsedContent}</div>`}
        ${attachmentsHTML}
        ${stickersHTML}
      </div>
    </div>
  </div>`;
}

/**
 * Generates the complete HTML for a Discord message
 * @param avatarURL - User's avatar URL
 * @param name - User's display name
 * @param userColor - User's role color
 * @param content - Message content
 * @param timestamp - Formatted timestamp
 * @param roleIcon - User's role icon URL or null
 * @param replyMsg - Reply message data or null
 * @param attachments - Array of message attachments
 * @param stickers - Array of message stickers
 * @param msg - The Discord message object for mention resolution
 * @returns Complete HTML string for the message
 */
function generateMessageHTML(
  avatarURL: string,
  name: string,
  userColor: string,
  content: string,
  timestamp: string,
  roleIcon: string | null,
  replyMsg: ReplyMessageData | null,
  attachments: RenderableAttachment[],
  stickers: RenderableSticker[],
  msg?: RenderableMessageInput,
  compact: boolean = false,
  doLink: boolean = false
): string {
  const markup = generateMessageMarkup(
    avatarURL,
    name,
    userColor,
    content,
    timestamp,
    roleIcon,
    replyMsg,
    attachments,
    stickers,
    msg,
    compact,
    doLink
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: #313338;
      color: #dbdee1;
      font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .discord-message {
      background: #313338;
      padding: 0 12px;
      min-width: 400px;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .message-container {
      display: flex;
      align-items: flex-start;
      position: relative;
      padding: 12px 0;
      min-height: 44px;
    }

    .message-container.has-reply {
      align-items: flex-start;
    }

    .message-container.has-reply .avatar {
      margin-top: 22px;
    }

    .message-container:not(.has-reply) .avatar {
      margin-top: 0px;
    }

    .message-container.compact-message {
      padding-top: 2px;
      padding-bottom: 2px;
      min-height: 24px;
    }

    .message-container.compact-message .avatar {
      display: none;
    }

    .message-container.compact-message .content-wrapper {
      margin-left: 56px;
    }

    .message-container.compact-message .header {
      display: none;
    }

    .message-container.compact-message .compact-content {
      margin-top: 0;
      font-size: 16px;
      line-height: 1.375;
      color: #dbdee1;
      word-break: break-word;
      white-space: pre-line;
      margin-bottom: 2px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 16px;
      flex-shrink: 0;
      margin-top: 0px;
      margin-bottom: 3px;
      box-sizing: border-box;
      padding: 0;
      background: #313338;
      position: relative;
      z-index: 2;
    }

    .content-wrapper {
      flex: 1;
      min-width: 0;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }

    .username {
      font-weight: 500;
      font-size: 16px;
      color: var(--user-color, #dbdee1);
      line-height: 1.375;
    }

    .role-icon {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      object-fit: contain;
      margin-left: 2px;
      margin-right: 2px;
      vertical-align: middle;
    }

    .timestamp {
      font-size: 12px;
      color: #949ba4;
      font-weight: 400;
      margin-left: 6px;
      line-height: 1.375;
    }

    .timestamp-link {
      text-decoration: none;
    }

    .timestamp-link:hover .timestamp {
      text-decoration: underline;
    }

    .content {
      font-size: 16px;
      line-height: 1.375;
      color: #dbdee1;
      word-break: break-word;
      white-space: pre-line;
      margin-bottom: 2px;
    }

    .emoji {
      vertical-align: -0.2em;
      object-fit: contain;
    }

    .reply-emoji {
      width: 16px;
      height: 16px;
      vertical-align: -0.1em;
    }

    .text-emoji {
      width: 18px;
      height: 18px;
      vertical-align: -0.2em;
    }

    .large-emoji {
      width: 45px;
      height: 45px;
      vertical-align: -0.3em;
      margin: 2px;
    }

    .direct-image-container {
      margin: 4px 0;
      display: block;
    }

    .direct-image {
      max-width: 400px;
      max-height: 300px;
      border-radius: 8px;
      object-fit: contain;
      display: block;
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .reply-wrapper {
      position: relative;
      margin-bottom: 4px;
      margin-left: 0px;
    }

    .reply-spine-container {
      position: absolute;
      left: 16px;
      top: 16px;
      width: 24px;
      height: 10px;
      z-index: 1;
      pointer-events: none;
    }

    .reply-spine {
      width: 100%;
      height: 100%;
      border-top: 2px solid #4e5058;
      border-right: 2px solid #4e5058;
      border-top-right-radius: 6px;
      background: transparent;
      transform: rotate(180deg) scaleY(-1);
    }

    .reply-container {
      display: flex;
      align-items: center;
      padding-left: 0px;
      position: relative;
      z-index: 2;
    }

    .reply-spine::before {
      display: none;
    }

    .reply-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      object-fit: cover;
      margin-left: 0px;
      margin-right: 8px;
    }

    .reply-content {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 4px;
    }

    .reply-author {
      font-size: 13px;
      font-weight: 600;
      color: #b5bac1;
      flex-shrink: 0;
    }

    .reply-text {
      font-size: 13px;
      color: #b5bac1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .attachments {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 0px;
      max-width: 800px;
    }

    .attachment-item {
      border-radius: 8px;
      overflow: hidden;
      background: transparent;
      position: relative;
    }

    .attachment-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      border-radius: 8px;
      background: transparent;
      aspect-ratio: 1/1;
    }

    .attachment-video {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background: #232428;
      object-fit: contain;
    }

    /* Grid Layouts - All Square */
    .grid-1 .single {
      max-width: 400px;
      max-height: 400px;
      aspect-ratio: 1/1;
    }

    .grid-2 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-2 .half {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-3 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-3 .left-big {
      height: 100%;
    }

    .grid-3 .right-small {
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
    }

    .grid-3 .big {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-3 .small {
      height: calc(50% - 1px);
      aspect-ratio: 1/1;
    }

    .grid-4 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-4 .left-column, .grid-4 .right-column {
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
    }

    .grid-4 .quarter {
      height: calc(50% - 1px);
      aspect-ratio: 1/1;
    }

    .grid-5 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-5 .top-row {
      display: flex;
      gap: 2px;
      height: 150px;
    }

    .grid-5 .bottom-row {
      display: flex;
      gap: 2px;
      height: 100px;
    }

    .grid-5 .half {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-5 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-6 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-6 .top-row, .grid-6 .bottom-row {
      display: flex;
      gap: 2px;
      height: 120px;
    }

    .grid-6 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-7 {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-7 .top-big {
      height: 200px;
      width: 100%;
    }

    .grid-7 .big-top {
      width: 100%;
      height: 200px;
      object-fit: cover;
      aspect-ratio: auto;
    }

    .grid-7 .middle-row {
		  flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-7 .bottom-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-7 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-8 {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-8 .top-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 150px;
    }

    .grid-8 .middle-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-8 .bottom-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-8 .half {
      flex: 1;
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-8 .third {
      flex: 1;
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-9 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .grid-9 .ninth {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-10 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-10 .top-big {
      height: 200px;
      aspect-ratio: 1/1;
    }

    .grid-10 .bottom-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .grid-10 .ninth {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .more-overlay {
      position: relative;
    }

    .more-count {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 14px;
    }

    .file-attachment {
      background: #232428;
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
    }

    .file-icon {
      font-size: 24px;
    }

    .file-name {
      color: #00aff4;
      font-weight: 500;
      font-size: 15px;
    }

    .file-size {
      color: #949ba4;
      font-size: 12px;
    }

    .mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 500;
    }

    .subtext {
      font-size: 14px;
      color: #b5bac1;
      line-height: 1.375;
    }

    .user-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .channel-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .role-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .code-block {
      background: #2b2d31;
      border: 1px solid #1e1f22;
      border-radius: 4px;
      padding: 8px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.125;
      color: #dbdee1;
    }

    .inline-code {
      background: #1e1f22;
      color: #dbdee1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
    }

    .header-1 {
      font-size: 24px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-2 {
      font-size: 20px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-3 {
      font-size: 18px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-4 {
      font-size: 16px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-5 {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-6 {
      font-size: 12px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .blockquote {
      border-left: 4px solid #4e5058;
      padding-left: 12px;
      margin: 8px 0;
      color: #b5bac1;
      font-style: italic;
    }

    .unordered-list, .ordered-list {
      margin: 8px 0;
      padding-left: 20px;
    }

    .list-item, .list-item-ordered {
      margin: 4px 0;
      color: #dbdee1;
    }

    .markdown-table {
      border-collapse: collapse;
      margin: 8px 0;
      background: #2b2d31;
      border-radius: 4px;
      overflow: hidden;
    }

    .table-row {
      border-bottom: 1px solid #1e1f22;
    }

    .table-cell {
      padding: 8px 12px;
      border-right: 1px solid #1e1f22;
      color: #dbdee1;
    }

    .horizontal-rule {
      border: none;
      border-top: 1px solid #4e5058;
      margin: 16px 0;
    }

    .bold {
      font-weight: 700;
    }

    .italic {
      font-style: italic;
    }

    .strikethrough {
      text-decoration: line-through;
    }

    .underline {
      text-decoration: underline;
    }

    .spoiler {
      background: #202225;
      color: #202225;
      border-radius: 3px;
      padding: 0 2px;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .spoiler:hover {
      background: #484b51;
      color: #dcddde;
    }

    .markdown-link {
      color: #00aff4;
      text-decoration: none;
    }

    .markdown-link:hover {
      text-decoration: underline;
    }

    .auto-link {
      color: #00aff4;
      text-decoration: none;
    }

    .auto-link:hover {
      text-decoration: underline;
    }

    .stickers {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sticker-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 160px;
    }

    .sticker {
      width: 160px;
      height: 160px;
      object-fit: contain;
      border-radius: 8px;
      background: transparent;
    }

    .sticker-name {
      font-size: 12px;
      color: #b5bac1;
      margin-top: 4px;
      text-align: center;
      word-break: break-word;
    }

    .discord-conversation {
      background: #313338;
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 400px;
      max-width: 800px;
    }

    .discord-conversation .discord-message {
      padding: 0 12px;
      min-width: 0;
      max-width: none;
    }
  </style>
</head>
<body>
  ${markup}
</body>
</html>`;
}

function generateConversationHTML(markup: string[]): string {
  const conversationMarkup = markup.join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: #313338;
      color: #dbdee1;
      font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

    .discord-conversation {
      background: #313338;
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 400px;
      max-width: 800px;
    }

    .discord-message {
      background: #313338;
      padding: 0 12px;
      min-width: 400px;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .message-container {
      display: flex;
      align-items: flex-start;
      position: relative;
      padding: 12px 0;
      min-height: 44px;
    }

    .message-container.has-reply {
      align-items: flex-start;
    }

    .message-container.has-reply .avatar {
      margin-top: 22px;
    }

    .message-container:not(.has-reply) .avatar {
      margin-top: 0px;
    }

    .message-container.compact-message {
      padding-top: 2px;
      padding-bottom: 2px;
      min-height: 24px;
    }

    .message-container.compact-message .avatar {
      display: none;
    }

    .message-container.compact-message .content-wrapper {
      margin-left: 56px;
    }

    .message-container.compact-message .header {
      display: none;
    }

    .message-container.compact-message .compact-content {
      margin-top: 0;
      font-size: 16px;
      line-height: 1.375;
      color: #dbdee1;
      word-break: break-word;
      white-space: pre-line;
      margin-bottom: 2px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 16px;
      flex-shrink: 0;
      margin-top: 0px;
      margin-bottom: 3px;
      box-sizing: border-box;
      padding: 0;
      background: #313338;
      position: relative;
      z-index: 2;
    }

    .content-wrapper {
      flex: 1;
      min-width: 0;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }

    .username {
      font-weight: 500;
      font-size: 16px;
      color: var(--user-color, #dbdee1);
      line-height: 1.375;
    }

    .role-icon {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      object-fit: contain;
      margin-left: 2px;
      margin-right: 2px;
      vertical-align: middle;
    }

    .timestamp {
      font-size: 12px;
      color: #949ba4;
      font-weight: 400;
      margin-left: 6px;
      line-height: 1.375;
    }

    .timestamp-link {
      text-decoration: none;
    }

    .timestamp-link:hover .timestamp {
      text-decoration: underline;
    }

    .content {
      font-size: 16px;
      line-height: 1.375;
      color: #dbdee1;
      word-break: break-word;
      white-space: pre-line;
      margin-bottom: 2px;
    }

    .emoji {
      vertical-align: -0.2em;
      object-fit: contain;
    }

    .reply-emoji {
      width: 16px;
      height: 16px;
      vertical-align: -0.1em;
    }

    .text-emoji {
      width: 18px;
      height: 18px;
      vertical-align: -0.2em;
    }

    .large-emoji {
      width: 45px;
      height: 45px;
      vertical-align: -0.3em;
      margin: 2px;
    }

    .direct-image-container {
      margin: 4px 0;
      display: block;
    }

    .direct-image {
      max-width: 400px;
      max-height: 300px;
      border-radius: 8px;
      object-fit: contain;
      display: block;
      background: transparent;
      border: none;
      box-shadow: none;
    }

    .reply-wrapper {
      position: relative;
      margin-bottom: 4px;
      margin-left: 0px;
    }

    .reply-spine-container {
      position: absolute;
      left: 16px;
      top: 16px;
      width: 24px;
      height: 10px;
      z-index: 1;
      pointer-events: none;
    }

    .reply-spine {
      width: 100%;
      height: 100%;
      border-top: 2px solid #4e5058;
      border-right: 2px solid #4e5058;
      border-top-right-radius: 6px;
      background: transparent;
      transform: rotate(180deg) scaleY(-1);
    }

    .reply-container {
      display: flex;
      align-items: center;
      padding-left: 0px;
      position: relative;
      z-index: 2;
    }

    .reply-spine::before {
      display: none;
    }

    .reply-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      object-fit: cover;
      margin-left: 0px;
      margin-right: 8px;
    }

    .reply-content {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 4px;
    }

    .reply-author {
      font-size: 13px;
      font-weight: 600;
      color: #b5bac1;
      flex-shrink: 0;
    }

    .reply-text {
      font-size: 13px;
      color: #b5bac1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .attachments {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 0px;
      max-width: 800px;
    }

    .attachment-item {
      border-radius: 8px;
      overflow: hidden;
      background: transparent;
      position: relative;
    }

    .attachment-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      border-radius: 8px;
      background: transparent;
      aspect-ratio: 1/1;
    }

    .attachment-video {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background: #232428;
      object-fit: contain;
    }

    .grid-1 .single {
      max-width: 400px;
      max-height: 400px;
      aspect-ratio: 1/1;
    }

    .grid-2 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-2 .half {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-3 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-3 .left-big {
      height: 100%;
    }

    .grid-3 .right-small {
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
    }

    .grid-3 .big {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-3 .small {
      height: calc(50% - 1px);
      aspect-ratio: 1/1;
    }

    .grid-4 {
      display: flex;
      gap: 2px;
      height: 200px;
    }

    .grid-4 .left-column, .grid-4 .right-column {
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
    }

    .grid-4 .quarter {
      height: calc(50% - 1px);
      aspect-ratio: 1/1;
    }

    .grid-5 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-5 .top-row {
      display: flex;
      gap: 2px;
      height: 150px;
    }

    .grid-5 .bottom-row {
      display: flex;
      gap: 2px;
      height: 100px;
    }

    .grid-5 .half {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-5 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-6 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-6 .top-row, .grid-6 .bottom-row {
      display: flex;
      gap: 2px;
      height: 120px;
    }

    .grid-6 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-7 {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-7 .top-big {
      height: 200px;
      width: 100%;
    }

    .grid-7 .big-top {
      width: 100%;
      height: 200px;
      object-fit: cover;
      aspect-ratio: auto;
    }

    .grid-7 .middle-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-7 .bottom-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-7 .third {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-8 {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .grid-8 .top-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 150px;
    }

    .grid-8 .middle-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-8 .bottom-row {
      flex: 1;
      display: flex;
      gap: 2px;
      height: 80px;
    }

    .grid-8 .half {
      flex: 1;
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-8 .third {
      flex: 1;
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-9 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .grid-9 .ninth {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .grid-10 {
      display: flex;
      flex-direction: column;
      gap: 0px;
    }

    .grid-10 .top-big {
      height: 200px;
      aspect-ratio: 1/1;
    }

    .grid-10 .bottom-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .grid-10 .ninth {
      height: 100%;
      aspect-ratio: 1/1;
    }

    .more-overlay {
      position: relative;
    }

    .more-count {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 14px;
    }

    .file-attachment {
      background: #232428;
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
    }

    .file-icon {
      font-size: 24px;
    }

    .file-name {
      color: #00aff4;
      font-weight: 500;
      font-size: 15px;
    }

    .file-size {
      color: #949ba4;
      font-size: 12px;
    }

    .mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 500;
    }

    .subtext {
      font-size: 14px;
      color: #b5bac1;
      line-height: 1.375;
    }

    .user-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .channel-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .role-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #dee0fc;
    }

    .code-block {
      background: #2b2d31;
      border: 1px solid #1e1f22;
      border-radius: 4px;
      padding: 8px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.125;
      color: #dbdee1;
    }

    .inline-code {
      background: #1e1f22;
      color: #dbdee1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
    }

    .header-1 {
      font-size: 24px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-2 {
      font-size: 20px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-3 {
      font-size: 18px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-4 {
      font-size: 16px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-5 {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .header-6 {
      font-size: 12px;
      font-weight: 600;
      margin: 16px 0 8px 0;
      color: #dbdee1;
      line-height: 1.25;
    }

    .blockquote {
      border-left: 4px solid #4e5058;
      padding-left: 12px;
      margin: 8px 0;
      color: #b5bac1;
      font-style: italic;
    }

    .unordered-list, .ordered-list {
      margin: 8px 0;
      padding-left: 20px;
    }

    .list-item, .list-item-ordered {
      margin: 4px 0;
      color: #dbdee1;
    }

    .markdown-table {
      border-collapse: collapse;
      margin: 8px 0;
      background: #2b2d31;
      border-radius: 4px;
      overflow: hidden;
    }

    .table-row {
      border-bottom: 1px solid #1e1f22;
    }

    .table-cell {
      padding: 8px 12px;
      border-right: 1px solid #1e1f22;
      color: #dbdee1;
    }

    .horizontal-rule {
      border: none;
      border-top: 1px solid #4e5058;
      margin: 16px 0;
    }

    .bold {
      font-weight: 700;
    }

    .italic {
      font-style: italic;
    }

    .strikethrough {
      text-decoration: line-through;
    }

    .underline {
      text-decoration: underline;
    }

    .spoiler {
      background: #202225;
      color: #202225;
      border-radius: 3px;
      padding: 0 2px;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .spoiler:hover {
      background: #484b51;
      color: #dcddde;
    }

    .markdown-link {
      color: #00aff4;
      text-decoration: none;
    }

    .markdown-link:hover {
      text-decoration: underline;
    }

    .auto-link {
      color: #00aff4;
      text-decoration: none;
    }

    .auto-link:hover {
      text-decoration: underline;
    }

    .stickers {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sticker-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 160px;
    }

    .sticker {
      width: 160px;
      height: 160px;
      object-fit: contain;
      border-radius: 8px;
      background: transparent;
    }

    .sticker-name {
      font-size: 12px;
      color: #b5bac1;
      margin-top: 4px;
      text-align: center;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="discord-conversation">
    ${conversationMarkup}
  </div>
</body>
</html>`;
}

/**
 * Renders one or more Discord messages to either an image or HTML
 * @param msg - The Discord message or array of messages to render
 * @param options - Optional rendering configuration
 * @returns Promise that resolves to an image buffer or HTML string
 * @throws Error if message is invalid or rendering fails
 */
export function render<T extends RenderOptions['format'] | undefined = undefined>(
  msg: RenderableMessageInput | RenderableMessageInput[],
  options?: RenderOptions & { format?: T }
): Promise<RenderResult<T>>;
export async function render<T extends RenderOptions['format'] | undefined = undefined>(
  msg: RenderableMessageInput | RenderableMessageInput[],
  options?: RenderOptions & { format?: T }
): Promise<RenderResult<T>> {
  try {
    if (!msg) {
      throw new Error("A message is required");
    }

    const messages = Array.isArray(msg) ? msg : [msg];
    if (messages.length === 0) {
      throw new Error("At least one message is required");
    }

    async function buildMessageMarkup(message: RenderableMessageInput, compact: boolean = false): Promise<string> {
      const hasContent = typeof message.content === "string" && message.content.trim().length > 0;
      const hasEmbeds = Array.isArray(message.embeds) && message.embeds.length > 0;
      const hasAttachments = getCollectionSize(message.attachments) > 0;
      const hasStickers = getCollectionSize(message.stickers) > 0;

      if (!hasContent && !hasEmbeds && !hasAttachments && !hasStickers) {
        throw new Error("Message must have content, embeds, attachments, or stickers to render");
      }

      const { avatarURL, name, userColor, roleIcon } = extractUserInfo(message);
      const timestamp = formatDiscordTimestamp(new Date(message.createdAt ?? Date.now()));

      let replyMsg: ReplyMessageData | null = null;
      if (message.reference && message.reference.messageId) {
        const channel = (message as RenderableMessage).channel;
        const fetchMessage = channel?.messages?.fetch as
          | ((messageId: string | number) => Promise<RenderableMessage | null>)
          | undefined;

        if (typeof fetchMessage === "function") {
          try {
            const referencedMessage = await fetchMessage(message.reference.messageId);
            if (referencedMessage) {
              const replyUserInfo = await extractReplyUserInfo(referencedMessage);
              replyMsg = {
                author: referencedMessage.author,
                content: referencedMessage.content,
                avatarURL: replyUserInfo.avatarURL,
                name: replyUserInfo.name,
                userColor: replyUserInfo.userColor,
              };
            }
          } catch (error) {
            console.warn("Could not fetch referenced message:", error);
          }
        }
      }

      const attachments = getCollectionValues<RenderableAttachment>(message.attachments);
      const stickers = getCollectionValues<RenderableSticker>(message.stickers);

      return generateMessageMarkup(
        avatarURL,
        name,
        userColor,
        message.content ?? "",
        timestamp,
        roleIcon,
        replyMsg,
        attachments,
        stickers,
        message,
        compact,
        options?.doLink === true
      );
    }

    async function buildMessageDocument(message: RenderableMessageInput): Promise<string> {
      const markup = await buildMessageMarkup(message);
      return generateMessageHTML(
        "",
        "",
        "",
        "",
        "",
        null,
        null,
        [],
        [],
        undefined,
        false,
        options?.doLink === true
      ).replace(/<body>[^]*?<\/body>/, `<body>${markup}</body>`);
    }

    const messageMarkup = await Promise.all(
      messages.map((message, index) => {
        const compact = index > 0 && shouldCompactMessage(messages[index - 1]!, message);
        return buildMessageMarkup(message, compact);
      })
    );
    const html = Array.isArray(msg)
      ? generateConversationHTML(messageMarkup)
      : await buildMessageDocument(messages[0]!);

    if (options?.format === "html") {
      return html as RenderResult<T>;
    }

    const buffer = await nodeHtmlToImage({
      html,
      quality: 100,
      type: "png",
      puppeteerArgs: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      },
      waitUntil: "networkidle0",
      ...options,
    });

    return buffer as RenderResult<T>;
  } catch (error) {
    console.error("Error rendering message:", error);
    throw new Error(
      `Failed to render message: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
