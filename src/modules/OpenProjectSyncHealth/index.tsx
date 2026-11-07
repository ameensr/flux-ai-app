// src/modules/OpenProjectSyncHealth/index.tsx
// OpenProject Sync Health Monitor - Main Page Component
// Integrated into Project Hub for monitoring synchronization health and data completeness

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'

import { SyncHealthDashboard } from './SyncHealthDashboard'
import { TicketReconciliation } from './TicketReconciliation'
import { ActivityMonitoring } from './ActivityMonitoring'
import { SyncHistory } from './SyncHistory'
import { SyncControls } from './SyncControls'
import { MissingTicketsInvestigation } from './MissingTicketsInvestigation'

export default function OpenProjectSyncHealth() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { hasPermission, loading: permissionsLoading } = usePermissions('ticket-bowl')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [opConfig, setOpConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Load projects with OpenProject configuration
  useEffect(() => {
    async function loadProjects() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, metadata')
          .order('name')

        if (error) throw error

        // Filter to only projects with OpenProject configured
        const projectsWithOP = (data || []).filter(
          p => p.metadata?.openproject?.openproject_url && p.metadata?.openproject?.openproject_api_key
        )

        setProjects(projectsWithOP)

        // Auto-select from query param or first project
        const projectIdParam = searchParams.get('project')
        if (projectIdParam && projectsWithOP.find(p => p.id === projectIdParam)) {
          setSelectedProjectId(projectIdParam)
        } else if (projectsWithOP.length > 0) {
          setSelectedProjectId(projectsWithOP[0].id)
        }
      } catch (err) {
        console.error('Failed to load projects:', err)
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [searchParams, toast])

  // Load OpenProject config for selected project
  useEffect(() => {
    if (!selectedProjectId) return

    const project = projects.find(p => p.id === selectedProjectId)
    if (project?.metadata?.openproject) {
      setOpConfig({
        openproject_url: project.metadata.openproject.openproject_url,
        openproject_api_key: project.metadata.openproject.openproject_api_key,
        openproject_project_id: project.metadata.openproject.openproject_project_id,
      })
    }
  }, [selectedProjectId, projects])

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasPermission('can_view')) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to view the OpenProject Sync Health Monitor.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No projects with OpenProject configuration found. Configure OpenProject in Project Hub first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OpenProject Sync Health Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Monitor synchronization accuracy, missing tickets, and data completeness
          </p>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Project Selection</CardTitle>
          <CardDescription>Select a project to monitor OpenProject synchronization health</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border rounded-md"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProject && opConfig && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>OpenProject URL: {opConfig.openproject_url}</p>
              {opConfig.openproject_project_id && (
                <p>OpenProject Project ID: {opConfig.openproject_project_id}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      {selectedProjectId && opConfig && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="missing">Missing Data</TabsTrigger>
            <TabsTrigger value="history">Sync History</TabsTrigger>
            <TabsTrigger value="controls">Sync Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <SyncHealthDashboard projectId={selectedProjectId} opConfig={opConfig} />
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <TicketReconciliation projectId={selectedProjectId} opConfig={opConfig} />
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <ActivityMonitoring projectId={selectedProjectId} opConfig={opConfig} />
          </TabsContent>

          <TabsContent value="missing" className="space-y-4">
            <MissingTicketsInvestigation projectId={selectedProjectId} opConfig={opConfig} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <SyncHistory projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <SyncControls
              projectId={selectedProjectId}
              opConfig={opConfig}
              onSyncComplete={() => {
                // Refresh all tabs
                setActiveTab('overview')
                toast({ title: 'Sync complete', description: 'Data refreshed successfully' })
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
