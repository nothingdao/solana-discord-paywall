// functions/interactions/index.ts
import { verifyKey } from 'discord-interactions'

interface DiscordEvent {
  httpMethod: string
  body: string
  headers: {
    'x-signature-ed25519': string
    'x-signature-timestamp': string
  }
}

export const handler = async (event: DiscordEvent) => {
  // For GET requests (health check), just return OK
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'OK' }),
    }
  }

  // Discord only sends POSTs for interactions
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  console.log('Full event:', JSON.stringify(event, null, 2))
  console.log('Headers:', JSON.stringify(event.headers, null, 2))

  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']
  const publicKey = process.env.DISCORD_PUBLIC_KEY

  console.log('Signature:', signature)
  console.log('Timestamp:', timestamp)
  console.log('Public Key:', publicKey)

  if (!signature || !timestamp || !publicKey) {
    console.log('Missing:', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasPublicKey: !!publicKey,
    })
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'Missing request signature or public key',
      }),
    }
  }

  try {
    // Discord sends a ping with type 1 to verify the endpoint
    const { type = null } = JSON.parse(event.body || '{}')
    console.log('Interaction Type:', type)

    const isValidRequest = verifyKey(
      event.body,
      signature,
      timestamp,
      publicKey
    )
    console.log('Is Valid Request:', isValidRequest)

    if (!isValidRequest) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid request signature' }),
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
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
