// functions/interactions/index.ts
import { verifyKey } from 'discord-interactions'

export const handler = async (event) => {
  // Discord sends a ping with type 1 to verify the endpoint
  const { type = null } = JSON.parse(event.body || '{}')

  // Verify the request is actually from Discord
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']
  const publicKey = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !publicKey) {
    return {
      statusCode: 401,
      body: 'Missing request signature or public key',
    }
  }

  const isValidRequest = verifyKey(event.body, signature, timestamp, publicKey)

  if (!isValidRequest) {
    return {
      statusCode: 401,
      body: 'Invalid request signature',
    }
  }

  // Handle Discord's ping
  if (type === 1) {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: 1 }),
    }
  }

  // For other types of interactions (to be implemented)
  return {
    statusCode: 200,
    body: JSON.stringify({ type: 1 }),
  }
}
