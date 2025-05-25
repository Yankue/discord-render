import nodeHtmlToImage from 'node-html-to-image'
import { Message } from "discord.js";

interface ManualInputMessage {
	content: string
	author: {
		username: string
		avatarURL: string
	}
}



function isDiscordJSMessage(msg: ManualInputMessage|Message): msg is Message {
  return typeof (msg as any).author.globalName === 'string';
}

function formatDiscordTimestamp(date: Date) {
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${timeStr}`;
  }
}


export async function render(msg: ManualInputMessage|Message) {
		console.log(msg.content)

		let avatarURL = ""
		let name = ""
		let userColour = "#ffffff"

		if(isDiscordJSMessage(msg)) {
			avatarURL = msg.author.avatarURL() || "./default.png"

			if(msg.member) {
				name = msg.member.nickname||msg.author.displayName
				userColour = "#"+msg.member.roles.highest.color.toString(16)

			} else {
				name = msg.author.displayName
			}

		} else {
			avatarURL = msg.author.avatarURL
			name = msg.author.username
		}


		const buffer = nodeHtmlToImage({
		  html: `<html>
		  <style>
			  .discord-message {
			    font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
			    background-color: #313338;
			    color: #dbdee1;
			    padding: 16px;
			    border-radius: 8px;
			    max-width: 600px;
			  }

			  .discord-message .message-container {
			    display: flex;
			    align-items: flex-start;
			  }

			  .discord-message .avatar {
			    width: 40px;
			    height: 40px;
			    border-radius: 50%;
			    margin-right: 12px;
			    margin-top: 4px;
			  }

			  .discord-message .content-wrapper {
			    flex: 1;
			  }

			  .discord-message .header {
			    display: flex;
			    align-items: center;
			    margin-bottom: 2px;
			  }

			  .discord-message .username {
			    font-weight: 500;
			    color: ${userColour};
			    margin-right: 8px;
			  }

			  .discord-message .timestamp {
			    font-size: 12px;
			    color: #949ba4;
			  }

			  .discord-message .content {
			    font-size: 16px;
			    line-height: 1.375;
			    white-space: pre-wrap;
			  }
			</style>

		  <body style="max-width: 700px;">


		    <div class="discord-message">
		      <div class="message-container">
		        <img src="${avatarURL}" alt="avatar" class="avatar" />
		        <div class="content-wrapper">
		          <div class="header">
		            <span class="username">${name}</span>
		            <span class="timestamp">${formatDiscordTimestamp(new Date())}</span>
		          </div>
		          <div class="content">${msg.content}</div>
		        </div>
		      </div>
		    </div>


		  </body>
		  </html>`
		})
		return buffer
}