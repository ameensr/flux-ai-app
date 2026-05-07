import React, { useState } from 'react'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { AIService } from "@/services/ai/ai-service"
import { 
  PenTool, 
  Sparkles, 
  Copy, 
  RefreshCw, 
  CheckCircle2,
  Zap,
  AlignLeft,
  Smile,
  ShieldCheck,
  Type
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

const tones = [
  { id: 'professional', label: 'Professional', icon: ShieldCheck },
  { id: 'casual', label: 'Casual', icon: Smile },
  { id: 'concise', label: 'Concise', icon: Type },
]

export const WritingAssistant = () => {
  const [input, setInput] = useState('')
  const [activeTone, setActiveTone] = useState('professional')
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleRewrite = async () => {
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to rewrite.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await AIService.callAI({
        prompt: `Rewrite this text in ${activeTone} tone: ${input}`,
        options: { module: 'writingAssistant' }
      })
      
      setResult(response)
      
      toast({
        title: "Text Refined!",
        description: "Your content has been optimized by Flux AI."
      })
    } catch (error: any) {
      toast({
        title: "Rewrite Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-12"
    >
      <CinematicHeading 
        title="Writing Assistant" 
        subtitle="Elevate your QA communication. Perfect your bug descriptions, emails, and documentation with AI-driven clarity."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <GlassCard hoverEffect={false}>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Editor</span>
              <div className="flex gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setActiveTone(tone.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      activeTone === tone.id 
                        ? "bg-accent-gold text-background" 
                        : "bg-white/5 text-text-muted hover:text-white"
                    )}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste your text here..."
              className="w-full h-80 bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed text-xl"
            />
            <div className="mt-8 flex justify-end">
              <FloatingButton 
                onClick={handleRewrite}
                disabled={isGenerating}
              >
                {isGenerating ? "Refining..." : "Rewrite with AI"}
              </FloatingButton>
            </div>
          </GlassCard>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-accent-gold mb-1">84</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Readability</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">Low</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Complexity</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">Pos</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Sentiment</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <GlassCard hoverEffect={false} className="min-h-[460px] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-gold" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">Refined Version</span>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(result)
                        toast({ title: "Copied!" })
                      }}
                      className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 font-montreal text-xl leading-relaxed text-white">
                    {result}
                  </div>
                  
                  <div className="mt-12 flex gap-4">
                    <button className="flex-1 px-4 py-3 rounded-xl bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 text-xs font-bold uppercase tracking-widest transition-all">
                      Apply Changes
                    </button>
                    <button className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="h-[460px] flex flex-col items-center justify-center text-center p-12 glass-panel border-dashed border-white/10 opacity-50">
                <AlignLeft className="w-12 h-12 text-text-muted mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Awaiting Content</h3>
                <p className="text-text-muted text-sm">
                  Your professionally rewritten text will appear here. Choose a tone and click refine.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

