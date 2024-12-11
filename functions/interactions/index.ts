// functions/interactions/index.ts
import { verifyKey } from 'discord-interactions'

interface DiscordEvent {
  body: string
  headers: {
    'x-signature-ed25519': string
    'x-signature-timestamp': string
  }
}

export const handler = async (event: DiscordEvent) => {
  // Discord sends a ping with type 1 to verify the endpoint
  const { type = null } = JSON.parse(event.body || '{}')

  // Verify the request is actually from Discord
  console.log('Full event:', JSON.stringify(event, null, 2))
  console.log('Headers:', JSON.stringify(event.headers, null, 2))

  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']
  console.log('Signature:', signature)
  console.log('Timestamp:', timestamp)
  console.log('Public Key:', process.env.DISCORD_PUBLIC_KEY)

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
