// src/modules/TicketBowl/TicketForwardingHistoryModal.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  History,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  Flame,
  ListOrdered,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { TicketBowlWorkPackage, TicketBowlForwardingEvent, TicketBowlTestingStatusEvent } from './types'

interface TicketForwardingHistoryModalProps {
  ticket: TicketBowlWorkPackage | null
  events: TicketBowlForwardingEvent[]
  testingStatusHistory?: TicketBowlTestingStatusEvent[]
  loading: boolean
  onClose: () => void
}

type TabId = 'forwarding' | 'complete'

export function TicketForwardingHistoryModal({
  ticket,
  events,
  testingStatusHistory = [],
  loading,
  onClose,
}: TicketForwardingHistoryModalProps) {
  useBodyScrollLock(Boolean(ticket))
  const [activeTab, setActiveTab] = useState<TabId>('forwarding')

  if (!ticket) return null

  const isRepeat = events.length > 1
  // Use complete history if available, otherwise fall back to forwarding events only
  const hasCompleteHistory = testingStatusHistory.length > 0
  const displayHistory: TicketBowlTestingStatusEvent[] = hasCompleteHistory
    ? testingStatusHistory
    : events.map(e => ({
        id: e.id,
        activity_id: e.activity_id,
        previous_testing_status: e.previous_testing_status,
        new_testing_status: e.new_testing_status,
        changed_at: e.changed_at,
        changed_by_name: e.changed_by_name,
        is_forwarding_event: true,
      }))

  const formatDateTime = (ts: string) => {
    const d = new Date(ts)
    return {
      date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-surface border border-border/80 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-surface-elevated/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-text-primary">
                    Testing Status History — #{ticket.work_package_id}
                  </h2>
                  {isRepeat && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Flame className="w-3 h-3" /> Forwarded {events.length}×
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1 max-w-md">{ticket.subject}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/70 bg-surface-elevated/20 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('forwarding')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'forwarding'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified QA Handoffs ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('complete')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === 'complete'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Complete Testing Status History ({displayHistory.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Loading history...</span>
              </div>
            ) : activeTab === 'forwarding' ? (
              events.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs">
                  <p className="font-medium">No verified forwarding transitions found.</p>
                  <p className="text-[11px] text-text-muted/70 mt-1">
                    This work package has not been transitioned to &quot;Forwarded to the Testing Team&quot; in its activity history.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-accent/30">
                  {events.map((event, index) => {
                    const { date, time } = formatDateTime(event.changed_at)
                    return (
                      <div key={event.id || index} className="relative">
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-surface shadow-xs" />
                        <div className="p-4 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary">Handoff #{events.length - index}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" /> Verified QA Handoff
                              </span>
                            </div>
                            {event.activity_id && (
                              <span className="text-[10px] text-text-muted font-mono">Activity ID: {event.activity_id}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs p-2.5 rounded-lg bg-surface border border-border/60">
                            <span className="px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-medium border border-border/40">
                              {event.previous_testing_status || 'None / Not Set'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-accent" />
                            <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-bold border border-accent/30">
                              {event.new_testing_status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-text-muted border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{date}</span>
                              <Clock className="w-3 h-3 ml-1.5" />
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1 text-text-primary font-medium">
                              <User className="w-3 h-3 text-text-muted" />
                              <span>Forwarded by:</span>
                              <span className="text-accent font-semibold">{event.changed_by_name || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              // Complete Testing Status History tab
              displayHistory.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs">
                  <p className="font-medium">No Testing Status changes recorded.</p>
                  <p className="text-[11px] text-text-muted/70 mt-1">
                    No customField14 changes were found in the activity history for this ticket.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
                  {displayHistory.map((event, index) => {
                    const { date, time } = formatDateTime(event.changed_at)
                    return (
                      <div key={event.id || index} className="relative">
                        <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-surface shadow-xs ${
                          event.is_forwarding_event ? 'bg-accent' : 'bg-border'
                        }`} />
                        <div className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                          event.is_forwarding_event
                            ? 'border-accent/30 bg-accent/5 hover:bg-accent/10'
                            : 'border-border/70 bg-surface-elevated/30 hover:bg-surface-elevated/60'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              {event.is_forwarding_event ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <ShieldCheck className="w-3 h-3" /> QA Handoff
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-elevated text-text-muted border border-border/50">
                                  Status Change
                                </span>
                              )}
                            </div>
                            {event.activity_id && (
                              <span className="text-[10px] text-text-muted font-mono">Activity #{event.activity_id}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs p-2 rounded-lg bg-surface border border-border/50">
                            <span className="px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-medium border border-border/40 text-[11px]">
                              {event.previous_testing_status || 'None / Not Set'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-text-muted" />
                            <span className={`px-2 py-0.5 rounded font-semibold border text-[11px] ${
                              event.is_forwarding_event
                                ? 'bg-accent/15 text-accent border-accent/30'
                                : 'bg-surface-elevated text-text-primary border-border/50'
                            }`}>
                              {event.new_testing_status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted border-t border-border/40 pt-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{date}</span>
                              <Clock className="w-3 h-3 ml-1.5" />
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium text-text-primary">{event.changed_by_name || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/70 flex items-center justify-between bg-surface-elevated/30 text-xs text-text-muted">
            <div className="flex items-center gap-3">
              <span>
                Verified Handoffs: <strong className="text-text-primary">{events.length}</strong>
              </span>
              {hasCompleteHistory && (
                <span>
                  Total Status Changes: <strong className="text-text-primary">{displayHistory.length}</strong>
                </span>
              )}
              <span>
                Current Testing Status:{' '}
                <strong className="text-accent">{ticket.testing_status || '—'}</strong>
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
