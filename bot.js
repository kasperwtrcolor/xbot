// bot.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';
import { TwitterApi } from 'twitter-api-v2';
import { uploadImageToTwitter } from './utils.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

app.post('/generate-and-reply', async (req, res) => {
  const { tweet_id, prompt } = req.body;

  if (!tweet_id || !/^[0-9]{5,20}$/.test(tweet_id)) {
    return res.status(400).json({ error: 'Invalid or missing tweet_id' });
  }

  if (!prompt || prompt.length < 3) {
    return res.status(400).json({ error: 'Invalid or missing prompt' });
  }

  if (!process.env.CF_IMAGE_GEN_URL) {
    console.error('❌ CF_IMAGE_GEN_URL not set in environment');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const imageUrl = `${process.env.CF_IMAGE_GEN_URL}${encodeURIComponent(prompt)}`;
    const imageResp = await fetch(imageUrl, {
      headers: { Accept: 'image/png' },
    });

    if (!imageResp.ok) {
      const errText = await imageResp.text();
      console.error('❌ Image generation error:', errText);
      return res.status(500).json({ error: 'Image generation failed' });
    }

    const imageBuffer = await imageResp.arrayBuffer();
    const mediaId = await uploadImageToTwitter(rwClient, imageBuffer);

    const reply = await rwClient.v2.reply(
      `Here's your image for: ${prompt}`,
      tweet_id,
      { media: { media_ids: [mediaId] } }
    );

    res.json({ status: '✅ Image posted', reply });
  } catch (err) {
    console.error('❌ Failed to reply:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
