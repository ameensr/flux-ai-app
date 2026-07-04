import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit, Save, Trash2, Power, PowerOff, ShieldAlert,
  ArrowLeft, Search, Check, X, Clock, User
} from 'lucide-react'
import { useQAReportStore } from './store'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import type { ProjectConfig } from './types'
import { supabase } from '@/lib/supabase'

export const QAReportConfig: React.FC = () => {
  const navigate = useNavigate()
  const { role } = useAppStore()
  const { can } = usePermissions()
  const {
    projects,
    fetchProjects,
    saveProject,
    deleteProject
  } = useQAReportStore()

  // Authorization Check via RBAC
  const isAuthorized = can('qa-report', 'can_manage')

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active')

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (!isAuthorized) return
    
    setLoading(true)
    fetchProjects(false).then(() => setLoading(false)) // Fetch all (including inactive)

    // Fetch profiles for auditing created_by
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .then(({ data }) => {
        if (data) setProfiles(data)
      })
  }, [isAuthorized])

  if (!isAuthorized) {
    return <AccessDeniedView />
  }

  const getProfileName = (id?: string) => {
    if (!id) return 'System Seed'
    const found = profiles.find(p => p.id === id)
    return found ? (found.full_name || found.email) : 'User'
  }

  // Filter projects by search query
  const filteredProjects = projects.filter(p =>
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setCode('')
    setDescription('')
    setStatus('Active')
    setErrors([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    const errs: string[] = []

    const cleanName = name.trim()
    const cleanCode = code.trim().toUpperCase()

    if (!cleanName) errs.push('Project Name is required')
    if (!cleanCode) errs.push('Project Code is required')

    // Prevent duplicates client-side
    const duplicateName = projects.some(p => p.id !== editingId && p.projectName.toLowerCase() === cleanName.toLowerCase())
    const duplicateCode = projects.some(p => p.id !== editingId && p.projectCode.toUpperCase() === cleanCode)

    if (duplicateName) errs.push(`Project Name "${cleanName}" already exists.`)
    if (duplicateCode) errs.push(`Project Code "${cleanCode}" already exists.`)

    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    try {
      setLoading(true)
      const projectData: ProjectConfig = {
        id: editingId || undefined,
        projectName: cleanName,
        projectCode: cleanCode,
        description: description.trim(),
        status,
        isActive: status === 'Active'
      }

      await saveProject(projectData)
      resetForm()
    } catch (err: any) {
      setErrors([err.message || 'Error saving project. Please check if the name/code is unique.'])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (p: ProjectConfig) => {
    setEditingId(p.id || null)
    setName(p.projectName)
    setCode(p.projectCode)
    setDescription(p.description || '')
    setStatus(p.status)
    setErrors([])
  }

  const handleToggleActive = async (p: ProjectConfig) => {
    try {
      setLoading(true)
      const nextStatus = p.status === 'Active' ? 'Inactive' : 'Active'
      await saveProject({
        ...p,
        status: nextStatus,
        isActive: nextStatus === 'Active'
      })
    } catch (err) {
      alert('Error updating status')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? Existing reports will still reference it, but it will be removed from all configurations.')) return
    try {
      setLoading(true)
      await deleteProject(id)
    } catch (err) {
      alert('Error deleting project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6 sm:py-12 min-h-screen">
      {/* Back button */}
      <button
        onClick={() => navigate(ROUTES.qaReport)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to QA Weekly Report
      </button>

      <CinematicHeading
        title="Project Configurations"
        subtitle="Manage master project directories used dynamically across weekly reports and executive analytics."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 mt-10 items-start">
        {/* Project Form */}
        <GlassCard hoverEffect={false} className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-extrabold font-clash text-text-primary">
              {editingId ? 'Update Project' : 'Create Project'}
            </h2>
            <p className="text-[11px] text-text-muted mt-1">Configure project code guidelines and metadata values.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            <div>
              <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1.5">Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Phoenix Platform"
                value={name}
                onChange={e => setName(e.target.value)}
                className="field-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1.5">Project Code *</label>
              <input
                type="text"
                placeholder="e.g. PHX"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="field-input w-full text-xs uppercase"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1.5">Description (Optional)</label>
              <textarea
                placeholder="Project details, scope, or target objectives..."
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="field-input w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="field-input w-full text-xs"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Form Errors */}
            <AnimatePresence>
              {errors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex flex-col gap-1"
                >
                  {errors.map(err => (
                    <div key={err} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400" />
                      <span>{err}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 font-black uppercase tracking-wider text-xs"
              >
                <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl bg-hover border border-border text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassCard>

        {/* Project Table */}
        <div className="flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
              <h2 className="text-lg font-extrabold font-clash text-text-primary">Project List</h2>

              {/* Search config */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-hover rounded-xl border border-border text-xs w-56 focus-within:border-accent/40 transition-all">
                <Search className="w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="bg-transparent focus:outline-none w-full placeholder:text-text-muted text-text-primary text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading && projects.length === 0 ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-hover/30">
                <table className="w-full text-xs text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-hover/50 text-[10px] uppercase font-black tracking-widest text-text-muted">
                      <th className="px-4 py-3">Project Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map(p => (
                      <tr
                        key={p.id}
                        className={`hover:bg-hover border-b border-border transition-colors ${!p.isActive ? 'opacity-55' : ''}`}
                      >
                        <td className="px-4 py-3.5 font-bold text-text-primary">{p.projectName}</td>
                        <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded bg-hover border border-border text-[11px] font-mono font-bold text-accent-gold">{p.projectCode}</span></td>
                        <td className="px-4 py-3.5 text-text-secondary max-w-[200px] truncate" title={p.description}>{p.description || '—'}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${p.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-hover text-text-muted border border-border'}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-text-muted">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {getProfileName(p.createdBy)}</span>
                            {p.createdAt && <span className="text-[10px] block mt-0.5"><Clock className="w-2.5 h-2.5 inline-block mr-0.5" /> {new Date(p.createdAt).toLocaleDateString()}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {/* Toggle active status */}
                            <button
                              onClick={() => handleToggleActive(p)}
                              title={p.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded-lg border transition-all ${p.isActive ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-hover border border-border text-text-muted hover:text-text-primary'}`}
                            >
                              {p.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(p)}
                              title="Edit project details"
                              className="p-1.5 rounded-lg bg-hover border border-border text-text-secondary hover:text-text-primary transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(p.id!)}
                              title="Delete project"
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-text-muted italic">
                          No projects configured. Create one using the form.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

// Access Denied Template View
const AccessDeniedView: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-20 text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">🔒 Access Denied (403)</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          You don't have access to this configuration module. Only managers, QA leads, and administrators are authorized to manage master projects.
        </p>
        <button
          onClick={() => navigate(ROUTES.qaReport)}
          className="px-6 py-2.5 rounded-xl bg-hover border border-border text-xs font-extrabold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-all"
        >
          Return to QA Weekly Report
        </button>
      </GlassCard>
    </div>
  )
}
