"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, FileVideo, Sparkles, Trash2, Pencil, FileText, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentUpload } from "@/components/document-upload"
import { GenerationProgress } from "@/components/generation-progress"
import { AnalysisPanel } from "@/components/analysis-panel"
import { VideoPreview } from "@/components/video-preview"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { getRecordings, deleteRecording, updateRecording } from "@/lib/storage"
import type { Recording, UploadedDocument, LoanAnalysis, VideoManifest } from "@/lib/types"

type GenerationStep = "idle" | "analyzing" | "generating" | "rendering" | "complete" | "error"

export default function GenerateVideoPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [analysis, setAnalysis] = useState<LoanAnalysis | null>(null)
  const [manifest, setManifest] = useState<VideoManifest | null>(null)
  const [step, setStep] = useState<GenerationStep>("idle")
  const [realtimeProgress, setRealtimeProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // Real-time notification subscription
  useEffect(() => {
    // This is handled inside handleGenerate now for specific videoId
  }, [step])
  const [error, setError] = useState<string | null>(null)
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editTranscript, setEditTranscript] = useState("")

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      const response = await fetch("/api/recordings")
      if (response.ok) {
        const data = await response.json()
        setRecordings(data)
      }
    } catch (error) {
      console.error("Failed to fetch recordings:", error)
    }
  }

  const handleDeleteRecording = async (id: string) => {
    try {
      const response = await fetch(`/api/recordings/${id}`, { method: "DELETE" })
      if (response.ok) {
        fetchRecordings()
        if (selectedRecording?.id === id) {
          setSelectedRecording(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete recording:", error)
    }
  }

  const handleEditClick = (recording: Recording) => {
    setEditingRecording(recording)
    setEditTitle(recording.title)
    setEditTranscript(recording.transcript)
  }

  const handleSaveEdit = async () => {
    if (!editingRecording) return
    try {
      const response = await fetch(`/api/recordings/${editingRecording.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          transcript: editTranscript,
        }),
      })
      if (response.ok) {
        fetchRecordings()
        if (selectedRecording?.id === editingRecording.id) {
          setSelectedRecording({
            ...selectedRecording,
            title: editTitle,
            transcript: editTranscript,
          })
        }
        setEditingRecording(null)
      }
    } catch (error) {
      console.error("Failed to save recording:", error)
    }
  }

  const handleDocumentsChange = (docs: UploadedDocument[]) => {
    setDocuments(docs)
    setAnalysis(null)
    setManifest(null)
    setStep("idle")
    setError(null)
  }

  const handleGenerate = async () => {
    if (documents.length === 0 && !selectedRecording) {
      setError("Please upload documents or select a recording")
      return
    }

    setError(null)
    setStep("analyzing")

    try {
      console.log("🚀 Starting generation process...")
      
      // Step 0: Extract text from documents
      console.log("📂 Extracting content from " + documents.length + " documents...")
      const processedDocuments = await Promise.all(documents.map(async (doc) => {
        if (doc.content) return doc
        if (!doc.file) return doc

        try {
          console.log(`  - Extracting: ${doc.name}`)
          const formData = new FormData()
          formData.append("file", doc.file)
          
          const response = await fetch("/api/extract", {
            method: "POST",
            body: formData,
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`  ✅ Extracted ${data.text.length} chars from ${doc.name}`)
            return { ...doc, content: data.text }
          }
          
          console.warn(`  - HTTP error extracting ${doc.name}, falling back to text()`)
          const text = await doc.file.text()
          return { ...doc, content: text }
        } catch (error) {
          console.error(`  ❌ Failed to extract content from ${doc.name}`, error)
          return doc
        }
      }))

      setDocuments(processedDocuments)

      const allDocuments = [...processedDocuments.map((d) => ({ name: d.name, content: d.content }))]

      if (selectedRecording) {
        console.log(`🎙️ Including transcript from recording: ${selectedRecording.title}`)
        allDocuments.push({
          name: `Meeting Transcript - ${selectedRecording.title}`,
          content: selectedRecording.transcript,
        })
      }

      // Step 1: Analyze documents
      console.log("🧠 Analyzing document intelligence (AI)...")
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: allDocuments }),
      })

      if (!analyzeResponse.ok) {
        console.error("❌ Analysis failed:", await analyzeResponse.text())
        throw new Error("Failed to analyze documents")
      }

      const { analysis: analyzedData } = await analyzeResponse.json()
      console.log("✅ Analysis complete:", analyzedData)
      setAnalysis(analyzedData)

      // Step 2: Generate video manifest
      console.log("🎬 Generating video manifest...")
      setStep("generating")
      const manifestResponse = await fetch("/api/generate-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analyzedData }),
      })

      if (!manifestResponse.ok) {
        console.error("❌ Manifest generation failed:", await manifestResponse.text())
        throw new Error("Failed to generate video manifest")
      }

      const { manifest: generatedManifest } = await manifestResponse.json()
      console.log("✅ Manifest generated:", generatedManifest)
      
      setManifest(generatedManifest)

      // Step 3: Render final video through the generator service
      console.log("🎬 Initiating final video render...")
      setStep("rendering")
      setRealtimeProgress(0)
      setProgressLabel("Starting render...")
      const renderResponse = await fetch("/api/generate-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          manifest: generatedManifest, 
          analysis: analyzedData,
          recordingId: selectedRecording?.id 
        }),
      })

      const renderInitiationData = await renderResponse.json()
      const { videoId, status: initialStatus, videoUrl: initialVideoUrl } = renderInitiationData
      
      console.log(`🎬 Render initiated: ${videoId} (Status: ${initialStatus})`)

      if (initialStatus === "completed" && initialVideoUrl) {
        setVideoUrl(initialVideoUrl)
        setStep("complete")
        setRealtimeProgress(100)
      } else {
        // Use the consolidated polling logic
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/video-status?id=${videoId}`)
            if (statusResponse.ok) {
              const data = await statusResponse.json()
              const { status, videoUrl: finalUrl, progress, progressLabel } = data
              
              if (progress !== undefined) setRealtimeProgress(progress)
              if (progressLabel) setProgressLabel(progressLabel)

              if (status === "completed" && finalUrl) {
                setVideoUrl(finalUrl)
                setStep("complete")
                setRealtimeProgress(100)
                clearInterval(pollInterval)
              } else if (status === "failed") {
                setError("Video rendering failed")
                setStep("error")
                clearInterval(pollInterval)
              }
            }
          } catch (e) {
            console.error("Polling error:", e)
          }
        }, 2000)

        // Cleanup on timeout
        setTimeout(() => {
          clearInterval(pollInterval)
          if (step === "rendering") {
            setError("Rendering is taking longer than expected. Please check the History page in a few minutes.")
          }
        }, 600000) // 10 minutes
      }

      console.log("✨ Briefing generation initiated!")
    } catch (err) {
      console.error("💥 Generation process failed:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      setStep("error")
    }
  }

  const handleTestGenerate = async () => {
    setError(null)
    setStep("rendering")
    setRealtimeProgress(0)
    setProgressLabel("Initiating test...")
    
    try {
      console.log("🧪 Starting TEST video generation process...")
      
      // Step 1: Fetch the last manifest
      console.log("📥 Fetching last video manifest...")
      const response = await fetch("/api/test-video-generation")
      if (!response.ok) {
        throw new Error("Failed to fetch last manifest")
      }
      
      const { manifest: lastManifest, analysis: lastAnalysis, recordingId: lastRecordingId } = await response.json()
      console.log("✅ Last manifest fetched:", lastManifest)
      
      setManifest(lastManifest)
      setAnalysis(lastAnalysis)
      
      // Step 2: Render final video through the generator service
      console.log("🎬 Initiating final video render (TEST mode)...")
      const renderResponse = await fetch("/api/generate-video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          manifest: lastManifest, 
          analysis: lastAnalysis,
          recordingId: lastRecordingId 
        }),
      })

      if (!renderResponse.ok) {
        throw new Error("Failed to initiate video rendering")
      }

      const { videoId, status: initialStatus, videoUrl: initialVideoUrl } = await renderResponse.json()
      console.log(`🎬 TEST Render initiated: ${videoId} (Status: ${initialStatus})`)

      if (initialStatus === "completed" && initialVideoUrl) {
        setVideoUrl(initialVideoUrl)
        setStep("complete")
        setRealtimeProgress(100)
      } else {
        // Poll for test video with full progress support
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/video-status?id=${videoId}`)
            if (statusResponse.ok) {
              const data = await statusResponse.json()
              const { status, videoUrl: finalUrl, progress, progressLabel } = data
              
              if (progress !== undefined) setRealtimeProgress(progress)
              if (progressLabel) setProgressLabel(progressLabel)

              if (status === "completed" && finalUrl) {
                setVideoUrl(finalUrl)
                setStep("complete")
                setRealtimeProgress(100)
                clearInterval(pollInterval)
              } else if (status === "failed") {
                setError("Video rendering failed")
                setStep("error")
                clearInterval(pollInterval)
              }
            }
          } catch (e) {
            console.error("Test polling error:", e)
          }
        }, 2000)
      }
    } catch (err) {
      console.error("💥 TEST generation failure:", err)
      setError(err instanceof Error ? err.message : "An error occurred during test")
      setStep("error")
    }
  }

  const handleReset = () => {
    setDocuments([])
    setAnalysis(null)
    setManifest(null)
    setStep("idle")
    setError(null)
    setSelectedRecording(null)
  }


  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-2 py-8 max-w-[1800px] flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Generate Video</h1>
          <p className="text-sm text-muted-foreground">Create professional loan briefing videos from your recordings and documents.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Saved Recordings Sidebar */}
          <div className="lg:col-span-4 w-full">
            <Card className="bg-card border-border shadow-xl relative overflow-hidden w-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground">Saved Recordings</CardTitle>
                <CardDescription className="text-sm">Select a recording to include</CardDescription>
              </CardHeader>
              <CardContent className="p-0 w-full">
                <ScrollArea className="max-h-[600px] w-full">
                  <div className="pr-2 w-full">
                    {recordings.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm w-full">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No recordings yet</p>
                        <Link href="/record-meeting" className="text-primary hover:underline text-xs mt-1 block">
                          Record a meeting
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-border w-full">
                        {recordings.map((recording) => (
                          <div
                            key={recording.id}
                            className={`w-full p-3 cursor-pointer transition-all hover:bg-secondary/50 relative ${
                              selectedRecording?.id === recording.id 
                                ? "border-l-4 border-primary" 
                                : "border-l-4 border-transparent"
                            }`}
                            onClick={() =>
                              setSelectedRecording(selectedRecording?.id === recording.id ? null : recording)
                            }
                          >
                            <div className="flex items-start gap-2 w-full">
                              <div className="flex-1 min-w-0 overflow-hidden w-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{recording.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 w-full">
                                  {recording.transcript || "No transcript available"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-green-500 hover:bg-transparent cursor-pointer flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteRecording(recording.id)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-green-500 hover:bg-transparent cursor-pointer flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditClick(recording)
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Document Upload */}
          <div className="lg:col-span-4 space-y-8">
            <DocumentUpload
              documents={documents}
              onDocumentsChange={handleDocumentsChange}
              onGenerate={handleGenerate}
              onTestGenerate={handleTestGenerate}
              step={step}
              error={error}
              selectedRecording={selectedRecording}
              realtimeProgress={realtimeProgress}
              progressLabel={progressLabel}
            />
          </div>

          {/* Video Preview & Analysis */}
          <div className="lg:col-span-4 h-full">
            <VideoPreview 
              manifest={manifest} 
              analysis={analysis} 
              videoUrl={videoUrl}
              isReady={step === "complete"} 
              isProcessing={step !== "idle" && step !== "complete" && step !== "error"}
              realtimeProgress={realtimeProgress}
              progressLabel={progressLabel}
              onReset={handleReset} 
            />
          </div>
        </div>
      </main>

      {/* Edit Recording Dialog */}
      <Dialog open={!!editingRecording} onOpenChange={(open) => !open && setEditingRecording(null)}>
        <DialogContent className="max-w-2xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Recording title"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Transcript</label>
              <Textarea
                value={editTranscript}
                onChange={(e) => setEditTranscript(e.target.value)}
                placeholder="Recording transcript"
                className="min-h-[300px] bg-background border-border font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecording(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
