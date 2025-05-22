import { TwitterApi } from 'twitter-api-v2';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
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

async function checkMentions() {
  try {
    const result = await rwClient.v2.search(`@bot_wassy`, {
      since_id: lastHandledId,
      'tweet.fields': ['author_id', 'referenced_tweets'],
      max_results: 5,
    });

    if (!result.data?.data?.length) return;

    for (const tweet of result.data.data.reverse()) {
      // Skip retweets or replies to avoid loops or spam
      if (tweet.referenced_tweets?.some(t => t.type === 'retweeted' || t.type === 'replied_to')) {
        continue;
      }

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
        console.error('Cloudflare image generation failed:', await imageResp.text());
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

      console.log('✅ Replied to tweet:', tweet.id);
    }
  } catch (err) {
    console.error('❌ Error handling mentions:', err);
  }
}

setInterval(checkMentions, 60000);
