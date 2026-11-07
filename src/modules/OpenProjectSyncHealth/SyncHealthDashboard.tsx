// src/modules/OpenProjectSyncHealth/SyncHealthDashboard.tsx
// Main dashboard with KPI cards and overall health status

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database,
  Activity,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { reconcileProjectData, type ReconciliationResult } from '@/services/openproject-reconciliation'
import { getActivitySyncStats } from '@/services/openproject-incremental-sync'
import { fetchTicketBowlSyncStatus } from '@/services/ticketbowl-service'

interface SyncHealthDashboardProps {
  projectId: string
  opConfig: any
}

export function SyncHealthDashboard({ projectId, opConfig }: SyncHealthDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null)
  const [activityStats, setActivityStats] = useState<any>(null)
  const [syncStatus, setSyncStatus] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [projectId])

  async function loadDashboardData() {
    setLoading(true)
    try {
      // Load reconciliation data
      const reconResult = await reconcileProjectData(projectId, opConfig, null, null)
      setReconciliation(reconResult)

      // Load activity sync stats
      const actStats = await getActivitySyncStats(projectId)
      setActivityStats(actStats)

      // Load latest sync status
      const syncStat = await fetchTicketBowlSyncStatus(projectId, null)
      setSyncStatus(syncStat)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const statusVariant = {
    healthy: 'success',
    minor_issues: 'warning',
    data_mismatch: 'warning',
    critical_mismatch: 'destructive',
  }[reconciliation?.status || 'healthy']

  const statusIcon = {
    healthy: CheckCircle2,
    minor_issues: AlertTriangle,
    data_mismatch: AlertCircle,
    critical_mismatch: XCircle,
  }[reconciliation?.status || 'healthy']

  const StatusIcon = statusIcon

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall Sync Health</CardTitle>
              <CardDescription>
                {reconciliation?.reconciledAt && 
                  `Last reconciled: ${format(new Date(reconciliation.reconciledAt), 'PPpp')}`
                }
              </CardDescription>
            </div>
            <Badge variant={statusVariant as any} className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {reconciliation?.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {reconciliation?.issues && reconciliation.issues.length > 0 && (
            <Alert variant={statusVariant === 'destructive' ? 'destructive' : 'default'}>
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {reconciliation.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Tickets in OpenProject */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets (OpenProject)</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.openProjectTotal?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Reported by OpenProject API</p>
          </CardContent>
        </Card>

        {/* Tickets Successfully Synced */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Synced</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.supabaseTotal?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {reconciliation && reconciliation.openProjectTotal > 0
                ? `${((reconciliation.supabaseTotal / reconciliation.openProjectTotal) * 100).toFixed(1)}% of total`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Missing Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.missingCount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {reconciliation && reconciliation.openProjectTotal > 0
                ? `${((reconciliation.missingCount / reconciliation.openProjectTotal) * 100).toFixed(1)}% of total`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Duplicate Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Tickets</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.duplicateCount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Multiple rows for same ticket ID</p>
          </CardContent>
        </Card>
      </div>

      {/* History Verification Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tickets with Verified History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified History</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.verifiedCount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Complete forwarding history</p>
          </CardContent>
        </Card>

        {/* Tickets with Incomplete History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete History</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.unavailableCount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Activity fetch failed or unavailable</p>
          </CardContent>
        </Card>

        {/* Total Historical Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities Synced</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats?.totalActivitiesFetched?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across {activityStats?.totalCursors?.toLocaleString() || 0} tickets
            </p>
          </CardContent>
        </Card>

        {/* Forwarding Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forwarding Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliation?.forwardingEventsInDb?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {reconciliation?.ticketsWithForwardingEvents?.toLocaleString() || 0} tickets affected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Last Synchronization</CardTitle>
            <CardDescription>
              {syncStatus.started_at && format(new Date(syncStatus.started_at), 'PPpp')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={
                  syncStatus.sync_status === 'completed' ? 'default' :
                  syncStatus.sync_status === 'completed_with_errors' ? 'warning' :
                  syncStatus.sync_status === 'failed' ? 'destructive' :
                  'secondary'
                }>
                  {syncStatus.sync_status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Tickets Fetched</p>
                <p className="font-semibold">{syncStatus.total_fetched?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Events Found</p>
                <p className="font-semibold">{syncStatus.forwarding_events_found?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">
                  {syncStatus.started_at && syncStatus.completed_at
                    ? `${Math.round((new Date(syncStatus.completed_at).getTime() - new Date(syncStatus.started_at).getTime()) / 1000)}s`
                    : 'N/A'}
                </p>
              </div>
            </div>
            {syncStatus.error_details && (
              <Alert variant="destructive">
                <AlertDescription>{syncStatus.error_details}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
