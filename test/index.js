import { render } from "../dist/index.js"
import { Client } from "discord.js"
import fs from "fs"

const client = new Client({intents: 38403})


client.on("ready", () => {
	console.log("Ready!")
})

client.on("messageCreate", async msg => {
	if(msg.content.startsWith("s")) {
		await msg.react("🔥")

		render(msg).then(buffer => {
			fs.writeFile("./output.png", buffer, () => {})
		})
	}
})

client.login("")