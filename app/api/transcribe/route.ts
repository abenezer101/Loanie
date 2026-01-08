export async function POST(req: Request) {
  const formData = await req.formData()
  const audioFile = formData.get("audio") as File

  if (!audioFile) {
    return Response.json({ error: "No audio file provided" }, { status: 400 })
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer()
    const apiKey = process.env.DEEPGRAM_API_KEY

    const response = await fetch("https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2&language=en-US", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": audioFile.type || "audio/webm",
      },
      body: arrayBuffer,
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Deepgram error details:", errorData)
      throw new Error(`Deepgram API error: ${response.statusText}`)
    }

    const data = await response.json()
    const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || ""

    return Response.json({ text: transcript })
  } catch (error) {
    console.error("Transcription error:", error)
    return Response.json({ error: "Transcription failed" }, { status: 500 })
  }
}
