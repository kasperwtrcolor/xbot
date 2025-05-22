Wassy Bot — Twitter Image Generator & Replier

Wassy Bot is a Twitter automation tool that uses AI to generate an image from a text prompt and reply to a specific tweet with the generated image.
It includes a web UI that allows anyone to trigger the bot with just a Tweet link and a prompt.

⸻

 Live Web App

https://dev.fun/p/8a8964ef1f66a5df34cf

⸻

 Features
	•	AI-generated images via [Cloudflare Workers AI]
	•	Auto-replies to any tweet with an image
	•	Accepts full Tweet links or raw Tweet IDs
	•	Client-side cooldown (1 minute)
	•	CORS-enabled, serverless-friendly

⸻

 How It Works
	1.	User pastes a Tweet link or ID and a text prompt into the form
	2.	The frontend sends the prompt and tweet ID to the backend
	3.	The backend:
	•	Generates an image from the prompt via Cloudflare Workers
	•	Uploads it to Twitter via API
	•	Replies to the specified tweet with the image

⸻

 Tech Stack
	•	Backend: Node.js + Express + twitter-api-v2 + node-fetch
	•	Image Gen: Cloudflare Workers AI
	•	Hosting: Render.com (backend), dev.fun (frontend)
