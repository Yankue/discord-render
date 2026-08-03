import { render } from "../dist/index.js"
import { Client } from "discord.js"
import fs from "fs"
import 'dotenv/config'

/*const client = new Client({intents: 38403})


client.on("ready", () => {
	console.log("Ready!")
})

client.on("messageCreate", async msg => {
	if(msg.content.startsWith("s")) {
		await msg.react("🔥")

		render(msg, {format: "html"}).then(html => {
			fs.writeFile("./output.html", html, () => {})
		})
	}
})

client.login(process.env.TOKEN)*/

const msgs = [{
	content: "Hi guys",
	author: {
		username: "Author 1",
		avatarURL: "https://bing.com",
		id: "author1"
	},
	embeds: [
		{description: "Hello!\n# This is header", title: "Good morning!", color: "#15daff", footer: {text: "foot"}}
	],
	createdAt: new Date(1785775026)
}, {
	content: "my message",
	author: {
		username: "Author 1",
		avatarURL: "https://bing.com",
		id: "author1"
	},
	createdAt: new Date(1785775027)
}, {
	content: "linked message!",
	author: {
		username: "Author 1",
		avatarURL: "https://bing.com",
		id: "author1"
	},
	createdAt: new Date(1785775028)
}, {
	content: "Hello",
	author: {
		username: "Author 2",
		avatarURL: "https://bing.com",
		id: "author2"
	},
	createdAt: new Date(1785775029)
}, {
	content: "Hello",
	author: {
		username: "Author 2",
		avatarURL: "https://bing.com",
		id: "author2"
	},
	createdAt: new Date(1785775030)
}, {
	content: "Hello",
	author: {
		username: "Author 2",
		avatarURL: "https://bing.com",
		id: "author2"
	},
	createdAt: new Date(1785775031)
}, {
	content: "this is a test!",
	author: {
		username: "Author 3",
		avatarURL: "https://bing.com",
		id: "author3"
	},
	createdAt: new Date(1785775032)
}]

render(msgs, {format: "html"}).then(buffer => {
	fs.writeFile("./output.html", buffer, () => {})
})