// src/modules/OpenProjectSyncHealth/SyncControls.tsx
// Sync control panel with action buttons and progress tracking

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Activity,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { usePermissions } from '@/hooks/usePermissions'
import { syncTicketBowlData, type TicketBowlSyncProgress } from '@/services/ticketbowl-service'
import { reconcileProjectData } from '@/services/openproject-reconciliation'
import { resetAllActivitySyncCursors } from '@/services/openproject-incremental-sync'

interface SyncControlsProps {
  projectId: string
  opConfig: any
  onSyncComplete?: () => void
}

export function SyncControls({ projectId, opConfig, onSyncComplete }: SyncControlsProps) {
  const { toast } = useToast()
  const { hasPermission } = usePermissions('ticket-bowl')

  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<TicketBowlSyncProgress | null>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Sync options
  const [useIncremental, setUseIncremental] = useState(true)
  const [forceFullResync, setForceFullResync] = useState(false)

  const canSync = hasPermission('can_import')
  const canExport = hasPermission('can_export')

  const handleSyncAll = async () => {
    if (!canSync) {
      toast({ title: 'Permission denied', description: 'You do not have permission to sync data', variant: 'destructive' })
      return
    }

    setSyncing(true)
    setSyncProgress(null)
    setSyncResult(null)
    setShowProgressModal(true)

    try {
      const result = await syncTicketBowlData(
        opConfig,
        projectId,
        null, // All OpenProject projects
        null,
        (progress) => {
          setSyncProgress(progress)
        },
        {
          useIncrementalActivities: useIncremental,
          forceFullActivityResync: forceFullResync,
        }
      )

      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: 'Sync complete',
          description: result.message,
        })
        onSyncComplete?.()
      } else {
        toast({
          title: 'Sync failed',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Sync error:', err)
      toast({
        title: 'Sync error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleReconciliation = async () => {
    if (!canSync) {
      toast({ title: 'Permission denied', variant: 'destructive' })
      return
    }

    setSyncing(true)
    try {
      const result = await reconcileProjectData(projectId, opConfig, null, null)
      
      toast({
        title: 'Reconciliation complete',
        description: `Status: ${result.status}. Found ${result.missingCount} missing tickets.`,
      })
      
      onSyncComplete?.()
    } catch (err) {
      console.error('Reconciliation error:', err)
      toast({
        title: 'Reconciliation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleResetCursors = async () => {
    if (!canSync) {
      toast({ title: 'Permission denied', variant: 'destructive' })
      return
    }

    setShowConfirmDialog(false)
    setSyncing(true)

    try {
      const count = await resetAllActivitySyncCursors(projectId)
      toast({
        title: 'Cursors reset',
        description: `Reset ${count} activity sync cursors. Next sync will fetch full activity history.`,
      })
      onSyncComplete?.()
    } catch (err) {
      console.error('Reset error:', err)
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const confirmAction = (action: string) => {
    setPendingAction(action)
    setShowConfirmDialog(true)
  }

  const executeAction = () => {
    if (pendingAction === 'resetCursors') {
      handleResetCursors()
    }
    setPendingAction(null)
  }

  if (!hasPermission('can_view')) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to access sync controls.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sync Options */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Options</CardTitle>
          <CardDescription>Configure synchronization behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useIncremental"
              checked={useIncremental}
              onCheckedChange={(checked) => setUseIncremental(checked as boolean)}
              disabled={forceFullResync}
            />
            <Label htmlFor="useIncremental" className="cursor-pointer">
              Use incremental activity syncing (faster, recommended)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="forceFullResync"
              checked={forceFullResync}
              onCheckedChange={(checked) => {
                setForceFullResync(checked as boolean)
                if (checked) setUseIncremental(false)
              }}
            />
            <Label htmlFor="forceFullResync" className="cursor-pointer">
              Force full activity resync (slower, fetches all history again)
            </Label>
          </div>

          {forceFullResync && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Full resync will re-fetch and re-process all activity history. This may take significantly longer.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Primary Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Actions</CardTitle>
          <CardDescription>Trigger data synchronization between OpenProject and Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={handleSyncAll}
              disabled={!canSync || syncing}
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Sync All Tickets
                </>
              )}
            </Button>

            <Button
              onClick={handleReconciliation}
              disabled={!canSync || syncing}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              <Activity className="mr-2 h-4 w-4" />
              Run Reconciliation
            </Button>
          </div>

          {!canSync && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need the <code>can_import</code> permission to trigger synchronization.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Advanced Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Actions</CardTitle>
          <CardDescription>Use these actions carefully - they may trigger full re-sync</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => confirmAction('resetCursors')}
            disabled={!canSync || syncing}
            variant="destructive"
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset All Activity Cursors
          </Button>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Resetting activity cursors will force the next sync to re-fetch complete activity history for all tickets.
              Use this if you suspect activity data is incomplete or corrupted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Synchronization Progress</DialogTitle>
            <DialogDescription>
              {syncResult ? 'Synchronization complete' : 'Syncing data from OpenProject...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {syncProgress && !syncResult && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{syncProgress.phase.replace(/-/g, ' ')}</span>
                    <Badge variant="secondary">
                      {syncProgress.current.toLocaleString()} / {syncProgress.total.toLocaleString()}
                    </Badge>
                  </div>
                  <Progress 
                    value={syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0} 
                  />
                </div>

                <p className="text-sm text-muted-foreground">{syncProgress.message}</p>

                {syncProgress.ticketsSaved !== undefined && (
                  <div className="text-sm">
                    <p>Tickets saved: <span className="font-semibold">{syncProgress.ticketsSaved.toLocaleString()}</span></p>
                  </div>
                )}

                {syncProgress.eventsFound !== undefined && syncProgress.eventsFound > 0 && (
                  <div className="text-sm">
                    <p>Forwarding events found: <span className="font-semibold">{syncProgress.eventsFound.toLocaleString()}</span></p>
                  </div>
                )}
              </>
            )}

            {syncResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">{syncResult.message}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tickets Synced</p>
                    <p className="text-lg font-semibold">{syncResult.totalSynced.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Events Found</p>
                    <p className="text-lg font-semibold">{syncResult.eventsFound.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowProgressModal(false)
                setSyncResult(null)
                setSyncProgress(null)
              }}
              disabled={syncing && !syncResult}
            >
              {syncResult ? 'Close' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {pendingAction === 'resetCursors' &&
                'Are you sure you want to reset all activity sync cursors? This will cause the next sync to re-fetch complete activity history for all tickets, which may take significantly longer.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
