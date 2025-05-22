export async function uploadImageToTwitter(client, buffer) {
  return await client.v1.uploadMedia(Buffer.from(buffer), {
    mimeType: 'image/png',
  });
}
