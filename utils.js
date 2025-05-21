export function extractPrompt(tweetText) {
  const parts = tweetText.split(' ').filter(w => !w.includes('@YourBotUsername'));
  if (parts.length === 0) return null;
  return parts.join(' ').trim();
}

export async function uploadImageToTwitter(client, buffer) {
  const mediaId = await client.v1.uploadMedia(Buffer.from(buffer), { mimeType: 'image/png' });
  return mediaId;
}
