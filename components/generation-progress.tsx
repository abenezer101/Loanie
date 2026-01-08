import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

type GenerationStep = "idle" | "analyzing" | "generating" | "rendering" | "complete" | "error"

interface GenerationProgressProps {
  step: GenerationStep
  error: string | null
  realtimeProgress?: number
  progressLabel?: string
}

const DISPLAY_STEPS = [
  "extracting data",
  "parsing data",
  "Ai processing the data ...",
  "transcribing the text...",
  "generating video"
]

export function GenerationProgress({ step, error, realtimeProgress, progressLabel }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0)
  const [displayTextIndex, setDisplayTextIndex] = useState(0)

  // Progress bar logic linked to high-level steps or real-time progress
  useEffect(() => {
    if (realtimeProgress !== undefined && step === "rendering") {
      setProgress(realtimeProgress)
      return
    }

    if (step === "analyzing") {
      setProgress(20)
      setDisplayTextIndex(0)
    } else if (step === "generating") {
      setProgress(50)
      setDisplayTextIndex(2)
    } else if (step === "rendering") {
      setProgress(80)
      setDisplayTextIndex(3)
    } else if (step === "complete") {
      setProgress(100)
      setDisplayTextIndex(4)
    } else if (step === "error") {
      setProgress(progress) // keep current progress
    } else {
      setProgress(0)
      setDisplayTextIndex(0)
    }
  }, [step])

  // Internal text cycle to make it feel dynamic
  useEffect(() => {
    if (step === "idle" || step === "complete" || step === "error") return

    const interval = setInterval(() => {
      setDisplayTextIndex((prev) => {
        // Move to next step if not already at the "limit" for the current phase
        if (step === "analyzing" && prev < 1) return prev + 1
        if (step === "rendering" && prev < 4) return prev + 1
        return prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [step])

  if (step === "idle" && !error) return null

  return (
    <div className="w-full space-y-4">
      <div className="relative h-10 w-full overflow-hidden rounded-full bg-secondary/30 border border-border/50 backdrop-blur-sm shadow-inner mt-2">
        {/* Fill Background */}
        <motion.div
          className="absolute inset-0 bg-primary/20"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "circOut" }}
        />
        
        {/* Animated Glow Border */}
        <motion.div
            className="absolute top-0 bottom-0 left-0 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "circOut" }}
        />

        {/* Scrolling Text Content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-6 relative overflow-hidden flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={DISPLAY_STEPS[displayTextIndex]}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"
              >
                {step !== "complete" && step !== "error" && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {step === "rendering" && progressLabel ? progressLabel : DISPLAY_STEPS[displayTextIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Completion/Error Message */}
      <AnimatePresence>
        {step === "complete" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-primary font-medium text-sm justify-center bg-primary/5 py-2 rounded-lg border border-primary/10"
          >
            <CheckCircle2 className="w-4 h-4" />
            Briefing generated successfully
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-destructive font-medium text-sm justify-center bg-destructive/5 py-2 rounded-lg border border-destructive/10"
          >
            <XCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
