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

  const handleChangeRole = async (memberId: string, newRole: ProjectRole) => {
    try {
      setLoading(true)
      await updateMemberRole(memberId, newRole)
      toast({ title: 'Success', description: 'Member role updated' })
      onUpdate()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role'
      })
    } finally {
      setLoading(false)
      setActiveMenu(null)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return

    try {
      setLoading(true)
      await removeMember(memberId)
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
      setActiveMenu(null)
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No members assigned to this project yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {members.map(member => {
        const RoleIcon = getRoleIcon(member.project_role)
        const isCurrentUser = user?.id === member.user_id
        const canModify = (canManageRoles || canAssignMembers) && !isCurrentUser

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-gold to-accent-purple flex items-center justify-center text-white font-semibold">
                {member.profile.full_name?.[0]?.toUpperCase() || member.profile.email[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">
                    {member.profile.full_name || member.profile.email}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-accent-gold">(You)</span>
                    )}
                  </p>
                </div>
                <p className="text-sm text-white/50 truncate">
                  {member.profile.email}
                </p>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                <RoleIcon className={`w-4 h-4 ${getRoleColor(member.project_role)}`} />
                <span className="text-sm text-white/80">
                  {PROJECT_ROLE_LABELS[member.project_role]}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canModify && (
              <div className="relative ml-2">
                <button
                  onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <MoreVertical className="w-4 h-4 text-white/60" />
                </button>

                {activeMenu === member.id && (
                  <div className="absolute right-0 top-10 w-56 bg-[#0A0118] border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
                    {/* Change Role */}
                    {canManageRoles && (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-white/50 border-b border-white/10">
                          Change Role
                        </div>
                        {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[])
                          .filter(role => role !== member.project_role)
                          .map(role => {
                            const Icon = getRoleIcon(role)
                            return (
                              <button
                                key={role}
                                onClick={() => handleChangeRole(member.id, role)}
                                disabled={loading}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-white/80 disabled:opacity-50"
                              >
                                <Icon className={`w-4 h-4 ${getRoleColor(role)}`} />
                                <div>
                                  <div>{PROJECT_ROLE_LABELS[role]}</div>
                                  <div className="text-xs text-white/40">
                                    {PROJECT_ROLE_DESCRIPTIONS[role]}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                      </>
                    )}

                    {/* Remove */}
                    {canAssignMembers && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.profile.full_name || member.profile.email)}
                        disabled={loading}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/10 flex items-center gap-2 text-red-400 disabled:opacity-50 border-t border-white/10"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove from Project
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
