import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',       // voz natural, funciona bien en español
      input: text.slice(0, 4096),
      speed: 1.0,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // cache 24h en el browser
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('TTS error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
