import { create } from 'zustand'
import type { Role } from '@/lib/rbac'

type ModuleId = 'dashboard' | 'bug-refiner' | 'test-generator' | 'writing-assistant' | 'settings' | 'history' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

interface AppState {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  showLanding: boolean;
  setShowLanding: (show: boolean) => void;
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  user: any | null;
  setUser: (user: any | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  role: Role;
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  isSidebarOpen: true,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  showLanding: true,
  setShowLanding: (show) => set({ showLanding: show }),
  isAuthenticated: false,
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  profile: null,
  setProfile: (profile) => set({ profile, role: profile?.role ?? 'free' }),
  role: 'free',
}))
