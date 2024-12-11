// functions/verifyPayment.ts
import { Connection } from '@solana/web3.js'
import { PrismaClient } from '@prisma/client'
import { Client, GatewayIntentBits } from 'discord.js'

const prisma = new PrismaClient()
const discord = new Client({ intents: [GatewayIntentBits.Guilds] })
discord.login(process.env.DISCORD_BOT_TOKEN)

interface VerifyPaymentEvent {
  httpMethod: string
  body: string
}

interface PaymentRequest {
  signature: string
  discordId: string
  referralCode?: string
  guildId: string
  roleId: string
}

export async function handler(event: VerifyPaymentEvent) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { signature, discordId, referralCode, guildId, roleId } = JSON.parse(
    event.body
  ) as PaymentRequest

  try {
    // 1. Verify Solana transaction
    const connection = new Connection(process.env.SOLANA_RPC_URL || '')
    const tx = await connection.getTransaction(signature)

    if (!tx || !tx.meta || tx.meta.err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid transaction' }),
      }
    }

    // 2. Get or create guild role
    const guildRole = await prisma.guildRole.findFirst({
      where: {
        guildId,
        roleId,
      },
    })

    if (!guildRole) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid guild or role' }),
      }
    }

    // 3. Create or update user
    const user = await prisma.user.upsert({
      where: { discordId },
      update: {},
      create: {
        discordId,
        referralCode: Math.random().toString(36).substring(2, 8),
        referredBy: referralCode,
      },
    })

    // 4. Record payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        transactionSignature: signature,
        amount: guildRole.price,
      },
    })

    // 5. Create subscription
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + guildRole.duration)

    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        guildRoleId: guildRole.id,
        endDate,
      },
    })

    // 6. Process referral if exists
    if (referralCode) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode },
      })

      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            rewardAmount: guildRole.price * 0.1, // 10% reward
          },
        })
      }
    }

    // 7. Add Discord role
    const guild = await discord.guilds.fetch(guildId)
    const member = await guild.members.fetch(discordId)
    await member.roles.add(roleId)

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
