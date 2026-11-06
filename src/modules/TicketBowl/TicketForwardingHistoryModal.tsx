// src/modules/TicketBowl/TicketForwardingHistoryModal.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  History,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { TicketBowlWorkPackage, TicketBowlForwardingEvent } from './types'

interface TicketForwardingHistoryModalProps {
  ticket: TicketBowlWorkPackage | null
  events: TicketBowlForwardingEvent[]
  loading: boolean
  onClose: () => void
}

export function TicketForwardingHistoryModal({
  ticket,
  events,
  loading,
  onClose,
}: TicketForwardingHistoryModalProps) {
  useBodyScrollLock(Boolean(ticket))

  if (!ticket) return null

  const isRepeat = events.length > 1

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
                    Forwarding History — #{ticket.work_package_id}
                  </h2>
                  {isRepeat && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Flame className="w-3 h-3" /> Forwarded {events.length} times
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1 max-w-md">
                  {ticket.subject}
                </p>
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

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Loading transition history...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs">
                <p className="font-medium">No verified forwarding transitions found.</p>
                <p className="text-[11px] text-text-muted/70 mt-1">
                  This work package has not been transitioned to &quot;Forwarded to the Testing Team&quot; in its activity history.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-accent/30">
                {events.map((event, index) => {
                  const date = new Date(event.changed_at)
                  const formattedDate = date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  const formattedTime = date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <div key={event.id || index} className="relative group">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-surface shadow-xs" />

                      <div className="p-4 rounded-xl border border-border/80 bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors space-y-3">
                        {/* Top row: Event timestamp & actor */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">
                              Handoff #{events.length - index}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Verified QA Handoff
                            </span>
                          </div>

                          {event.activity_id && (
                            <span className="text-[10px] text-text-muted font-mono">
                              Activity ID: {event.activity_id}
                            </span>
                          )}
                        </div>

                        {/* Transition path */}
                        <div className="flex flex-wrap items-center gap-2 text-xs p-2.5 rounded-lg bg-surface border border-border/60">
                          <span className="px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-medium border border-border/40">
                            {event.previous_testing_status || 'None / Not Set'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-accent" />
                          <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-bold border border-accent/30">
                            {event.new_testing_status}
                          </span>
                        </div>

                        {/* Metadata row: Timestamp & Who changed it */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-text-muted border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formattedDate}</span>
                            <Clock className="w-3 h-3 ml-1.5" />
                            <span>{formattedTime}</span>
                          </div>

                          <div className="flex items-center gap-1 text-text-primary font-medium">
                            <User className="w-3 h-3 text-text-muted" />
                            <span>Forwarded by:</span>
                            <span className="text-accent font-semibold">
                              {event.changed_by_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/70 flex items-center justify-between bg-surface-elevated/30 text-xs text-text-muted">
            <span>
              Total Verified Handoffs: <strong className="text-text-primary">{events.length}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

