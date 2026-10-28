// src/modules/StoryPot/store.ts

import { create } from 'zustand'
import type { StoryPotWorkPackage, StoryPotFilters, StoryPotStats, FilterOption, CustomFieldConfig } from './types'

interface StoryPotState {
  workPackages: StoryPotWorkPackage[]
  filteredWorkPackages: StoryPotWorkPackage[]
  stats: StoryPotStats | null
  filters: StoryPotFilters
  loading: boolean
  error: string | null
  selectedProjectId: string | null
  
  // Filter options
  authorOptions: FilterOption[]
  assigneeOptions: FilterOption[]
  releaseTagOptions: FilterOption[]
  testingStatusOptions: FilterOption[]
  isQAMissedOptions: FilterOption[]
  qaConfirmationOptions: FilterOption[]
  
  // Custom field mapping
  customFieldConfigs: CustomFieldConfig[]
  
  // Actions
  setWorkPackages: (items: StoryPotWorkPackage[]) => void
  setFilteredWorkPackages: (items: StoryPotWorkPackage[]) => void
  setStats: (stats: StoryPotStats | null) => void
  setFilters: (filters: Partial<StoryPotFilters>) => void
  resetFilters: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedProjectId: (id: string | null) => void
  setFilterOptions: (options: {
    authors?: FilterOption[]
    assignees?: FilterOption[]
    releaseTags?: FilterOption[]
    testingStatuses?: FilterOption[]
    isQAMissed?: FilterOption[]
    qaConfirmations?: FilterOption[]
  }) => void
  setCustomFieldConfigs: (configs: CustomFieldConfig[]) => void
}

const defaultFilters: StoryPotFilters = {
  search: '',
  status: '',
  type: '',
  priority: '',
  author: '',
  assignee: '',
  releaseTag: '',
  testingStatus: '',
  isQAMissed: '',
  qaConfirmation: '',
  receivedDateFrom: '',
  receivedDateTo: '',
  testingReceivedDateFrom: '',
  testingReceivedDateTo: '',
}

export const useStoryPotStore = create<StoryPotState>((set) => ({
  workPackages: [],
  filteredWorkPackages: [],
  stats: null,
  filters: defaultFilters,
  loading: false,
  error: null,
  selectedProjectId: null,
  
  // Filter options
  authorOptions: [],
  assigneeOptions: [],
  releaseTagOptions: [],
  testingStatusOptions: [],
  isQAMissedOptions: [
    { id: 'Yes', name: 'Yes' },
    { id: 'No', name: 'No' },
  ],
  qaConfirmationOptions: [],
  
  // Custom field configs
  customFieldConfigs: [],

  setWorkPackages: (items) => set({ workPackages: items }),
  setFilteredWorkPackages: (items) => set({ filteredWorkPackages: items }),
  setStats: (stats) => set({ stats }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setFilterOptions: (options) => set((state) => ({
    authorOptions: options.authors ?? state.authorOptions,
    assigneeOptions: options.assignees ?? state.assigneeOptions,
    releaseTagOptions: options.releaseTags ?? state.releaseTagOptions,
    testingStatusOptions: options.testingStatuses ?? state.testingStatusOptions,
    isQAMissedOptions: options.isQAMissed ?? state.isQAMissedOptions,
    qaConfirmationOptions: options.qaConfirmations ?? state.qaConfirmationOptions,
  })),
  setCustomFieldConfigs: (configs) => set({ customFieldConfigs: configs }),
}))
