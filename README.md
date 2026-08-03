# Discord Render
This is an open-source project to render Discord messages into images.
It does this using a clone of Discord's styling. This means it isn't 100% identical, but it is close enough for most uses. It has support for message contents (with markdown), embeds, attachments, stickers, emojis, role icons, role colours.

It is built to work with Discord.JS; the message objects can be passed straight in.
It would be quite easy to modify this library to generate custom Discord messages without Discord.JS, but it currently isn't a built-in feature.

## Installation
```cmd
npm i discord-render
```

## Usage
### Rendering a single message as an image
```js
// use your own message variable from your discord bot, not an empty constructed one!
const message = new Message()

render(message).then(imageBuffer => {

})
```

### Rendering several messages together as an image
```js
const messages = [new Message(), new Message(), new Message()]

render(messages).then(imageBuffer => {

})
```

### Exporting a single message as HTML
```js
const html = await render(message, { format: 'html' })
```

### Exporting several messages together as HTML
```js
const html = await render(messages, { format: 'html' })
```


## Full Discord.JS Examples
```js
import { render } from "discord-render"
import { Client } from "discord.js"
import fs from "fs"
import 'dotenv/config'

const client = new Client({intents: 38403})


client.on("ready", () => {
	console.log("Ready!")
})

client.on("messageCreate", async msg => {
	if(msg.content.startsWith("s")) {
		render(msg).then(buffer => {
			fs.writeFile("./output.png", buffer, () => {})
		})
	}
})

client.login(process.env.TOKEN)
```
