import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/index.js';

function createMessage(content, id) {
  return {
    id,
    content,
    createdAt: new Date('2024-01-01T12:00:00.000Z'),
    author: {
      displayName: `User${id}`,
      avatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
    },
    member: null,
    embeds: [],
    attachments: { size: 0, values: () => [] },
    stickers: { size: 0, values: () => [] },
    reference: null,
    guild: null,
    channel: {
      messages: {
        fetch: async () => null,
      },
    },
  };
}

test('render returns HTML for a list of messages rendered as a conversation', async () => {
  const html = await render([createMessage('Hello there', '1'), createMessage('General Kenobi', '2')], {
    format: 'html',
  });

  assert.equal(typeof html, 'string');
  assert.match(html, /Hello there/);
  assert.match(html, /General Kenobi/);
  assert.match(html, /discord-conversation/);
});

test('render accepts a lightweight custom message shape', async () => {
  const html = await render(
    [
      {
        content: 'Hello from a custom object',
        username: 'Alice',
        avatarURL: 'https://example.com/avatar.png',
        userColor: '#ff00aa',
      },
    ],
    { format: 'html' }
  );

  assert.equal(typeof html, 'string');
  assert.match(html, /Hello from a custom object/);
  assert.match(html, /Alice/);
  assert.match(html, /ff00aa/);
});

test('render groups consecutive messages from the same user into a compact follow-up message', async () => {
  const html = await render(
    [
      createMessage('First message', '1'),
      {
        ...createMessage('Follow-up message', '1'),
        createdAt: new Date('2024-01-01T12:06:00.000Z'),
      },
    ],
    { format: 'html' }
  );

  const compactBlock = html.match(/<div class="discord-message" id="message-1">[\s\S]*?<div class="message-container[^>]*compact-message">([\s\S]*?)<\/div>\s*<\/div>/);

  assert.ok(compactBlock, 'expected a compact follow-up message block');
  assert.doesNotMatch(compactBlock[1], /class="avatar"/);
  assert.doesNotMatch(compactBlock[1], /<div class="header">/);
  assert.match(html, /\.message-container\.compact-message\s*\{[\s\S]*?padding-top:\s*0px;[\s\S]*?padding-bottom:\s*0px;[\s\S]*?margin-top:\s*-2px;/);
  assert.match(html, /\.message-container\.compact-message \.content-wrapper\s*\{[\s\S]*?margin-left:\s*56px;/);
});

test('render outputs rich embed markup for bot-style messages', async () => {
  const html = await render(
    [
      {
        ...createMessage('Check out this embed', 'embed-1'),
        embeds: [
          {
            title: 'Rich embed title',
            description: 'Rich embed description',
            color: 0x5865f2,
            fields: [{ name: 'Field', value: 'Value', inline: true }],
            footer: { text: 'Footer text' },
            author: { name: 'Bot', iconURL: 'https://example.com/bot.png' },
            thumbnail: { url: 'https://example.com/thumb.png' },
            image: { url: 'https://example.com/image.png' },
            url: 'https://example.com/embed',
          },
        ],
      },
    ],
    { format: 'html' }
  );

  assert.match(html, /embed-container/);
  assert.match(html, /Rich embed title/);
  assert.match(html, /Rich embed description/);
  assert.match(html, /Footer text/);
  assert.match(html, /Field/);
});

test('render adds a timestamp link when doLink is enabled and a timestamp exists', async () => {
  const html = await render(
    [
      {
        id: '3',
        content: 'Linked message',
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        username: 'Alice',
        avatarURL: 'https://example.com/avatar.png',
        userColor: '#ff00aa',
      },
    ],
    { format: 'html', doLink: true }
  );

  assert.match(html, /<a href="#message-3"/);
});

test('render adds a timestamp link for a single message when doLink is enabled', async () => {
  const html = await render(
    {
      id: '4',
      content: 'Single message link',
      createdAt: new Date('2024-01-01T12:00:00.000Z'),
      username: 'Alice',
      avatarURL: 'https://example.com/avatar.png',
      userColor: '#ff00aa',
    },
    { format: 'html', doLink: true }
  );

  assert.match(html, /<a href="#message-4"/);
});
