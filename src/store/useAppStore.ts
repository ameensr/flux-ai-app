import { create } from 'zustand'
import type { Role, RolePermissionMap } from '@/lib/rbac'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: Role
  team_id: string | null
  created_at: string
}

interface AppState {
  isSidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
  showLanding: boolean
  setShowLanding: (show: boolean) => void
  isAuthenticated: boolean
  user: any | null
  setUser: (user: any | null) => void
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  role: Role
  teamId: string | null
  permissionMap: RolePermissionMap
  setPermissionMap: (map: RolePermissionMap) => void
  permissionsLoaded: boolean
  setPermissionsLoaded: (loaded: boolean) => void
  initSession: (user: any, map: RolePermissionMap) => void
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  showLanding: false,
  setShowLanding: (show) => set({ showLanding: show }),
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  profile: null,
  setProfile: (profile) => set({ profile, role: profile?.role ?? 'free', teamId: profile?.team_id ?? null }),
  role: 'free',
  teamId: null,
  permissionMap: {},
  setPermissionMap: (map) => set({ permissionMap: map }),
  permissionsLoaded: false,
  setPermissionsLoaded: (loaded) => set({ permissionsLoaded: loaded }),
  initSession: (user, map) => set({ user, isAuthenticated: !!user, permissionMap: map, permissionsLoaded: true }),
}))
