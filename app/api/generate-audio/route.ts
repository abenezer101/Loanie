import { createClient } from "@deepgram/sdk"
import { Readable } from "stream"

export async function POST(req: Request) {
    try {
        const { text } = await req.json()

        if (!text || typeof text !== "string" || text.trim() === "") {
            console.warn("Empty or invalid text received for audio generation")
            return Response.json({ error: "No text provided for audio generation" }, { status: 400 })
        }

        const apiKey = process.env.DEEPGRAM_API_KEY
        if (!apiKey) {
            throw new Error("Missing DEEPGRAM_API_KEY environment variable")
        }

        const deepgram = createClient(apiKey)

        console.log(`🔊 Generating audio for text: "${text.substring(0, 50)}..." using model aura-2-odysseus-en`)

        const response = await deepgram.speak.request(
            { text },
            {
                model: "aura-2-odysseus-en",
            }
        )

        const stream = await response.getStream()

        if (!stream) {
            throw new Error("Failed to get stream from Deepgram")
        }

        // Convert the web stream to a Buffer
        const reader = stream.getReader()
        const chunks: Uint8Array[] = []

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
        }

        const audioBuffer = Buffer.concat(chunks.map(c => Buffer.from(c)))
        const base64Audio = audioBuffer.toString("base64")
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`

        console.log("✅ Audio generation successful")
        return Response.json({ audioUrl })
    } catch (error: any) {
        console.error("Audio generation error:", error)
        return Response.json({ error: error.message || "Failed to generate audio" }, { status: 500 })
    }
}
