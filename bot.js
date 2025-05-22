import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { TwitterApi } from 'twitter-api-v2';
import { uploadImageToTwitter } from './utils.js';

dotenv.config();

const app = express();
app.use(express.json());

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

// POST /generate-and-reply
app.post('/generate-and-reply', async (req, res) => {
  const { tweet_id, prompt } = req.body;

  if (!tweet_id || !prompt) {
    return res.status(400).json({ error: 'Missing tweet_id or prompt' });
  }

  try {
    const imageUrl = `${process.env.CF_IMAGE_GEN_URL}${encodeURIComponent(prompt)}`;
    const imageResp = await fetch(imageUrl, {
      headers: { Accept: 'image/png' }
    });

    if (!imageResp.ok) {
      const errText = await imageResp.text();
      console.error('Cloudflare image generation failed:', errText);
      return res.status(500).json({ error: 'Image generation failed' });
    }

    const imageBuffer = await imageResp.arrayBuffer();
    const mediaId = await uploadImageToTwitter(rwClient, imageBuffer);

    const reply = await rwClient.v2.reply(
      `Here's your image for: ${prompt}`,
      tweet_id,
      { media: { media_ids: [mediaId] } }
    );

    res.json({ status: '✅ Replied', reply });
  } catch (err) {
    console.error('❌ Failed to reply:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Web bot running on port ${PORT}`);
});
