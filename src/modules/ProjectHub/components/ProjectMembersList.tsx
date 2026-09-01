// src/modules/ProjectHub/components/ProjectMembersList.tsx
// List of project members with role management

import React, { useState } from 'react'
import { Crown, Star, User, Eye, MoreVertical, Trash2, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { removeMember, updateMemberRole } from '../projectService'
import type { ProjectMemberWithProfile, ProjectRole } from '../types'
import { PROJECT_ROLE_LABELS, PROJECT_ROLE_DESCRIPTIONS } from '../types'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface ProjectMembersListProps {
  members: ProjectMemberWithProfile[]
  projectId: string
  onUpdate: () => void
}

export function ProjectMembersList({ members, projectId, onUpdate }: ProjectMembersListProps) {
  const { toast } = useToast()
  const { user } = useAppStore()
  const { can } = usePermissions()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()

  const canManageRoles = can('project-hub', 'can_manage_roles')
  const canAssignMembers = can('project-hub', 'can_assign_members')

  const getRoleIcon = (role: ProjectRole) => {
    switch (role) {
      case 'owner': return Crown
      case 'lead': return Star
      case 'member': return User
      case 'viewer': return Eye
    }
  }

  const getRoleColor = (role: ProjectRole) => {
    switch (role) {
      case 'owner': return 'text-yellow-400'
      case 'lead': return 'text-accent-gold'
      case 'member': return 'text-blue-400'
      case 'viewer': return 'text-gray-400'
    }
  }

  const handleChangeRole = async (memberId: string, newRole: ProjectRole, currentRole: ProjectRole) => {
    setActiveMenu(null)

    // Get current user's role in this project
    const currentUserMember = members.find(m => m.user_id === user?.id)

    // Client-side validation (server will also validate)
    // Note: super_admins bypass these checks at the server level
    if (currentUserMember?.project_role === 'lead') {
      if (currentRole === 'owner') {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Project Leads cannot modify Project Owners'
        })
        return
      }
      if (newRole === 'owner') {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Project Leads cannot assign the Owner role'
        })
        return
      }
    }

    // Check if removing/demoting last owner
    if (currentRole === 'owner' && newRole !== 'owner') {
      const ownerCount = members.filter(m => m.project_role === 'owner').length
      if (ownerCount <= 1) {
        toast({
          variant: 'destructive',
          title: 'Cannot Demote Last Owner',
          description: 'Assign another owner before changing this role'
        })
        return
      }
    }

    try {
      setLoading(true)
      await updateMemberRole(memberId, newRole, projectId)
      toast({ title: 'Success', description: 'Member role updated successfully' })
      onUpdate()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string, memberRole: ProjectRole) => {
    setActiveMenu(null)

    // Get current user's role in this project
    const currentUserMember = members.find(m => m.user_id === user?.id)

    // Client-side validation (server will also validate)
    if (currentUserMember?.project_role === 'lead' && memberRole === 'owner') {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Project Leads cannot remove Project Owners'
      })
      return
    }

    // Check if removing last owner
    if (memberRole === 'owner') {
      const ownerCount = members.filter(m => m.project_role === 'owner').length
      if (ownerCount <= 1) {
        toast({
          variant: 'destructive',
          title: 'Cannot Remove Last Owner',
          description: 'Assign another owner before removing this member'
        })
        return
      }
    }

    if (!await confirm({
      title: `Remove ${memberName}?`,
      description: 'They will lose access to this project. This cannot be undone.',
      confirmLabel: 'Remove',
    })) {
      return
    }

    try {
      setLoading(true)
      await removeMember(memberId, projectId)
      toast({ title: 'Success', description: 'Member removed from project' })
      onUpdate()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove member'
      })
    } finally {
      setLoading(false)
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No members assigned to this project yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {members.map(member => {
          const RoleIcon = getRoleIcon(member.project_role)
          const isCurrentUser = user?.id === member.user_id
          const canModify = (canManageRoles || canAssignMembers) && !isCurrentUser
          const isMenuOpen = activeMenu === member.id

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-4 rounded-xl border transition-all"
              style={{
                background: 'var(--surface-secondary)',
                borderColor: 'var(--border)'
              }}
            >
              {/* Avatar */}
              <div
                className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-gold to-accent-purple flex items-center justify-center text-base font-bold shrink-0"
                style={{ color: 'var(--accent-fg)' }}
              >
                {member.profile.full_name?.[0]?.toUpperCase() || member.profile.email[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {member.profile.full_name || member.profile.email}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs font-bold text-accent-gold shrink-0">(You)</span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {member.profile.email}
                </p>
              </div>

              {/* Role Badge */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0"
                style={{
                  background: 'var(--hover)',
                  borderColor: 'var(--border)'
                }}
              >
                <RoleIcon className={`w-4 h-4 ${getRoleColor(member.project_role)}`} />
                <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  {PROJECT_ROLE_LABELS[member.project_role]}
                </span>
              </div>

              {/* Actions Menu */}
              {canModify && (
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(isMenuOpen ? null : member.id)
                    }}
                    className="p-2 rounded-lg transition-all"
                    style={{
                      background: isMenuOpen ? 'var(--hover)' : 'transparent',
                      color: 'var(--text-secondary)'
                    }}
                    disabled={loading}
                    title="Manage member"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dropdown menu rendered at root level to avoid overflow issues */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-64 rounded-xl shadow-2xl border overflow-hidden"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              position: 'absolute',
              right: '2rem',
              top: '50%',
              transform: 'translateY(-50%)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const member = members.find(m => m.id === activeMenu)
              if (!member) return null

              return (
                <>
                  {/* Change Role Section */}
                  {canManageRoles && (
                    <div>
                      <div
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b"
                        style={{
                          color: 'var(--text-muted)',
                          background: 'var(--hover)',
                          borderColor: 'var(--divider)'
                        }}
                      >
                        Change Role
                      </div>
                      <div className="py-1">
                        {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[])
                          .filter(role => role !== member.project_role)
                          .map(role => {
                            const Icon = getRoleIcon(role)
                            return (
                              <button
                                key={role}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleChangeRole(member.id, role, member.project_role)
                                }}
                                disabled={loading}
                                className="w-full px-4 py-3 text-left flex items-start gap-3 transition-all disabled:opacity-50 hover:bg-[var(--hover)]"
                                style={{
                                  color: 'var(--text-primary)'
                                }}
                              >
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${getRoleColor(role)}`} />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold mb-0.5">
                                    {PROJECT_ROLE_LABELS[role]}
                                  </div>
                                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    {PROJECT_ROLE_DESCRIPTIONS[role]}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Remove Section */}
                  {canAssignMembers && (
                    <div className="border-t" style={{ borderColor: 'var(--divider)' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMember(member.id, member.profile.full_name || member.profile.email, member.project_role)
                        }}
                        disabled={loading}
                        className="w-full px-4 py-3 text-left flex items-center gap-2.5 text-red-500 disabled:opacity-50 transition-all font-medium text-sm hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove from Project
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
