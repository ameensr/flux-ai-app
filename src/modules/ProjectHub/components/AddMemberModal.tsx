// src/modules/ProjectHub/components/AddMemberModal.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, UserPlus, Crown, Star, User as UserIcon, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTheme } from '@/context/ThemeContext'
import { searchUsers, assignMember } from '../projectService'
import type { ProjectRole } from '../types'
import { PROJECT_ROLE_LABELS, PROJECT_ROLE_DESCRIPTIONS } from '../types'

interface AddMemberModalProps {
  projectId: string
  existingMemberIds: string[]
  onClose: () => void
  onSuccess: () => void
}

interface UserSearchResult {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

export function AddMemberModal({ projectId, existingMemberIds, onClose, onSuccess }: AddMemberModalProps) {
  useBodyScrollLock(true)
  const { toast } = useToast()
  const { isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => { performSearch() }, [])

  const performSearch = async () => {
    try {
      setSearching(true)
      const results = await searchUsers(searchQuery, existingMemberIds)
      setUsers(results)
    } catch (error: unknown) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  const handleAddMember = async () => {
    if (!selectedUser) return
    try {
      setLoading(true)
      await assignMember({ project_id: projectId, user_id: selectedUser.id, project_role: selectedRole })
      onSuccess()
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : String(error) || 'Failed to add member'
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: ProjectRole) => {
    switch (role) {
      case 'owner': return Crown
      case 'lead': return Star
      case 'member': return UserIcon
      case 'viewer': return Eye
    }
  }

  const getRoleColor = (role: ProjectRole, active: boolean) => {
    if (!active) return {}
    switch (role) {
      case 'owner': return { borderColor: 'rgba(250,204,21,0.5)', background: 'rgba(250,204,21,0.1)', color: '#facc15' }
      case 'lead': return { borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }
      case 'member': return { borderColor: 'rgba(96,165,250,0.5)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }
      case 'viewer': return { borderColor: 'rgba(156,163,175,0.5)', background: 'rgba(156,163,175,0.1)', color: '#9ca3af' }
    }
  }

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    color: 'var(--text-primary)'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
          style={{
            background: isDark ? '#1c2538' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-center justify-between shrink-0"
            style={{
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Add Team Member
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Search and assign a role to a team member
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:rotate-90"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: 'var(--text-muted)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Search Users
              </label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:opacity-50"
                    style={inputStyle}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={searching}
                  className="shrink-0 px-5 font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </div>

            {/* User List */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Select User{selectedUser && ` — ${selectedUser.full_name || selectedUser.email}`}
              </label>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    <UserIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{searching ? 'Searching...' : 'No users found'}</p>
                  </div>
                ) : (
                  users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                      style={
                        selectedUser?.id === user.id
                          ? {
                              borderColor: 'rgba(99,102,241,0.5)',
                              background: 'rgba(99,102,241,0.08)'
                            }
                          : {
                              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'
                            }
                      }
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold shrink-0">
                        {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                      <span
                        className="text-xs font-medium capitalize px-2 py-1 rounded-lg shrink-0"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {user.role}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Role Selection */}
            {selectedUser && (
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Select Project Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]).map(role => {
                    const Icon = getRoleIcon(role)
                    const active = selectedRole === role
                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className="p-4 rounded-xl border-2 transition-all text-left"
                        style={
                          active
                            ? getRoleColor(role, true)
                            : {
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)'
                              }
                        }
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-4 h-4" />
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {PROJECT_ROLE_LABELS[role]}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {PROJECT_ROLE_DESCRIPTIONS[role]}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex justify-end gap-3 shrink-0"
            style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}
          >
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="px-6 font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={loading || !selectedUser}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 border-0 px-8 font-semibold"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
