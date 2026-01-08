
import { z } from "zod"
import { VIDEO_MANIFEST_SYSTEM_PROMPT } from "@/lib/prompts"
import type { LoanAnalysis } from "@/lib/types"

const visualComponentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("title"), text: z.string() }),
  z.object({ type: z.literal("key_value"), items: z.array(z.object({ label: z.string(), value: z.string() })) }),
  z.object({ type: z.literal("metric_card"), label: z.string(), value: z.string(), trend: z.string() }),
  z.object({
    type: z.literal("bar_chart"),
    title: z.string(),
    data: z.array(z.object({ year: z.string(), value: z.number() })),
  }),
  z.object({
    type: z.literal("risk_table"),
    risks: z.array(z.object({ factor: z.string(), severity: z.string(), mitigant: z.string() })),
  }),
  z.object({
    type: z.literal("covenant_list"),
    covenants: z.array(
      z.object({ type: z.string(), requirement: z.string(), status: z.string(), compliant: z.boolean() }),
    ),
  }),
  z.object({
    type: z.literal("esg_scores"),
    scores: z.object({ environmental: z.string(), social: z.string(), governance: z.string() }),
  }),
  z.object({
    type: z.literal("recommendation"),
    decision: z.string(),
    rationale: z.string(),
    conditions: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("confidence_indicator"),
    status: z.string(),
    confidence: z.string(),
    source: z.string().optional(),
  }),
])

const videoManifestSchema = z.object({
  meta: z.object({
    loan_id: z.string(),
    version: z.string(),
    theme: z.string(),
    resolution: z.string(),
    fps: z.number(),
  }),
  scenes: z.array(
    z.object({
      id: z.string(),
      start: z.number(),
      duration: z.number(),
      narration: z.object({
        text: z.string(),
      }),
      visuals: z.object({
        layout: z.string(),
        components: z.array(visualComponentSchema),
      }),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { analysis }: { analysis: LoanAnalysis } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    const prompt = `${VIDEO_MANIFEST_SYSTEM_PROMPT}\n\nGenerate a video manifest for the following loan analysis:\n\n${JSON.stringify(analysis, null, 2)}`

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

    const manifest = JSON.parse(data.choices[0].message.content)

    return Response.json({ manifest })
  } catch (error) {
    console.error("Manifest generation error:", error)
    return Response.json({ error: "Failed to generate video manifest" }, { status: 500 })
  }
}
