import React, { useState } from 'react'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { AIService } from "@/services/ai/ai-service"
import { 
  FileText, 
  Sparkles, 
  Download, 
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Code
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface TestCase {
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Ready' | 'Automated';
}

export const TestCaseGenerator = () => {
  const [input, setInput] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let text = ''

      if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const pages = await Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1).then(p => p.getTextContent()).then(tc => tc.items.map((it: any) => it.str).join(' '))
          )
        )
        text = pages.join('\n')
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer })
        text = value
      } else {
        text = await file.text()
      }

      setInput(text)
      toast({ title: 'Document Imported', description: file.name })
    } catch {
      toast({ title: 'Import Failed', description: 'Could not read file.', variant: 'destructive' })
    }
  }

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a requirement or feature description.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await AIService.callAI({
        prompt: input,
        options: {
          module: 'testSuite',
          systemPrompt:
            'You are a QA engineer. Given a requirement, return ONLY a valid JSON array (no markdown, no explanation) of test case objects. Each object must have exactly these fields: "title" (string), "priority" ("High" | "Medium" | "Low"), "status" ("Draft" | "Ready" | "Automated"). Example: [{"title":"...","priority":"High","status":"Draft"}]'
        }
      })

      // Strip markdown code fences if the model wraps the JSON
      const jsonStr = response.replace(/^```[\w]*\n?|\n?```$/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      setTestCases(parsed)
      
      toast({
        title: "Test Cases Generated!",
        description: `Created ${parsed.length} professional test cases.`
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading 
        title="Test Architect" 
        subtitle="Generate comprehensive test suites with intelligent edge cases, risk analysis, and automation scripts."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="lg:sticky lg:top-28">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-gold" />
              Requirements
            </h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter feature description or requirement document..."
              className="w-full h-48 sm:h-64 bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed"
            />
            <div className="mt-6 flex flex-col gap-3">
              <FloatingButton 
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Analyzing..." : "Generate Test Suite"}
              </FloatingButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                className="hidden"
                onChange={handleImport}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Download className="w-4 h-4" /> Import Document
                </button>
                <p className="text-center text-[10px] text-text-muted tracking-wider">
                  PDF, DOCX, TXT, MD, CSV, JSON
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex gap-2 sm:gap-4">
              <div className="glass-panel px-3 sm:px-4 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <input type="text" placeholder="Search tests..." className="bg-transparent border-none focus:ring-0 text-xs w-20 sm:w-32 min-w-0" />
              </div>
              <div className="glass-panel px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4 text-text-muted" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Filter</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-white/5 border-white/10 text-text-muted">Total: {testCases.length}</Badge>
              <button className="p-2 glass-panel hover:bg-white/10 transition-all">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {testCases.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {testCases.map((tc, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard className="flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(212,175,55,0.4)] shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-accent-gold transition-colors truncate">{tc.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 sm:mt-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              tc.priority === 'High' ? "text-red-400" : tc.priority === 'Medium' ? "text-amber-400" : "text-blue-400"
                            )}>
                              {tc.priority} Priority
                            </span>
                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                              ID: TC-{1000 + idx}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-accent-gold transition-all">
                          <Code className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] sm:h-[500px] flex flex-col items-center justify-center text-center p-8 sm:p-12 glass-panel border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 relative">
                  <FileText className="w-10 h-10 text-text-muted" />
                  <div className="absolute inset-0 bg-accent-gold/5 blur-2xl rounded-full" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Architect Your Suite</h3>
                <p className="text-text-secondary max-w-md">
                  Enter your requirements on the left to generate a structured test suite with professional coverage.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
