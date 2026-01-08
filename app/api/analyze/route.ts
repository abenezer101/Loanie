
import { LOAN_ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts"

export async function POST(req: Request) {
  try {
    const { documents } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    const documentContext = documents
      .map((doc: { name: string; content: string }) => `--- Document: ${doc.name} ---\n${doc.content}`)
      .join("\n\n")

    const prompt = `${LOAN_ANALYSIS_SYSTEM_PROMPT}\n\nAnalyze the following loan documents and extract structured loan intelligence. Return ONLY a valid JSON object matching the requested schema.\n\n${documentContext}`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://loanie.app", // Optional
        "X-Title": "Loanie", // Optional
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_API_MODEL,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("OpenRouter error:", data);
      throw new Error(data.error?.message || "No response generated from OpenRouter");
    }

    const analysis = JSON.parse(data.choices[0].message.content)

    return Response.json({ analysis })
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ error: "Failed to analyze documents" }, { status: 500 })
  }
}
