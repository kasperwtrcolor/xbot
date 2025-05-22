import { TwitterApi } from 'twitter-api-v2';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import { extractPrompt, uploadImageToTwitter } from './utils.js';

dotenv.config();

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;
let lastHandledId = null;

const userCooldowns = new Map(); // Tracks per-user request time
const COOLDOWN_MS = 60 * 1000;   // 1-minute cooldown

function logReply(tweetId, prompt, userId) {
  const logLine = {
    time: new Date().toISOString(),
    tweetId,
    prompt,
    userId,
  };
  fs.appendFile('bot-log.json', JSON.stringify(logLine) + '\n', err => {
    if (err) console.error('❌ Failed to log:', err);
  });
}

async function checkMentions() {
  try {
    const result = await rwClient.v2.search(`@bot_wassy`, {
      since_id: lastHandledId,
      'tweet.fields': ['author_id', 'referenced_tweets'],
      max_results: 5,
    });

    if (!result.data?.data?.length) return;

    for (const tweet of result.data.data.reverse()) {
      // Skip retweets or replies
      if (tweet.referenced_tweets?.some(t => t.type === 'retweeted' || t.type === 'replied_to')) {
        console.log(`⛔ Skipped tweet ${tweet.id} (retweet or reply)`);
        continue;
      }

      const userId = tweet.author_id;
      const now = Date.now();

      if (userCooldowns.has(userId) && now - userCooldowns.get(userId) < COOLDOWN_MS) {
        console.log(`⏳ Cooldown active for user ${userId}, skipping.`);
        continue;
      }
      userCooldowns.set(userId, now);

      lastHandledId = tweet.id;

      const prompt = extractPrompt(tweet.text);
      if (!prompt) continue;

      const imageUrl = `${process.env.CF_IMAGE_GEN_URL}${encodeURIComponent(prompt)}`;
      const imageResp = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/png',
        }
      });

      if (!imageResp.ok) {
        console.error('❌ Cloudflare image generation failed:', await imageResp.text());
        continue;
      }

      const imageBuffer = await imageResp.arrayBuffer();
      const mediaId = await uploadImageToTwitter(rwClient, imageBuffer);

      const taggedHandle = (prompt.match(/@\w+/) || [])[0] || 'your idea';

      await rwClient.v2.reply(
        `Here's your image for ${taggedHandle}:`,
        tweet.id,
        { media: { media_ids: [mediaId] } }
      );

      logReply(tweet.id, prompt, userId);

      console.log('✅ Replied to tweet:', tweet.id);
    }
  } catch (err) {
    console.error('❌ Error handling mentions:', err);
  }
}

// ⏳ Poll every 16 minutes to avoid hitting free-tier API rate limit
setInterval(checkMentions, 16 * 60 * 1000);
