// src/pages/EnterpriseAdmin/TeamManagement.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { Users, Plus, Pencil, Trash2, X, Save, UserCog, Lock } from 'lucide-react'
import type { Team, EnterpriseUser } from './types'

// ── Team Form Modal ───────────────────────────────────────────────────────────
function TeamFormModal({
  team,
  onClose,
  onSaved,
}: {
  team: Team | null
  onClose: () => void
  onSaved: (team: Team) => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(team?.name ?? '')
  const [description, setDescription] = useState(team?.description ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (team) {
        const { data, error } = await supabase
          .from('teams')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', team.id)
          .select()
          .single()
        if (error) throw error
        onSaved(data as Team)
        toast({ title: 'Team updated' })
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
          .from('teams')
          .insert({ name: name.trim(), description: description.trim() || null, created_by: user?.id })
          .select()
          .single()
        if (error) throw error
        onSaved(data as Team)
        toast({ title: 'Team created' })
      }
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel p-6 w-full max-w-sm"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">{team ? 'Edit Team' : 'New Team'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Team Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. KTU Team"
              className="field-input w-full h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="field-input w-full text-sm resize-none py-2"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Assign Team Modal ─────────────────────────────────────────────────────────
function AssignTeamModal({
  user,
  teams,
  onClose,
  onSaved,
}: {
  user: EnterpriseUser
  teams: Team[]
  onClose: () => void
  onSaved: (userId: string, teamId: string | null) => void
}) {
  const { toast } = useToast()
  const [selectedTeam, setSelectedTeam] = useState<string | null>((user as any).team_id ?? null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: selectedTeam })
        .eq('id', user.id)
      if (error) throw error
      onSaved(user.id, selectedTeam)
      toast({ title: 'Team assigned', description: `${user.full_name || user.email} assigned to ${teams.find(t => t.id === selectedTeam)?.name ?? 'No Team'}` })
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel p-6 w-full max-w-sm"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Assign Team</h3>
            <p className="text-xs text-text-muted mt-0.5">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
          <button
            onClick={() => setSelectedTeam(null)}
            className={cn(
              'w-full flex items-center px-4 py-3 rounded-xl border text-left transition-all',
              selectedTeam === null
                ? 'border-accent-gold/40 bg-accent-gold/8 ring-1 ring-accent-gold/30'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10'
            )}
          >
            <span className={cn('text-sm font-semibold', selectedTeam === null ? 'text-accent-gold' : 'text-text-muted')}>
              No Team
            </span>
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all',
                selectedTeam === team.id
                  ? 'border-accent-gold/40 bg-accent-gold/8 ring-1 ring-accent-gold/30'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              )}
            >
              <div>
                <p className={cn('text-sm font-semibold', selectedTeam === team.id ? 'text-accent-gold' : 'text-white')}>
                  {team.name}
                </p>
                {team.description && <p className="text-[10px] text-text-muted mt-0.5">{team.description}</p>}
              </div>
              {team.member_count !== undefined && (
                <span className="text-[10px] text-text-muted">{team.member_count} members</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Assign
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TeamManagement() {
  const { toast } = useToast()
  const { can } = usePermissions()

  const canCreate = can('team-management', 'can_create')
  const canEdit = can('team-management', 'can_edit')
  const canDelete = can('team-management', 'can_delete')
  const canAssign = can('team-management', 'can_configure')

  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<(EnterpriseUser & { team_id: string | null; team_name: string | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [teamModal, setTeamModal] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null })
  const [assignModal, setAssignModal] = useState<EnterpriseUser | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: teamsData }, { data: usersData }] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('profiles').select('id, email, full_name, role, status, team_id, teams(name)').order('full_name'),
      ])

      const enrichedTeams = (teamsData ?? []).map((t: any) => ({
        ...t,
        member_count: (usersData ?? []).filter((u: any) => u.team_id === t.id).length,
      }))

      setTeams(enrichedTeams)
      setUsers((usersData ?? []).map((u: any) => ({
        ...u,
        team_name: u.teams?.name ?? null,
        // fill required EnterpriseUser fields with defaults
        employee_id: null, avatar_url: null, department_id: null,
        plan_id: null, last_login_at: null, created_at: '',
      })))
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? Members will be unassigned.`)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    setTeams(prev => prev.filter(t => t.id !== team.id))
    setUsers(prev => prev.map(u => u.team_id === team.id ? { ...u, team_id: null, team_name: null } : u))
    toast({ title: 'Team deleted' })
  }

  const handleTeamSaved = (saved: Team) => {
    setTeams(prev => {
      const exists = prev.find(t => t.id === saved.id)
      if (exists) return prev.map(t => t.id === saved.id ? { ...saved, member_count: t.member_count } : t)
      return [...prev, { ...saved, member_count: 0 }]
    })
  }

  const handleAssignSaved = (userId: string, teamId: string | null) => {
    const teamName = teams.find(t => t.id === teamId)?.name ?? null
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, team_id: teamId, team_name: teamName } : u))
    // update member counts
    setTeams(prev => prev.map(t => ({
      ...t,
      member_count: users.filter(u => (u.id === userId ? teamId : u.team_id) === t.id).length,
    })))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Teams list */}
      <GlassCard hoverEffect={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-gold" /> Teams
          </h3>
          {canCreate && (
            <button
              onClick={() => setTeamModal({ open: true, team: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-gold text-background text-xs font-bold hover:opacity-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Team
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-center text-text-muted py-12 text-sm">No teams yet. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <div key={team.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{team.name}</p>
                    {team.description && <p className="text-text-muted text-xs mt-0.5 truncate">{team.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => setTeamModal({ open: true, team })}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-text-muted">
                  {team.member_count ?? 0} member{team.member_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Users + team assignment */}
      <GlassCard hoverEffect={false}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <UserCog className="w-5 h-5 text-accent-gold" /> User Team Assignments
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">User</th>
                  <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Role</th>
                  <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Team</th>
                  <th className="text-right py-3 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-white font-medium">{user.full_name || '—'}</p>
                      <p className="text-text-muted text-xs">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-bold text-text-secondary capitalize">{user.role}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {user.team_name ? (
                        <span className="px-2.5 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold">
                          {user.team_name}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {canAssign ? (
                        <button
                          onClick={() => setAssignModal(user)}
                          className="px-3 py-1.5 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 text-xs font-bold transition-all"
                        >
                          Assign
                        </button>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-text-muted text-xs">
                          <Lock className="w-3 h-3" /> Restricted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {teamModal.open && (
          <TeamFormModal
            team={teamModal.team}
            onClose={() => setTeamModal({ open: false, team: null })}
            onSaved={handleTeamSaved}
          />
        )}
        {assignModal && (
          <AssignTeamModal
            user={assignModal}
            teams={teams}
            onClose={() => setAssignModal(null)}
            onSaved={handleAssignSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
