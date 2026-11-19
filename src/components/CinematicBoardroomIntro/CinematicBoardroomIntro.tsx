import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Box, Eye, Maximize, Minimize, MonitorPlay } from 'lucide-react';
import { getTeamNames, parseMeetingWithNames } from './teamNamesHelper';
import { createRoom, type Seat } from './seatModel';
import type { ReportHeroScreenData } from './reportHeroScreen';
import styles from './CinematicBoardroomIntro.module.css';

const BoardroomScene = lazy(() => import('./BoardroomScene'));
const NO_RECOMMENDATIONS: string[] = [];
const sameNames = (a: string[], b: string[]) => a.length === b.length && a.every((name, index) => name === b[index]);

export interface CinematicBoardroomIntroProps {
  children?: React.ReactNode;
  projectName?: string;
  seniorPersonName?: string | string[];
  meetingWith?: string | string[];
  teamMembers?: string[];
  supportEmailsCount?: number;
  newFeaturesCount?: number;
  weekStart?: string;
  weekEnd?: string;
  title?: string;
  subtitle?: string;
  /** Kept for existing callers; the boardroom always uses its dark appearance. */
  isDark?: boolean;
  onComplete?: () => void;
  autoFetchNames?: boolean;
  heroScreen?: ReportHeroScreenData;
}

export const CinematicBoardroomIntro: React.FC<CinematicBoardroomIntroProps> = ({
  children, projectName, seniorPersonName, meetingWith, teamMembers: propTeamMembers,
  title = 'Executive Briefing', subtitle, weekStart, weekEnd, supportEmailsCount = 0, newFeaturesCount = 0,
  heroScreen, onComplete, autoFetchNames = false,
}) => {
  const [teamMembers, setTeamMembers] = useState<string[]>(propTeamMembers ?? []);
  const [selectedId, setSelectedId] = useState('VIEW');
  const [firstPerson, setFirstPerson] = useState(true);
  const [hover, setHover] = useState<{ id: string; x: number; y: number }>();
  const [resetKey, setResetKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const experienceRef = useRef<HTMLDivElement>(null);
  const parsedSeniorNames = parseMeetingWithNames(meetingWith ?? seniorPersonName);
  const stableSeniorNames = useRef(parsedSeniorNames);
  if (!sameNames(stableSeniorNames.current, parsedSeniorNames)) stableSeniorNames.current = parsedSeniorNames;
  const seniorNames = stableSeniorNames.current;

  useEffect(() => {
    const next = propTeamMembers ?? [];
    setTeamMembers(current => sameNames(current, next) ? current : next);
  }, [propTeamMembers]);
  useEffect(() => {
    if (!autoFetchNames || propTeamMembers !== undefined) return;
    let active = true;
    getTeamNames(undefined, 24).then(result => {
      if (active) setTeamMembers(current => sameNames(current, result.members) ? current : result.members);
    });
    return () => { active = false; };
  }, [autoFetchNames, propTeamMembers]);
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === experienceRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const room = useMemo(() => createRoom(teamMembers, seniorNames), [teamMembers, seniorNames]);
  const screenData = useMemo<ReportHeroScreenData>(() => ({
    projectName: heroScreen?.projectName || projectName || title,
    reportTitle: heroScreen?.reportTitle,
    subtitle: heroScreen?.subtitle ?? subtitle,
    weekStart: heroScreen?.weekStart ?? weekStart,
    weekEnd: heroScreen?.weekEnd ?? weekEnd,
    reportStatus: heroScreen?.reportStatus,
    supportEmails: heroScreen?.supportEmails ?? supportEmailsCount,
    newFeatures: heroScreen?.newFeatures ?? newFeaturesCount,
    codeFixes: heroScreen?.codeFixes,
    qualityScore: heroScreen?.qualityScore,
    qualityLabel: heroScreen?.qualityLabel,
  }), [heroScreen?.projectName, heroScreen?.reportTitle, heroScreen?.subtitle, heroScreen?.weekStart, heroScreen?.weekEnd, heroScreen?.reportStatus, heroScreen?.supportEmails, heroScreen?.newFeatures, heroScreen?.codeFixes, heroScreen?.qualityScore, heroScreen?.qualityLabel, projectName, title, subtitle, weekStart, weekEnd, supportEmailsCount, newFeaturesCount]);
  const selectedSeat = room.seats.find(seat => seat.id === selectedId)
    ?? room.seats.find(seat => seat.side === 'foot')
    ?? room.viewSeat;
  const hoveredSeat = room.seats.find(seat => seat.id === hover?.id);
  const seatLabel = (seat: Seat) => seat.member
    ? `${seat.id}, occupied by ${seat.member.name}${seat.member.role ? ` (${seat.member.role})` : ''}`
    : `${seat.id}, available`;
  const selectSeat = (id: string) => { setSelectedId(id); setFirstPerson(true); setResetKey(key => key + 1); setHover(undefined); };
  const toggleFullscreen = async () => {
    const experience = experienceRef.current;
    if (!experience) return;
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === experience) await document.exitFullscreen();
      else await experience.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  };
  const finish = () => {
    if (complete) return;
    if (document.fullscreenElement === experienceRef.current) void document.exitFullscreen().catch(() => {});
    setComplete(true);
    onComplete?.();
  };

  return <div className={`${styles.shell} ${styles.dark}`}>
    {!complete && <div ref={experienceRef} className={styles.experience} data-launching={launching} aria-label="Interactive boardroom preview">
      <div className={styles.scene}>
        {!failed
          ? <Suspense fallback={<div className={styles.loading}>Preparing the boardroom…</div>}>
            <BoardroomScene
              room={room}
              selectedId={selectedSeat.id}
              hoveredId={hoveredSeat?.id}
              recommendedIds={NO_RECOMMENDATIONS}
              firstPerson={firstPerson}
              resetKey={resetKey}
              isDark={true}
              screenData={screenData}
              onSelect={selectSeat}
              onLaunchStart={() => { setLaunching(true); setHover(undefined); }}
              onOpenReport={finish}
              onHover={(id, point) => setHover(id && point ? { id, ...point } : undefined)}
              onFailure={() => setFailed(true)}
            />
          </Suspense>
          : <div className={styles.fallback}>
            <strong>Boardroom preview is unavailable on this device.</strong>
            <p>You can still continue to the report.</p>
            <div className={styles.fallbackSeats}>{room.seats.map(seat => <button key={seat.id} type="button" onClick={() => selectSeat(seat.id)}>{seatLabel(seat)}</button>)}</div>
          </div>}
      </div>
      {launching && <div className={styles.launchTransition} aria-hidden="true" />}
      <div className={styles.topControls}>
        <div className={styles.viewSwitch} role="group" aria-label="Boardroom view">
          <button type="button" aria-pressed={firstPerson} className={firstPerson ? styles.active : ''} onClick={() => setFirstPerson(true)}><Eye size={15} /> Seat</button>
          <button type="button" aria-pressed={!firstPerson} className={!firstPerson ? styles.active : ''} onClick={() => { setFirstPerson(false); setResetKey(key => key + 1); setHover(undefined); }}><Box size={15} /> Hall</button>
        </div>
        <span className={styles.projectName}>{projectName || title}</span>
        <button className={styles.continueButton} type="button" onClick={finish}>Continue to report <ArrowRight size={15} /></button>
      </div>

      {hoveredSeat && hover && <div className={styles.tooltip} style={{ left: Math.min(hover.x + 14, window.innerWidth - 220), top: Math.min(hover.y + 14, window.innerHeight - 100) }}>
        <strong>{seatLabel(hoveredSeat)}</strong>
        <span>Click to preview this view</span>
      </div>}

      <div className={styles.bottomControls}>
        {firstPerson && !failed && <button className={styles.faceScreen} type="button" onClick={() => setResetKey(key => key + 1)}><MonitorPlay size={15} /> {selectedSeat.side === 'head' ? 'Face the room' : 'Face the screen'}</button>}
        <span>{firstPerson ? `${selectedSeat.id === 'VIEW' ? 'Your view opposite the screen' : `Your view from ${selectedSeat.id}`} · click a chair or name to switch views` : 'Click a chair or name to sit there · drag to explore the room'}</span>
      </div>
      <button className={styles.fullscreenButton} type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'} aria-pressed={isFullscreen}>
        {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
      </button>
      {fullscreenError && <span className={styles.fullscreenError} role="status">Full screen is unavailable here.</span>}

      <nav className={styles.accessibleSeats} aria-label="Preview a boardroom seat">
        {room.seats.map(seat => <button key={seat.id} type="button" onClick={() => selectSeat(seat.id)} aria-label={`Preview ${seatLabel(seat)}`}>{seatLabel(seat)}</button>)}
      </nav>
    </div>}
    <div className={complete ? styles.reportVisible : styles.reportHidden} aria-hidden={!complete} inert={!complete}>{children}</div>
  </div>;
};
