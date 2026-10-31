// src/modules/StoryPot/store.ts

import { create } from 'zustand'
import type { StoryPotWorkPackage, StoryPotFilters, StoryPotStats, FilterOption, CustomFieldConfig } from './types'

interface PaginationState {
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
}

interface StoryPotState {
  workPackages: StoryPotWorkPackage[]
  filteredWorkPackages: StoryPotWorkPackage[]
  stats: StoryPotStats | null
  filters: StoryPotFilters
  loading: boolean
  error: string | null
  selectedProjectId: string | null
  
  // Pagination state
  pagination: PaginationState
  
  // On-demand fetch state
  hasFetched: boolean
  lastFetchedAt: string | null
  lastFetchedFilters: StoryPotFilters | null
  filtersChanged: boolean
  
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
  setHasFetched: (hasFetched: boolean) => void
  setLastFetchedAt: (timestamp: string | null) => void
  markFiltersChanged: () => void
  clearFiltersChanged: () => void
  // Pagination actions
  setPagination: (pagination: Partial<PaginationState>) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  resetPagination: () => void
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

const defaultPagination: PaginationState = {
  currentPage: 1,
  pageSize: 25,
  totalRecords: 0,
  totalPages: 0,
}

export const useStoryPotStore = create<StoryPotState>((set, get) => ({
  workPackages: [],
  filteredWorkPackages: [],
  stats: null,
  filters: defaultFilters,
  loading: false,
  error: null,
  selectedProjectId: null,
  
  // Pagination state
  pagination: defaultPagination,
  
  // On-demand fetch state
  hasFetched: false,
  lastFetchedAt: null,
  lastFetchedFilters: null,
  filtersChanged: false,
  
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
  setFilters: (filters) => set((state) => {
    const newFilters = { ...state.filters, ...filters }
    const filtersChanged = state.hasFetched && JSON.stringify(newFilters) !== JSON.stringify(state.lastFetchedFilters)
    return { filters: newFilters, filtersChanged }
  }),
  resetFilters: () => set((state) => ({ 
    filters: defaultFilters,
    filtersChanged: state.hasFetched && JSON.stringify(defaultFilters) !== JSON.stringify(state.lastFetchedFilters)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedProjectId: (id) => set({ 
    selectedProjectId: id, 
    hasFetched: false, 
    workPackages: [], 
    filteredWorkPackages: [], 
    stats: null,
    lastFetchedAt: null,
    lastFetchedFilters: null,
    filtersChanged: false,
    pagination: defaultPagination,
  }),
  setFilterOptions: (options) => set((state) => ({
    authorOptions: options.authors ?? state.authorOptions,
    assigneeOptions: options.assignees ?? state.assigneeOptions,
    releaseTagOptions: options.releaseTags ?? state.releaseTagOptions,
    testingStatusOptions: options.testingStatuses ?? state.testingStatusOptions,
    isQAMissedOptions: options.isQAMissed ?? state.isQAMissedOptions,
    qaConfirmationOptions: options.qaConfirmations ?? state.qaConfirmationOptions,
  })),
  setCustomFieldConfigs: (configs) => set({ customFieldConfigs: configs }),
  setHasFetched: (hasFetched) => set({ hasFetched }),
  setLastFetchedAt: (timestamp) => set({ lastFetchedAt: timestamp }),
  markFiltersChanged: () => set({ filtersChanged: true }),
  clearFiltersChanged: () => set((state) => ({ 
    filtersChanged: false, 
    lastFetchedFilters: { ...state.filters } 
  })),
  // Pagination actions
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  setCurrentPage: (page) => set((state) => ({
    pagination: { ...state.pagination, currentPage: page }
  })),
  setPageSize: (size) => set((state) => ({
    pagination: { ...state.pagination, pageSize: size, currentPage: 1 }
  })),
  resetPagination: () => set({ pagination: defaultPagination }),
}))
