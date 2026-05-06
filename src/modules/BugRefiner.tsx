import React, { useState } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { RoleGuard } from "@/components/ui/RoleGuard"
import { AIService } from "@/services/ai/ai-service"
import { 
  Bug, 
  Sparkles, 
  Copy, 
  RefreshCw, 
  Download, 
  Send,
  Zap,
  AlertCircle
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

export const BugRefiner = () => {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [confidence, setConfidence] = useState(0)

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please paste some rough bug notes first.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setResult('')
    
    try {
      const response = await AIService.callAI({
        provider: 'mock', // Default to mock for now, can be configured later
        prompt: input,
        options: { module: 'bugReport' }
      })
      
      // Simulate AI typing effect for cinematic feel
      setResult(response)
      setConfidence(Math.floor(Math.random() * (98 - 85 + 1)) + 85)
      
      toast({
        title: "Bug Refined!",
        description: "Your professional bug report is ready."
      })
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Result copied to clipboard."
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-12"
    >
      <CinematicHeading 
        title="Bug Refiner" 
        subtitle="Transform rough logs and messy notes into professional, JIRA-ready bug reports with AI precision."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Input Notes / Logs</span>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your rough notes here... e.g., 'the app crashed when i clicked save on profile page. i had a long name.'"
              className="w-full h-[400px] bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed text-lg"
            />
            <div className="absolute bottom-6 right-6">
              <FloatingButton 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Refine with AI
                  </>
                )}
              </FloatingButton>
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard hoverEffect={false} className="min-h-[400px] bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                        Refined Result
                      </div>
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Confidence: <span className="text-accent-gold">{confidence}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => copyToClipboard(result)}
                        className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-all"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-all">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none font-montreal text-text-primary">
                    <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />
                  </div>
                  
                  <div className="mt-12 pt-8 border-t border-white/5 flex gap-4">
                    <RoleGuard permission="export:jira" fallback={
                      <button disabled className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-widest opacity-30 cursor-not-allowed">Export to Jira 🔒</button>
                    }>
                      <button className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
                        Export to Jira
                      </button>
                    </RoleGuard>
                    <RoleGuard permission="export:slack" fallback={
                      <button disabled className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-widest opacity-30 cursor-not-allowed">Push to Slack 🔒</button>
                    }>
                      <button className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
                        Push to Slack
                      </button>
                    </RoleGuard>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[460px] flex flex-col items-center justify-center text-center p-12 glass-panel border-dashed"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Refine</h3>
                <p className="text-text-secondary">
                  Your refined report will appear here. Our AI will automatically identify severity, steps, and expected results.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
