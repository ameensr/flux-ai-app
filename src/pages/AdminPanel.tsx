import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { useToast } from '@/hooks/use-toast'
import type { Role } from '@/lib/rbac'
import { Shield, Users, Crown, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
}

const ROLE_STYLES: Record<Role, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  pro: 'bg-accent-gold/10 text-accent-gold border-accent-gold/20',
  free: 'bg-white/5 text-text-muted border-white/10',
}

const ROLE_ICONS: Record<Role, React.ElementType> = {
  admin: Shield,
  pro: Crown,
  free: User,
}

export const AdminPanel = () => {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } else {
      setUsers(data as UserRow[])
    }
    setLoading(false)
  }

  const updateRole = async (userId: string, newRole: Role) => {
    setUpdating(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message })
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}.` })
    }
    setUpdating(null)
  }

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    pro: users.filter((u) => u.role === 'pro').length,
    free: users.filter((u) => u.role === 'free').length,
  }

  return (
    <RoleGuard permission="access:admin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="py-12"
      >
        <CinematicHeading
          title="Admin Panel"
          subtitle="Manage users, assign roles, and control access across the platform."
          align="left"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Users', value: stats.total, icon: Users, color: 'text-white' },
            { label: 'Admins', value: stats.admin, icon: Shield, color: 'text-red-400' },
            { label: 'Pro Users', value: stats.pro, icon: Crown, color: 'text-accent-gold' },
            { label: 'Free Users', value: stats.free, icon: User, color: 'text-text-muted' },
          ].map((stat) => (
            <GlassCard key={stat.label} hoverEffect={false} className="py-6 flex flex-col items-center gap-2">
              <stat.icon className={cn('w-5 h-5', stat.color)} />
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-widest text-text-muted">{stat.label}</span>
            </GlassCard>
          ))}
        </div>

        {/* Users Table */}
        <GlassCard hoverEffect={false}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-gold" />
              User Management
            </h2>
            <button
              onClick={fetchUsers}
              className="text-xs text-text-muted hover:text-accent-gold transition-colors font-bold uppercase tracking-widest"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const RoleIcon = ROLE_ICONS[user.role]
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <RoleIcon className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{user.full_name || 'No name'}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={cn('px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest', ROLE_STYLES[user.role])}>
                        {user.role}
                      </span>

                      <select
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={(e) => updateRole(user.id, e.target.value as Role)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-gold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </RoleGuard>
  )
}
