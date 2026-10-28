// src/modules/ProjectHub/components/OpenProjectConfigModal.tsx
// Modal for configuring OpenProject integration per project

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, ExternalLink, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabase'
import type { Project } from '../types'
import {
  testOpenProjectConnection,
  fetchOpenProjectProjects,
  type OpenProjectConfig,
  type OpenProjectProject,
} from '@/services/openproject'

interface OpenProjectConfigModalProps {
  project: Project
  onClose: () => void
  onSuccess: () => void
}

export function OpenProjectConfigModal({ project, onClose, onSuccess }: OpenProjectConfigModalProps) {
  useBodyScrollLock(true)
  const { toast } = useToast()
  const { isDark } = useTheme()

  const existingConfig = (project.metadata?.openproject || {}) as OpenProjectConfig

  const [formData, setFormData] = useState<OpenProjectConfig>({
    openproject_url: existingConfig.openproject_url || '',
    openproject_api_key: existingConfig.openproject_api_key || '',
    openproject_project_id: existingConfig.openproject_project_id || '',
  })

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [opProjects, setOpProjects] = useState<OpenProjectProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionStatus('idle')
    const result = await testOpenProjectConnection(formData)
    setConnectionStatus(result.success ? 'success' : 'error')
    setConnectionMessage(result.message)
    setTesting(false)

    if (result.success) {
      loadOpenProjectProjects()
    }
  }

  const loadOpenProjectProjects = async () => {
    setLoadingProjects(true)
    try {
      const projects = await fetchOpenProjectProjects(formData)
      setOpProjects(projects)
    } catch {
      setOpProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    if (existingConfig.openproject_url && existingConfig.openproject_api_key) {
      handleTestConnection()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.openproject_url?.trim() || !formData.openproject_api_key?.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'URL and API Key are required' })
      return
    }

    try {
      setLoading(true)
      
      // Update metadata directly via Supabase
      const { error } = await supabase
        .from('projects')
        .update({
          metadata: {
            ...project.metadata,
            openproject: {
              openproject_url: formData.openproject_url.trim().replace(/\/$/, ''),
              openproject_api_key: formData.openproject_api_key.trim(),
              openproject_project_id: formData.openproject_project_id || undefined,
            },
          },
        })
        .eq('id', project.id)

      if (error) throw error

      toast({ title: 'Success', description: 'OpenProject integration configured' })
      onSuccess()
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveConfig = async () => {
    try {
      setLoading(true)
      const newMetadata = { ...project.metadata }
      delete newMetadata.openproject

      const { error } = await supabase
        .from('projects')
        .update({ metadata: newMetadata })
        .eq('id', project.id)

      if (error) throw error

      toast({ title: 'Success', description: 'OpenProject integration removed' })
      onSuccess()
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove configuration',
      })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: 'var(--text-primary)',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: isDark ? '#1c2538' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-center justify-between border-b"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.15)' }}
              >
                <ExternalLink className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  OpenProject Integration
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Connect to fetch live work packages
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: 'var(--text-primary)',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* OpenProject URL */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                OpenProject URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.openproject_url}
                onChange={(e) => {
                  setFormData({ ...formData, openproject_url: e.target.value })
                  setConnectionStatus('idle')
                }}
                placeholder="https://your-openproject.com"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all placeholder:opacity-50"
                style={inputStyle}
                required
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.openproject_api_key}
                onChange={(e) => {
                  setFormData({ ...formData, openproject_api_key: e.target.value })
                  setConnectionStatus('idle')
                }}
                placeholder="Your OpenProject API key"
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all placeholder:opacity-50"
                style={inputStyle}
                required
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Generate from OpenProject → My Account → Access Tokens
              </p>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !formData.openproject_url || !formData.openproject_api_key}
                variant="outline"
                className="flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Test Connection
              </Button>
              {connectionStatus !== 'idle' && (
                <div className="flex items-center gap-2 text-sm">
                  {connectionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span style={{ color: connectionStatus === 'success' ? '#22c55e' : '#ef4444' }}>
                    {connectionMessage}
                  </span>
                </div>
              )}
            </div>

            {/* Project Selection */}
            {connectionStatus === 'success' && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  OpenProject Project (Optional)
                </label>
                {loadingProjects ? (
                  <div className="flex items-center gap-2 py-3" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading projects...
                  </div>
                ) : (
                  <select
                    value={formData.openproject_project_id}
                    onChange={(e) => setFormData({ ...formData, openproject_project_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                    style={inputStyle}
                  >
                    <option value="" style={{ background: isDark ? '#1c2538' : '#fff' }}>
                      All Projects
                    </option>
                    {opProjects.map((p) => (
                      <option key={p.id} value={p.id} style={{ background: isDark ? '#1c2538' : '#fff' }}>
                        {p.name} ({p.identifier})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Select a specific project or leave empty to fetch from all
                </p>
              </div>
            )}

            {/* Actions */}
            <div
              className="flex justify-between gap-3 pt-6 border-t"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              <div>
                {existingConfig.openproject_url && (
                  <Button type="button" onClick={handleRemoveConfig} variant="outline" disabled={loading} className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                    Remove Integration
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || connectionStatus !== 'success'}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
