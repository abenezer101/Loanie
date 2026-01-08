"use client"

import type React from "react"

import { Upload, FileText, X, Sparkles, Loader2, Mic, CheckCircle2, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useCallback, useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { UploadedDocument, Recording } from "@/lib/types"

interface DocumentUploadProps {
  documents: UploadedDocument[]
  onDocumentsChange: (docs: UploadedDocument[]) => void
  onGenerate: () => void
  onTestGenerate: () => void
  step: "idle" | "analyzing" | "generating" | "rendering" | "complete" | "error"
  error: string | null
  selectedRecording?: Recording | null
  realtimeProgress?: number
  progressLabel?: string
}

const DISPLAY_STEPS = [
  "extracting content...",
  "analyzing documents...",
  "generating video manifest...",
  "generating audio narration...",
  "finalizing briefing..."
]

export function DocumentUpload({
  documents,
  onDocumentsChange,
  onGenerate,
  onTestGenerate,
  step,
  error,
  selectedRecording,
  realtimeProgress,
  progressLabel,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [displayTextIndex, setDisplayTextIndex] = useState(0)

  const isGenerating = step !== "idle" && step !== "complete" && step !== "error"

  // Progress logic
  useEffect(() => {
    if (realtimeProgress !== undefined && step === "rendering") {
      setProgress(realtimeProgress)
      return
    }

    if (step === "analyzing") {
      setProgress(20)
      setDisplayTextIndex(0) // extracting
    } else if (step === "generating") {
      setProgress(50)
      setDisplayTextIndex(2) // generating manifest
    } else if (step === "rendering") {
      setProgress(80)
      setDisplayTextIndex(3) // generating audio
    } else if (step === "complete") {
      setProgress(100)
      setDisplayTextIndex(4) // finalized
    } else if (step === "error") {
      setProgress(progress)
    } else {
      setProgress(0)
      setDisplayTextIndex(0)
    }
  }, [step, realtimeProgress])

  useEffect(() => {
    if (!isGenerating) return

    const interval = setInterval(() => {
      setDisplayTextIndex((prev) => {
        if (step === "analyzing" && prev < 1) return prev + 1
        if (step === "rendering" && prev < 4) return prev + 1
        return prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [step, isGenerating])

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return

      const newDocs: UploadedDocument[] = []

      for (const file of Array.from(files)) {
        newDocs.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: "", // Content will be extracted during generation
          file: file, // Store file for later extraction
          uploadedAt: new Date(),
        })
      }

      onDocumentsChange([...documents, ...newDocs])
    },
    [documents, onDocumentsChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter((d) => d.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canGenerate = documents.length > 0 || !!selectedRecording

  return (
    <Card className="bg-card border-border shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold text-foreground">Upload Documents</CardTitle>
        <CardDescription className="text-sm">Upload loan documents, financial statements, or meeting transcripts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedRecording && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{selectedRecording.title}</p>
              <p className="text-xs text-muted-foreground">Recording selected for analysis</p>
            </div>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] group shadow-inner"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.csv,.txt"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-base text-foreground font-semibold mb-2">Drag and drop files here, or click to browse</p>
          <p className="text-sm text-muted-foreground">Supports PDF, DOCX, XLSX, CSV, and TXT files</p>
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument(doc.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Progress Button */}
        <div className="space-y-3">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            size="lg"
            className="w-full h-14 text-base font-bold bg-secondary/30 relative overflow-hidden group border-2 border-primary/30 hover:border-primary/60 hover:bg-secondary/40 transition-all hover:scale-[1.01] cursor-pointer"
          >
            {/* Background Fill */}
            <motion.div
              className={`absolute inset-0 ${step === "error" ? "bg-destructive/20" : "bg-primary/20"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "circOut" }}
            />
            
            {/* Edge Glow */}
            <motion.div
              className={`absolute top-0 bottom-0 left-0 ${step === "error" ? "bg-destructive" : "bg-primary"} shadow-[0_0_15px_rgba(var(--primary),0.4)]`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "circOut" }}
            />

            <div className="relative z-10 flex items-center justify-center w-full">
              {isGenerating ? (
                <div className="h-6 relative overflow-hidden flex flex-col items-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={DISPLAY_STEPS[displayTextIndex]}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className="flex items-center gap-2 text-white uppercase tracking-widest text-xs font-bold"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      {step === "rendering" && progressLabel ? progressLabel : DISPLAY_STEPS[displayTextIndex]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : step === "complete" ? (
                <div className="flex items-center gap-2 text-primary uppercase tracking-widest text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Briefing Ready
                </div>
              ) : step === "error" ? (
                <div className="flex items-center gap-2 text-destructive uppercase tracking-widest text-xs font-bold">
                  <XCircle className="w-4 h-4" />
                  Generation Failed - Retry?
                </div>
              ) : (
                <div className="flex items-center gap-2 text-foreground font-bold uppercase tracking-wider">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate Video Briefing
                </div>
              )}
            </div>
          </Button>

          {/* Inline Error Message if exists */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-destructive bg-destructive/5 p-2 rounded border border-destructive/20 text-center font-medium"
            >
              {error}
            </motion.div>
          )}
        </div>

        {!isGenerating && step !== "complete" && (
          <div className="pt-2 text-center">
            <button
              onClick={onTestGenerate}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer"
            >
              test video generation
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
