// functions/verifyPayment.ts
import { Connection, PublicKey } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'
import { Client, GatewayIntentBits } from 'discord.js'

const prisma = new PrismaClient()
const discord = new Client({ intents: [GatewayIntentBits.Guilds] })
discord.login(process.env.DISCORD_BOT_TOKEN)

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { signature, discordId, referralCode } = JSON.parse(event.body)

  try {
    // 1. Verify Solana transaction
    const connection = new Connection(process.env.SOLANA_RPC_URL)
    const tx = await connection.getTransaction(signature)

    if (!tx || tx.meta.err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid transaction' }),
      }
    }

    // 2. Create or update user
    const user = await prisma.user.upsert({
      where: { discordId },
      update: {
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      create: {
        discordId,
        referralCode: Math.random().toString(36).substring(2, 8),
        referredBy: referralCode,
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // 3. Record payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        transactionSignature: signature,
        amount: 1.0, // Set your amount
      },
    })

    // 4. Process referral if exists
    if (referralCode) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode },
      })

      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            rewardAmount: 0.1, // Set reward amount
          },
        })
      }
    }

    // 5. Add Discord role
    const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID)
    const member = await guild.members.fetch(discordId)
    await member.roles.add(process.env.DISCORD_ROLE_ID)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, user }),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
