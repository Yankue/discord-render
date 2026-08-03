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
