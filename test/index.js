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
		username: "Mr Author",
		avatarURL: "https://bing.com",
		id: "authorman"
	},
	username: "Mr Author",
	name: "Mr Author",
	embeds: [
		{description: "Hello!\n# This is header", title: "Good morning!", color: "#15daff", footer: {text: "foot"}}
	],
	createdAt: new Date()
}, {
	content: "whats good",
	author: {
		username: "Mr Author",
		avatarURL: "https://bing.com",
		id: "authorman"
	},
	username: "Mr Author",
	name: "Mr Author",
	createdAt: new Date()
}, {
	content: "AYYYYY",
	author: {
		username: "Mr Author",
		avatarURL: "https://bing.com",
		id: "authorman"
	},
	username: "Mr Author",
	name: "Mr Author",
	createdAt: new Date()
}]

render(msgs, {format: "html"}).then(buffer => {
	fs.writeFile("./output.html", buffer, () => {})
})