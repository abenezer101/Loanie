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
      
      const renderResponse = await fetch("/api/generate-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: generatedManifest, analysis: analyzedData }),
      })

      if (!renderResponse.ok) {
        throw new Error("Failed to trigger video rendering")
      }

      const { videoId } = await renderResponse.json()

      // Subscribe to Supabase for progress updates
      const { supabase } = await import("@/lib/supabase")
      
      supabase
        .channel(`video-${videoId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'videos', 
          filter: `id=eq.${videoId}` 
        }, (payload: any) => {
          const { progress, progress_label, status, video_url } = payload.new
          
          if (progress !== undefined) setRealtimeProgress(progress)
          if (progress_label) setProgressLabel(progress_label)
          
          if (status === 'completed') {
            setVideoUrl(video_url)
            setStep("complete")
          } else if (status === 'failed') {
            setError("Video rendering failed. Please try again.")
            setStep("error")
          }
        })
        .subscribe()

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
            />
          </div>
        </div>
      </main>
    </div>
  )
}
