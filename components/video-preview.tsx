"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Download, RotateCcw, FileVideo, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoScene } from "./video-scene"
import { AnalysisPanel } from "./analysis-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LoanAnalysis, VideoManifest } from "@/lib/types"

interface VideoPreviewProps {
  manifest: VideoManifest | null
  analysis: LoanAnalysis | null
  videoUrl: string | null
  isReady: boolean
  isProcessing?: boolean
  onReset: () => void
}

export function VideoPreview({ manifest, analysis, videoUrl, isReady, isProcessing, onReset }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)

  const totalDuration = manifest?.scenes.reduce((acc, scene) => acc + scene.duration, 0) || 0

  useEffect(() => {
    if (isPlaying && manifest && !videoUrl) {
      const scene = manifest.scenes[currentSceneIndex]
      if (scene?.narration.audioUrl) {
        const newAudio = new Audio(scene.narration.audioUrl)
        newAudio.play().catch(console.error)
        setAudio(newAudio)
      }
    } else {
      audio?.pause()
    }
    return () => audio?.pause()
  }, [isPlaying, currentSceneIndex, videoUrl])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && manifest && !videoUrl) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1
          if (next >= totalDuration) {
            setIsPlaying(false)
            return 0
          }
          return next
        })
      }, 100)
    }

    return () => clearInterval(interval)
  }, [isPlaying, manifest, totalDuration, videoUrl])

  useEffect(() => {
    if (!manifest || videoUrl) return

    let elapsed = 0
    for (let i = 0; i < manifest.scenes.length; i++) {
      if (currentTime >= elapsed && currentTime < elapsed + manifest.scenes[i].duration) {
        if (currentSceneIndex !== i) {
          setCurrentSceneIndex(i)
        }
        break
      }
      elapsed += manifest.scenes[i].duration
    }
  }, [currentTime, manifest, currentSceneIndex, videoUrl])

  const togglePlay = () => {
    if (videoUrl && videoElement) {
      if (isPlaying) {
        videoElement.pause()
      } else {
        videoElement.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleDownloadMp4 = async () => {
    if (!videoUrl) return
    setIsDownloading(true)
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `briefing-${manifest?.meta.loan_id || 'video'}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed:", err)
      // Fallback to direct link if fetch fails
      window.open(videoUrl, "_blank")
    } finally {
      setIsDownloading(false)
    }
  }

  

  const handleExportPdf = async () => {
    if (!analysis) return
    
    const jsPDF = (await import("jspdf")).default
    const autoTable = (await import("jspdf-autotable")).default
    
    const doc = new jsPDF()
    
    doc.setFontSize(22)
    doc.setTextColor(0, 100, 255)
    doc.text("LOANIE", 105, 20, { align: "center" })
    
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text("Professional Loan Briefing Analysis", 105, 30, { align: "center" })
    
    doc.setFontSize(14)
    doc.text("1. Loan Overview", 14, 45)
    
    const overview = (analysis as any).loanOverview || (analysis as any).loan_overview || {}
    const financial = (analysis as any).financialHealth || (analysis as any).financial_health || (analysis as any).financialAnalysis || {}
    const rec = (analysis as any).recommendation || {}

    autoTable(doc, {
      startY: 48,
      body: [
        ["Borrower", overview.borrowerName || overview.borrowerLegalName || "N/A"],
        ["Loan Type", overview.loanType || "N/A"],
        ["Amount", overview.amount || "N/A"],
        ["Tenor", overview.tenor || "N/A"],
        ["Purpose", overview.purpose || "N/A"],
        ["Description", overview.description || "N/A"]
      ],
      theme: 'grid',
      styles: { fontSize: 10 }
    })
    
    const currentY = (doc as any).lastAutoTable.finalY + 10
    doc.text("2. Financial Health", 14, currentY)
    autoTable(doc, {
      startY: currentY + 3,
      body: [
        ["Revenue", financial.revenue || "N/A"],
        ["EBITDA", financial.ebitda || "N/A"],
        ["EBITDA Margin", financial.ebitdaMargin || (financial.ebitda && (financial.ebitda as any).margin) || "N/A"],
        ["Leverage", financial.leverage || (financial.leverage && (financial.leverage as any).debtToEbitda) || "N/A"],
        ["Interest Coverage", financial.interestCoverage || "N/A"]
      ],
      theme: 'grid',
      styles: { fontSize: 10 }
    })
    
    const recY = (doc as any).lastAutoTable.finalY + 10
    doc.text("3. Credit Recommendation", 14, recY)
    doc.setFontSize(10)
    const decision = (rec.decision || "N/A").toUpperCase()
    doc.text(`Decision: ${decision}`, 14, recY + 8)
    doc.text(`Rationale:`, 14, recY + 14)
    const splitRationale = doc.splitTextToSize(rec.rationale || "N/A", 180)
    doc.text(splitRationale, 14, recY + 20)

    doc.save(`Loanie-Analysis-${(overview.borrowerName || 'Report').replace(/\s+/g, '-')}.pdf`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentScene = manifest?.scenes[currentSceneIndex]

  return (
    <Card className="bg-card border-border shadow-xl relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <Tabs defaultValue="video" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="video">Video Briefing</TabsTrigger>
              <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
            </TabsList>
            {isReady && (
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          <TabsContent value="video" className="space-y-4 mt-0">
            {/* Video Display */}
            <div className="aspect-video bg-background rounded-lg border border-border overflow-hidden relative">
              {isProcessing ? (
                <div className="absolute inset-0 p-4 space-y-4">
                  <Skeleton className="w-full h-full rounded-lg" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-medium text-primary animate-pulse">Generating Briefing...</p>
                    <p className="text-[10px] text-muted-foreground">Orchestrating AI & Video Rendering</p>
                  </div>
                </div>
              ) : !manifest ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-center p-6">
                  <FileVideo className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-sm font-medium">Ready to generate briefing</p>
                  <p className="text-xs mt-1">Upload documents and click generate to see the AI preview</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col bg-black">
                  {videoUrl ? (
                    <video
                      ref={setVideoElement}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onClick={togglePlay}
                      autoPlay
                      controls
                    />
                  ) : (
                    <VideoScene scene={currentScene!} analysis={analysis!} />
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            {manifest && (
              <>
                <div className="space-y-2">
                  {!videoUrl && (
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-100"
                        style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{videoUrl ? "Final View" : formatTime(currentTime)}</span>
                    <span>{videoUrl ? "MP4 Rendered" : formatTime(totalDuration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full border-primary/20 hover:border-primary/50"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 text-primary" /> : <Play className="w-6 h-6 ml-1 text-primary" />}
                    </Button>
                  </div>
                </div>

                {/* Download / Export Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  {videoUrl ? (
                    <Button 
                      onClick={handleDownloadMp4} 
                      disabled={isDownloading}
                      className="w-full h-14 text-base font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-3" />
                          Download MP4 Video
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="w-full h-14 text-base font-bold bg-secondary text-muted-foreground cursor-not-allowed"
                    >
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Rendering MP4...
                    </Button>
                  )}
                  
                  {analysis && (
                    <Button 
                      onClick={handleExportPdf}
                      variant="secondary"
                      className="w-full h-14 text-base font-bold shadow-md transition-all hover:scale-[1.01]"
                    >
                      <FileText className="w-5 h-5 mr-3" />
                      Export Detailed PDF
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            {analysis ? (
              <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <AnalysisPanel analysis={analysis} />
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No analysis data yet</p>
                <p className="text-xs mt-1">Complete the generation process first</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  )
}
