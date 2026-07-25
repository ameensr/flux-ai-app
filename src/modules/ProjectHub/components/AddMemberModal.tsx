// src/modules/ProjectHub/components/AddMemberModal.tsx
// Modal for adding members to a project

import React, { useState, useEffect } from 'react'
import { X, Search, UserPlus, Crown, Star, User as UserIcon, Eye } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    performSearch()
  }, [])

  const performSearch = async () => {
    try {
      setSearching(true)
      const results = await searchUsers(searchQuery, existingMemberIds)
      setUsers(results)
    } catch (error: any) {
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
      await assignMember({
        project_id: projectId,
        user_id: selectedUser.id,
        project_role: selectedRole
      })
      onSuccess()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add member'
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

  const getRoleColor = (role: ProjectRole) => {
    switch (role) {
      case 'owner': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
      case 'lead': return 'text-accent-gold border-accent-gold/30 bg-accent-gold/10'
      case 'member': return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
      case 'viewer': return 'text-gray-400 border-gray-400/30 bg-gray-400/10'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Team Member
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Users */}
          <div>
            <label className="block text-sm font-medium mb-2">Search Users</label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-gold/50 text-white placeholder-white/40"
                />
              </div>
              <Button type="submit" variant="outline" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>

          {/* User List */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select User {selectedUser && `(${selectedUser.full_name || selectedUser.email})`}
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {searching ? 'Searching...' : 'No users found'}
                  </p>
                </div>
              ) : (
                users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-accent-gold/10 border-accent-gold/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-gold to-accent-purple flex items-center justify-center text-white font-semibold">
                      {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-white truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-sm text-white/50 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-white/50 capitalize">{user.role}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Role Selection */}
          {selectedUser && (
            <div>
              <label className="block text-sm font-medium mb-3">Select Project Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]).map(role => {
                  const Icon = getRoleIcon(role)
                  return (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRole === role
                          ? getRoleColor(role)
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${selectedRole === role ? '' : 'text-white/60'}`} />
                        <span className="font-semibold">{PROJECT_ROLE_LABELS[role]}</span>
                      </div>
                      <p className={`text-xs ${selectedRole === role ? 'opacity-80' : 'text-white/40'}`}>
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
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMember}
            disabled={loading || !selectedUser}
            className="bg-gradient-to-r from-accent-gold to-accent-purple hover:opacity-90"
          >
            {loading ? 'Adding...' : 'Add Member'}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
