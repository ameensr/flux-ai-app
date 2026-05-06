import React, { useState } from 'react'
import { motion } from "framer-motion"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { 
  Shield, 
  Key, 
  Database, 
  Cpu, 
  Globe, 
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const providers = [
  { id: 'openai', name: 'OpenAI (GPT-4o)', icon: Globe },
  { id: 'gemini', name: 'Google Gemini Pro', icon: Sparkles },
  { id: 'anthropic', name: 'Anthropic Claude 3.5', icon: Shield },
  { id: 'mock', name: 'Flux AI (Mock Mode)', icon: Cpu },
]

export const Settings = () => {
  const { toast } = useToast()
  const [activeProvider, setActiveProvider] = useState('mock')
  const [apiKey, setApiKey] = useState('')

  const handleSave = () => {
    localStorage.setItem('flux_ai_provider', activeProvider)
    if (apiKey) localStorage.setItem(`flux_api_key_${activeProvider}`, apiKey)
    
    toast({
      title: "Settings Saved",
      description: "Your AI configuration has been updated successfully."
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-12"
    >
      <CinematicHeading 
        title="Settings" 
        subtitle="Configure your AI models, API keys, and workspace preferences."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-accent-gold" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Configuration</h3>
                <p className="text-sm text-text-muted">Choose your preferred intelligence provider.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                    activeProvider === provider.id 
                      ? "bg-accent-gold/5 border-accent-gold" 
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <provider.icon className={cn(
                      "w-5 h-5",
                      activeProvider === provider.id ? "text-accent-gold" : "text-text-muted"
                    )} />
                    <span className={cn(
                      "text-sm font-bold",
                      activeProvider === provider.id ? "text-white" : "text-text-secondary"
                    )}>{provider.name}</span>
                  </div>
                  {activeProvider === provider.id && (
                    <CheckCircle2 className="w-4 h-4 text-accent-gold" />
                  )}
                </button>
              ))}
            </div>

            {activeProvider !== 'mock' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">API Key for {activeProvider}</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-accent-gold transition-all font-mono"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Shield className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p className="text-[11px] text-amber-500/80 leading-relaxed">
                    API keys are stored locally in your browser and never sent to our servers. Usage costs are billed directly by the provider.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="mt-12 pt-8 border-t border-white/5 flex justify-end">
              <FloatingButton onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </FloatingButton>
            </div>
          </GlassCard>

          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Workspace Storage</h3>
                <p className="text-sm text-text-muted">Manage your local and cloud data.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">Cloud Sync</h4>
                  <p className="text-xs text-text-muted">Automatically save history to cloud</p>
                </div>
                <div className="w-12 h-6 rounded-full bg-accent-gold/20 relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-accent-gold" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">History Retention</h4>
                  <p className="text-xs text-text-muted">Store reports for 30 days</p>
                </div>
                <span className="text-xs font-bold text-text-muted">30 DAYS</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="bg-accent-gold text-background">
            <h3 className="text-lg font-black uppercase tracking-widest mb-4">Flux Pro</h3>
            <p className="text-sm font-medium mb-8 leading-relaxed opacity-80">
              Upgrade to Pro for unlimited cloud history, collaborative workspaces, and priority AI access.
            </p>
            <button className="w-full py-4 rounded-xl bg-background text-white font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
              Upgrade Now
            </button>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}
