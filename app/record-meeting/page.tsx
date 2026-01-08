"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mic, Square, Save, ArrowLeft, FileVideo, Sparkles, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { saveRecording } from "@/lib/storage"

type RecordingState = "idle" | "recording" | "paused" | "stopped" | "transcribing"

export default function RecordMeetingPage() {
  const router = useRouter()
  const [state, setState] = useState<RecordingState>("idle")
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [title, setTitle] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000)
      setState("recording")

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please ensure microphone permissions are granted.")
    }
  }

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioBlob(blob)
        setState("stopped")
        resolve()
      }

      mediaRecorderRef.current!.stop()
    })
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return

    setState("transcribing")

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const { text } = await response.json()
        setTranscript(text)
      } else {
        setTranscript("Transcription failed. Please enter the transcript manually.")
      }
    } catch (error) {
      console.error("Transcription error:", error)
      setTranscript("Transcription failed. Please enter the transcript manually.")
    }

    setState("stopped")
  }

  const handleSave = async () => {
    if (!transcript.trim()) {
      alert("Please add a transcript before saving.")
      return
    }

    try {
      const response = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || `Recording ${new Date().toLocaleDateString()}`,
          transcript: transcript.trim(),
          duration,
        }),
      })

      if (response.ok) {
        setTimeout(() => {
          router.push("/generate-video")
        }, 500)
      } else {
        throw new Error("Failed to save recording")
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save recording to database.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setState("idle")
    setDuration(0)
    setTranscript("")
    setTitle("")
    setAudioUrl(null)
    setAudioBlob(null)
    audioChunksRef.current = []
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-[1600px] flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Record Meeting</h1>
          <p className="text-sm text-muted-foreground">Capture and transcribe loan discussions with high-accuracy AI.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Recording Card */}
          <Card className="lg:col-span-4 w-full bg-card border-border shadow-2xl overflow-hidden relative flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardHeader className="py-4">
              <CardTitle className="text-lg text-foreground text-center">Audio Recording</CardTitle>
              <CardDescription className="text-center text-xs">Manage your meeting recording</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-4 py-6">
              {/* Recording Display */}
              <div 
                className={`aspect-square max-h-64 mx-auto w-full max-w-[440px] bg-background/50 rounded-3xl border-4 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
                  state === "recording" ? "border-destructive animate-pulse shadow-lg shadow-destructive/20" : 
                  state === "stopped" ? "border-primary" :
                  "border-muted/10"
                }`}
              >

                {state === "recording" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-3xl bg-destructive/5 animate-ping absolute" />
                    <div className="w-4/5 h-4/5 rounded-2xl bg-destructive/10 animate-pulse absolute" />
                  </div>
                )}

                <button
                  onClick={() => {
                    if (state === "idle") startRecording()
                    else if (state === "recording") stopRecording()
                    else if (state === "stopped") handleReset()
                  }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center z-10 transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl ${
                    state === "recording" ? "bg-destructive shadow-destructive/40" : 
                    state === "stopped" ? "bg-primary shadow-primary/20" :
                    "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {state === "recording" ? (
                    <Square className="w-10 h-10 text-destructive-foreground" />
                  ) : state === "stopped" ? (
                    <RotateCcw className="w-10 h-10 text-primary-foreground" />
                  ) : (
                    <Mic className="w-10 h-10 text-primary-foreground" />
                  )}
                </button>

                <div className="mt-2 text-center z-10">
                  <p className="text-3xl font-mono font-bold tracking-tighter text-foreground">{formatDuration(duration)}</p>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {state === "idle" && "Ready"}
                    {state === "recording" && "Live"}
                    {state === "transcribing" && "Wait"}
                    {state === "stopped" && "Done"}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {state === "idle" && (
                  <Button onClick={startRecording} size="lg" className="gap-2">
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </Button>
                )}

                {state === "recording" && (
                  <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </Button>
                )}

                {state === "transcribing" && (
                  <Button disabled size="lg" className="gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transcribing...
                  </Button>
                )}

                {state === "stopped" && audioUrl && (
                  <div className="flex flex-col gap-2 w-full">
                    {!transcript && (
                      <Button onClick={handleTranscribe} className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]">
                        <Sparkles className="w-4 h-4" />
                        Transcribe
                      </Button>
                    )}
                    <Button onClick={handleReset} variant="outline" className="w-full gap-2 bg-card hover:bg-accent border-border shadow-sm transition-all hover:scale-[1.01]">
                      <RotateCcw className="w-4 h-4" />
                      {transcript ? "New Recording" : "Record Again"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Audio Playback */}
              {audioUrl && state === "stopped" && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Playback</Label>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript Card */}
          <Card className="lg:col-span-8 w-full bg-card border-border shadow-xl flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Transcript</CardTitle>
              <CardDescription>Review and edit the transcribed text</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Recording Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Client Meeting - ABC Corp Loan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={state !== "stopped"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript</Label>
                <Textarea
                  id="transcript"
                  placeholder={
                    state === "idle"
                      ? "Start recording to generate transcript..."
                      : state === "transcribing"
                        ? "Transcribing audio..."
                        : "Edit the transcript here..."
                  }
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={state !== "stopped"}
                  className="h-[208px] overflow-y-auto resize-none font-mono text-sm bg-background/30 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-4 transition-all duration-300 rounded-xl"
                />
              </div>

              <Button onClick={handleSave} disabled={state !== "stopped" || isSaving || !transcript.trim()} className="w-full gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Recording
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
