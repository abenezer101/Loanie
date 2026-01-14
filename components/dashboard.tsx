"use client"

import { useState } from "react"
import { Header } from "./header"
import { DocumentUpload } from "./document-upload"
import { AnalysisPanel } from "./analysis-panel"
import { VideoPreview } from "./video-preview"
import { GenerationProgress } from "./generation-progress"
import type { UploadedDocument, LoanAnalysis, VideoManifest } from "@/lib/types"

type GenerationStep = "idle" | "analyzing" | "generating" | "rendering" | "complete" | "error"

export function Dashboard() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [analysis, setAnalysis] = useState<LoanAnalysis | null>(null)
  const [manifest, setManifest] = useState<VideoManifest | null>(null)
  const [step, setStep] = useState<GenerationStep>("idle")
  const [error, setError] = useState<string | null>(null)
  const [realtimeProgress, setRealtimeProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const handleDocumentsChange = (docs: UploadedDocument[]) => {
    setDocuments(docs)
    setAnalysis(null)
    setManifest(null)
    setStep("idle")
    setError(null)
    setVideoUrl(null)
    setRealtimeProgress(0)
    setProgressLabel("")
  }

  const handleGenerate = async () => {
    if (documents.length === 0) return

    setError(null)
    setStep("analyzing")

    try {
      // Step 1: Analyze documents
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: documents.map((d) => ({ name: d.name, content: d.content })),
        }),
      })

      if (!analyzeResponse.ok) {
        throw new Error("Failed to analyze documents")
      }

      const { analysis: analyzedData } = await analyzeResponse.json()
      setAnalysis(analyzedData)

      // Step 2: Generate video manifest
      setStep("generating")
      const manifestResponse = await fetch("/api/generate-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analyzedData }),
      })

      if (!manifestResponse.ok) {
        throw new Error("Failed to generate video manifest")
      }

      const { manifest: generatedManifest } = await manifestResponse.json()
      setManifest(generatedManifest)

      // Step 3: Trigger real rendering
      setStep("rendering")
      setRealtimeProgress(0)
      setProgressLabel("Starting render...")
      
      const renderResponse = await fetch("/api/generate-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: generatedManifest, analysis: analyzedData }),
      })

      if (!renderResponse.ok) {
        throw new Error("Failed to trigger video rendering")
      }

      const { videoId } = await renderResponse.json()
      console.log(`🎬 Starting video status polling for: ${videoId}`)

      // Poll the unified status endpoint
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/video-status?id=${videoId}`)
          
          if (!statusResponse.ok) {
            console.warn(`⚠️ Status check returned ${statusResponse.status}`)
            return
          }

          const data = await statusResponse.json()
          
          const status = data.status
          const videoUrl = data.videoUrl
          const progressLabel = data.progressLabel || data.progress_label || ""
          const progress = typeof data.progress === 'number' ? data.progress : parseInt(data.progress) || 0

          // Update UI with progress
          if (progress !== undefined && progress !== null) {
            setRealtimeProgress(Number(progress))
          }
          if (progressLabel) {
            setProgressLabel(String(progressLabel))
          }

          // Handle completion
          if (status === 'completed' && videoUrl) {
            clearInterval(pollInterval)
            setVideoUrl(videoUrl)
            setStep("complete")
            setRealtimeProgress(100)
          } else if (status === 'failed') {
            console.error(`❌ Video generation failed`)
            clearInterval(pollInterval)
            setError("Video rendering failed. Please try again.")
            setStep("error")
          }
        } catch (err) {
          console.error("❌ Error polling status:", err)
        }
      }, 2000) // Poll every 2 seconds

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setStep("error")
    }
  }

  const handleReset = () => {
    setDocuments([])
    setAnalysis(null)
    setManifest(null)
    setStep("idle")
    setError(null)
    setVideoUrl(null)
    setRealtimeProgress(0)
    setProgressLabel("")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Document Upload & Analysis */}
          <div className="space-y-6">
            <DocumentUpload
              documents={documents}
              onDocumentsChange={handleDocumentsChange}
              onGenerate={handleGenerate}
              onTestGenerate={() => {}} // Placeholder
              step={step}
              error={error}
              realtimeProgress={realtimeProgress}
              progressLabel={progressLabel}
            />

            {step !== "idle" && (
              <GenerationProgress 
                step={step} 
                error={error} 
                realtimeProgress={realtimeProgress}
                progressLabel={progressLabel}
              />
            )}

            {analysis && <AnalysisPanel analysis={analysis} />}
          </div>

          {/* Right Column - Video Preview */}
          <div className="space-y-6">
            <VideoPreview 
              manifest={manifest} 
              analysis={analysis} 
              videoUrl={videoUrl}
              isReady={step === "complete"} 
              onReset={handleReset} 
              isProcessing={step !== "idle" && step !== "complete" && step !== "error"}
              realtimeProgress={realtimeProgress}
              progressLabel={progressLabel}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
