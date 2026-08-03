# Discord Render

Discord Render lets you turn Discord-style messages into PNG images or HTML previews.
It supports message content with markdown, embeds, attachments, stickers, emojis, role icons, and role colours.

It works with real Discord.js message objects, and it also accepts lightweight plain objects so you can generate fake or custom message previews for websites and demos.

## Installation
```bash
npm install discord-render
```

## Usage

### Rendering a single message as an image (discord.js)
```js
import { render } from "discord-render";
import { Message } from "discord.js";

const message = new Message(); // replace this with your discord.js message variable!
const imageBuffer = await render(message);
```

### Rendering several messages together as an image (NOT discord.js)
```js
import { render } from "discord-render";

const messages = [
  {
    content: "First message",
    username: "Alice",
    avatarURL: "https://example.com/alice.png",
    userColor: "#5865f2",
  },
  {
    content: "Second message",
    username: "Bob",
    avatarURL: "https://example.com/bob.png",
    userColor: "#57f287",
  },
];

const image = await render(messages);
```

### Exporting a single message as HTML
```js
const html = await render(message, { format: "html" });
```

### Exporting several messages together as HTML
```js
const html = await render(messages, { format: "html" });
```

### Custom object shape
You can supply a plain object with any of the following fields:

- `content`
- `username` or `name`
- `avatarURL`
- `userColor`
- `roleIcon`
- `createdAt`
- `embeds`
- `attachments`
- `stickers`
- `reference`

This makes the library useful for website previews, mockups, and other non-bot use cases.

## Full Discord.js example
```js
import { render } from "discord-render";
import { Client } from "discord.js";
import fs from "fs";
import "dotenv/config";

const client = new Client({ intents: 38403 });

client.on("ready", () => {
  console.log("Ready!");
});

client.on("messageCreate", async (msg) => {
  if (msg.content.startsWith("s")) {
    const buffer = await render(msg);
    fs.writeFileSync("./output.png", buffer);
  }
});

client.login(process.env.TOKEN);
```
