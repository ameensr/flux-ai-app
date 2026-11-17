import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import styles from './CinematicBoardroomIntro.module.css';
import { getTeamNames, getInitials, escapeHtml, parseMeetingWithNames } from './teamNamesHelper';
import { useTheme } from '@/context/ThemeContext';

export interface CinematicBoardroomIntroProps {
  /** The presentation component or executive dashboard to mount in the slot */
  children?: React.ReactNode;
  /** Explicit Project Name to display cleanly on top */
  projectName?: string;
  /** Explicit senior person name(s) (can be single or multiple) */
  seniorPersonName?: string | string[];
  /** Meeting with multiple names (e.g. "Subiya, Abhin") */
  meetingWith?: string | string[];
  /** Explicit team member names from Team Resource Allocation */
  teamMembers?: string[];
  /** Support Emails count for Dot Matrix telemetry HUD */
  supportEmailsCount?: number;
  /** New Features count for Dot Matrix telemetry HUD */
  newFeaturesCount?: number;
  /** Sprint start date */
  weekStart?: string;
  /** Sprint end date */
  weekEnd?: string;
  /** Optional title override (defaults to "Executive Briefing") */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Optional theme override */
  isDark?: boolean;
  /** Callback invoked once intro completes or is skipped */
  onComplete?: () => void;
  /** Optionally discover names from the current page (default: false) */
  autoFetchNames?: boolean;
}

export interface AvatarPalette {
  id: string;
  name: string;
  gradient: [string, string, string];
  glow: string;
  strokeDark: string;
  strokeLight: string;
}

export const MEMBER_PALETTES: AvatarPalette[] = [
  // 0. Electric Cyan
  {
    id: 'cyan',
    name: 'Electric Cyan',
    gradient: ['#38bdf8', '#0ea5e9', '#0284c7'],
    glow: '#38bdf8',
    strokeDark: 'rgba(56, 189, 248, 0.55)',
    strokeLight: '#0284c7',
  },
  // 1. Royal Violet / Purple
  {
    id: 'violet',
    name: 'Royal Violet',
    gradient: ['#c084fc', '#a855f7', '#7c3aed'],
    glow: '#a855f7',
    strokeDark: 'rgba(192, 132, 252, 0.55)',
    strokeLight: '#7c3aed',
  },
  // 2. Emerald Jade
  {
    id: 'emerald',
    name: 'Emerald Jade',
    gradient: ['#6ee7b7', '#10b981', '#059669'],
    glow: '#10b981',
    strokeDark: 'rgba(52, 211, 153, 0.55)',
    strokeLight: '#059669',
  },
  // 3. Sunset Coral
  {
    id: 'coral',
    name: 'Sunset Coral',
    gradient: ['#fda4af', '#f43f5e', '#e11d48'],
    glow: '#f43f5e',
    strokeDark: 'rgba(251, 113, 133, 0.55)',
    strokeLight: '#e11d48',
  },
  // 4. Electric Amber
  {
    id: 'amber',
    name: 'Electric Amber',
    gradient: ['#fde047', '#f59e0b', '#d97706'],
    glow: '#f59e0b',
    strokeDark: 'rgba(251, 191, 36, 0.55)',
    strokeLight: '#d97706',
  },
  // 5. Cosmic Magenta
  {
    id: 'magenta',
    name: 'Cosmic Magenta',
    gradient: ['#f472b6', '#e879f9', '#d946ef'],
    glow: '#d946ef',
    strokeDark: 'rgba(244, 114, 182, 0.55)',
    strokeLight: '#c026d3',
  },
  // 6. Deep Sapphire
  {
    id: 'sapphire',
    name: 'Deep Sapphire',
    gradient: ['#60a5fa', '#3b82f6', '#1d4ed8'],
    glow: '#3b82f6',
    strokeDark: 'rgba(96, 165, 250, 0.55)',
    strokeLight: '#1d4ed8',
  },
];

export const SENIOR_PALETTE: AvatarPalette = {
  id: 'senior-gold',
  name: 'Executive Gold',
  gradient: ['#fef08a', '#f59e0b', '#b45309'],
  glow: '#f59e0b',
  strokeDark: 'rgba(245, 158, 11, 0.7)',
  strokeLight: '#d97706',
};

interface SeatedPerson {
  id: string;
  name: string;
  initials: string;
  isSenior: boolean;
  angleDeg: number;
  x: number;
  y: number;
  laptopX: number;
  laptopY: number;
  laptopAngleDeg: number;
  chairX: number;
  chairY: number;
  staggerDelay: number;
  palette: AvatarPalette;
}

/**
 * Ultra-Premium SVG Figurine Avatar
 * - Meeting With / Senior: Bespoke Executive VIP style (Crown Star, Gold Orbit Halo, Midnight Suit & Gold Tie)
 * - Size: Noticeably larger (58px) for "Meeting With" leaders compared to standard members (46px)
 */
const AvatarGraphic: React.FC<{
  initials: string;
  palette: AvatarPalette;
  isSenior?: boolean;
  isDark?: boolean;
  uniqueKey: string;
  size?: number;
}> = React.memo(({ initials, palette, isSenior = false, isDark = false, uniqueKey, size: propSize }) => {
  // Noticeably larger size for "Meeting With" Executive Leader (58px vs 46px)
  const size = propSize || (isSenior ? 58 : 46);
  const gradientId = `avatar-grad-${palette.id}-${uniqueKey}`;
  const strokeColor = isDark ? palette.strokeDark : palette.strokeLight;

  if (isSenior) {
    // ── EXECUTIVE VIP / "MEETING WITH" BESPOKE STYLE ────────────────────────
    return (
      <div className={styles.avatarGraphicWrapper}>
        <svg
          width={size}
          height={size * 1.14}
          viewBox="0 0 64 74"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.seniorAvatarSvg}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`halo-senior-${uniqueKey}`} cx="50%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={isDark ? '0.65' : '0.45'} />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity={isDark ? '0.22' : '0.14'} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`senior-gold-grad-${uniqueKey}`} x1="32" y1="4" x2="32" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id={`suit-grad-${uniqueKey}`} x1="16" y1="36" x2="48" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id={`gold-trim-${uniqueKey}`} x1="20" y1="36" x2="44" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Grounding Contact Shadow Beneath Executive Base */}
          <ellipse cx="32" cy="69" rx="20" ry="3.8" fill="rgba(15, 23, 42, 0.28)" />

          {/* Outer Warm Golden Radial Halo */}
          <circle cx="32" cy="22" r="28" fill={`url(#halo-senior-${uniqueKey})`} />

          {/* Executive Dashed Orbital Ring */}
          <circle
            cx="32"
            cy="22"
            r="17"
            fill="none"
            stroke="rgba(245, 158, 11, 0.55)"
            strokeWidth="1.1"
            strokeDasharray="3.5 2.5"
          />

          {/* Executive 4-Point Golden Star Crest above Head */}
          <path
            d="M 32 1.5 L 33.3 4.2 L 36 5.5 L 33.3 6.8 L 32 9.5 L 30.7 6.8 L 28 5.5 L 30.7 4.2 Z"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="0.5"
          />
          <circle cx="32" cy="5.5" r="1.1" fill="#ffffff" />

          {/* Head Sphere (Polished Executive Gold) */}
          <circle
            cx="32"
            cy="22"
            r="12.5"
            fill={`url(#senior-gold-grad-${uniqueKey})`}
            stroke="#d97706"
            strokeWidth="1.2"
          />
          <circle
            cx="32"
            cy="22"
            r="11.5"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="0.8"
          />

          {/* Sculpted Executive Tailored Suit Jacket (Authoritative Shoulders & Rounded Base) */}
          <path
            d="M 9 58 C 9 42, 19 37, 32 37 C 45 37, 55 42, 55 58 C 55 65, 44 67, 32 67 C 20 67, 9 65, 9 58 Z"
            fill={`url(#suit-grad-${uniqueKey})`}
            stroke={`url(#gold-trim-${uniqueKey})`}
            strokeWidth="1.2"
          />

          {/* Crisp White Dress Shirt V-Neck Collar */}
          <polygon points="26,37 38,37 32,49" fill="#ffffff" />

          {/* Executive Golden Tie / Ascot */}
          <polygon
            points="30.5,39 33.5,39 33.2,51 32,54 30.8,51"
            fill={`url(#senior-gold-grad-${uniqueKey})`}
            stroke="#b45309"
            strokeWidth="0.6"
          />

          {/* Tailored Jacket Lapel Folds with Gold Trim */}
          <path
            d="M 18 39 L 27 49 L 32 57 L 37 49 L 46 39"
            stroke="rgba(245, 158, 11, 0.65)"
            strokeWidth="1"
            fill="none"
          />

          {/* Centered Executive Initials */}
          <text
            x="32"
            y="63"
            textAnchor="middle"
            fontSize="8"
            fontWeight="900"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
            letterSpacing="0.08em"
            fill="#ffffff"
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.85), 0 0 6px rgba(245, 158, 11, 0.8)',
            }}
          >
            {initials}
          </text>
        </svg>
      </div>
    );
  }

  // ── STANDARD TEAM MEMBER STYLE ───────────────────────────────────────────
  return (
    <div className={styles.avatarGraphicWrapper}>
      <svg
        width={size}
        height={size * 1.08}
        viewBox="0 0 64 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.avatarSvg}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`halo-${palette.id}-${uniqueKey}`} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity={isDark ? '0.35' : '0.25'} />
            <stop offset="60%" stopColor={palette.glow} stopOpacity={isDark ? '0.12' : '0.08'} />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gradientId} x1="32" y1="4" x2="32" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={palette.gradient[0]} />
            <stop offset="48%" stopColor={palette.gradient[1]} />
            <stop offset="100%" stopColor={palette.gradient[2]} />
          </linearGradient>
        </defs>

        {/* Grounding Contact Shadow Beneath Figurine Base */}
        <ellipse cx="32" cy="65" rx="16" ry="3.5" fill="rgba(15, 23, 42, 0.22)" />

        {/* Outer Radiant Ambient Halo Glow */}
        <circle cx="32" cy="20" r="26" fill={`url(#halo-${palette.id}-${uniqueKey})`} />

        {/* Head Sphere */}
        <circle
          cx="32"
          cy="20"
          r={11.5}
          fill={`url(#${gradientId})`}
          stroke={strokeColor}
          strokeWidth="1"
        />
        <circle
          cx="32"
          cy="20"
          r={10.5}
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="0.8"
        />

        {/* Fully Sculpted Seated Torso (Curved Rounded Base - NEVER Cut-Off!) */}
        <path
          d="M 14 55 C 14 43, 21 38, 32 38 C 43 38, 50 43, 50 55 C 50 62, 42 64, 32 64 C 22 64, 14 62, 14 55 Z"
          fill={`url(#${gradientId})`}
          stroke={strokeColor}
          strokeWidth="1"
        />
        <path
          d="M 17 53 C 17 45, 23 40, 32 40 C 41 40, 47 45, 47 53"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="0.8"
        />

        {/* Centered Initials */}
        <text
          x="32"
          y={52}
          textAnchor="middle"
          fontSize="8"
          fontWeight="800"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
          letterSpacing="0.05em"
          fill="#ffffff"
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)',
          }}
        >
          {initials}
        </text>
      </svg>
    </div>
  );
});

AvatarGraphic.displayName = 'AvatarGraphic';

export const CinematicBoardroomIntro: React.FC<CinematicBoardroomIntroProps> = ({
  children,
  projectName,
  seniorPersonName,
  meetingWith,
  teamMembers: propTeamMembers,
  supportEmailsCount = 0,
  newFeaturesCount = 0,
  weekStart,
  weekEnd,
  title = 'Executive Briefing',
  subtitle = 'Executive QA & Engineering Overview',
  isDark: propIsDark,
  onComplete,
  autoFetchNames = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dioramaRef = useRef<HTMLDivElement>(null);
  const cameraRigRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const presentationSlotRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const titleBoxRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // Theme resolution: default to Light Mode matching reference image
  let contextIsDark = false;
  try {
    const themeContext = useTheme();
    if (themeContext && typeof themeContext.isDark === 'boolean') {
      contextIsDark = themeContext.isDark;
    }
  } catch {
    if (typeof document !== 'undefined') {
      contextIsDark = document.documentElement.classList.contains('dark');
    }
  }
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  const initialSeniorNames = useMemo(() => {
    return parseMeetingWithNames(meetingWith ?? seniorPersonName);
  }, [meetingWith, seniorPersonName]);

  const [seniorNames, setSeniorNames] = useState<string[]>(initialSeniorNames);
  const [teamMembers, setTeamMembers] = useState<string[]>(() => propTeamMembers ?? []);
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const mw = parseMeetingWithNames(meetingWith ?? seniorPersonName);
    setSeniorNames(mw);
  }, [meetingWith, seniorPersonName]);

  useEffect(() => {
    if (propTeamMembers !== undefined) {
      setTeamMembers(propTeamMembers);
    }
  }, [propTeamMembers]);

  // Spacious Boardroom Table Dimensions to Guarantee Zero Crowding
  const { tableWidth, tableLength } = useMemo(() => {
    let maxSideSeats = Math.max(1, Math.ceil(teamMembers.length / 2));
    if (seniorNames.length === 0 && teamMembers.length % 2 !== 0 && teamMembers.length > 2) {
      maxSideSeats = Math.floor(teamMembers.length / 2);
    }
    const seatPitch = windowWidth <= 480 ? 64 : 78;
    const baseLength = windowWidth <= 480 ? 200 : 260;
    const calculatedLength = baseLength + maxSideSeats * seatPitch;

    const finalLength = Math.max(windowWidth <= 480 ? 320 : 420, calculatedLength);
    const finalWidth = windowWidth <= 480 ? 200 : 260;

    return { tableWidth: finalWidth, tableLength: finalLength };
  }, [windowWidth, seniorNames.length, teamMembers.length]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prefersReducedMotionRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotionRef.current = mediaQuery.matches;
      const listener = (e: MediaQueryListEvent) => {
        prefersReducedMotionRef.current = e.matches;
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  useEffect(() => {
    if (!autoFetchNames || propTeamMembers !== undefined) return;
    let active = true;

    getTeamNames(undefined, 24).then(result => {
      if (!active) return;
      setTeamMembers(result.members);
    });

    return () => {
      active = false;
    };
  }, [autoFetchNames, propTeamMembers]);

  // Flawless Symmetrical Seat, Laptop & Chair Alignment (Clean Physical Clearance)
  const seats: SeatedPerson[] = useMemo(() => {
    const list: SeatedPerson[] = [];
    const seniorCount = seniorNames.length;
    const halfW = tableWidth / 2;
    const halfL = tableLength / 2;
    const seatOffset = 56;       // Attendee sits 56px outside table edge
    const laptopInset = 32;      // Workstation deskpad sits 32px inside table surface
    const chairOffset = 70;      // Chair frame sits 14px BEHIND attendee (zero collision)
    const seatOffsetHead = 60;   // Head/Foot attendee clearance
    const laptopInsetHead = 34;  // Head/Foot device placement
    const chairOffsetHead = 74;  // Head/Foot chair position (cleanly behind attendee)

    // 1. Head of Table (North, Y < 0): Senior Leader(s) ONLY IF seniorCount > 0
    if (seniorCount === 1) {
      list.push({
        id: 'senior-0',
        name: seniorNames[0],
        initials: getInitials(seniorNames[0]),
        isSenior: true,
        angleDeg: 0,
        x: 0,
        y: Math.round(-halfL - seatOffsetHead),
        laptopX: 0,
        laptopY: Math.round(-halfL + laptopInsetHead),
        laptopAngleDeg: 180, // Screen opens facing North directly at Senior person
        chairX: 0,
        chairY: Math.round(-halfL - chairOffsetHead),
        staggerDelay: 0,
        palette: SENIOR_PALETTE,
      });
    } else if (seniorCount > 1) {
      const seniorSpacing = seniorCount > 2 ? 52 : 62;
      const seniorHalfSpan = ((seniorCount - 1) * seniorSpacing) / 2;
      seniorNames.forEach((name, sIdx) => {
        const xPos = -seniorHalfSpan + sIdx * seniorSpacing;
        list.push({
          id: `senior-${sIdx}`,
          name: name,
          initials: getInitials(name),
          isSenior: true,
          angleDeg: 0,
          x: Math.round(xPos),
          y: Math.round(-halfL - seatOffsetHead),
          laptopX: Math.round(xPos),
          laptopY: Math.round(-halfL + laptopInsetHead),
          laptopAngleDeg: 180,
          chairX: Math.round(xPos),
          chairY: Math.round(-halfL - chairOffsetHead),
          staggerDelay: sIdx * 0.15,
          palette: SENIOR_PALETTE,
        });
      });
    }

    // 2. Team Members Symmetrical Alignment along West & East Sides
    const teamCount = teamMembers.length;
    if (teamCount > 0) {
      const hasFootSeat = seniorCount === 0 && teamCount % 2 !== 0 && teamCount >= 3;
      const sideMembersCount = hasFootSeat ? teamCount - 1 : teamCount;
      const halfCount = Math.ceil(sideMembersCount / 2);
      const leftMembers = teamMembers.slice(0, halfCount);
      const rightMembers = teamMembers.slice(halfCount, sideMembersCount);
      const footMember = hasFootSeat ? teamMembers[teamMembers.length - 1] : null;

      const margin = 46;
      const usableSpan = Math.max(0, tableLength - margin * 2);
      const maxSideCount = Math.max(leftMembers.length, rightMembers.length, 1);
      const pitch = maxSideCount > 1 ? usableSpan / (maxSideCount - 1) : 0;

      // West (Left) Side: Facing East towards Table Center
      leftMembers.forEach((member, i) => {
        const yPos = maxSideCount === 1 ? 0 : -halfL + margin + i * pitch;
        list.push({
          id: `member-left-${i + 1}`,
          name: member,
          initials: getInitials(member),
          isSenior: false,
          angleDeg: 90,
          x: Math.round(-halfW - seatOffset),
          y: Math.round(yPos),
          laptopX: Math.round(-halfW + laptopInset),
          laptopY: Math.round(yPos),
          laptopAngleDeg: 90, // Screen opens facing West directly at left attendee
          chairX: Math.round(-halfW - chairOffset),
          chairY: Math.round(yPos),
          staggerDelay: 0.15 + i * 0.12,
          palette: MEMBER_PALETTES[i % MEMBER_PALETTES.length],
        });
      });

      // East (Right) Side: Directly Opposite Left Side in Perfect Symmetrical Alignment
      rightMembers.forEach((member, i) => {
        const yPos = maxSideCount === 1 ? 0 : -halfL + margin + i * pitch;
        list.push({
          id: `member-right-${i + 1}`,
          name: member,
          initials: getInitials(member),
          isSenior: false,
          angleDeg: -90,
          x: Math.round(halfW + seatOffset),
          y: Math.round(yPos),
          laptopX: Math.round(halfW - laptopInset),
          laptopY: Math.round(yPos),
          laptopAngleDeg: -90, // Screen opens facing East directly at right attendee
          chairX: Math.round(halfW + chairOffset),
          chairY: Math.round(yPos),
          staggerDelay: 0.15 + (leftMembers.length + i) * 0.12,
          palette: MEMBER_PALETTES[(leftMembers.length + i) % MEMBER_PALETTES.length],
        });
      });

      // Foot Member (South, if odd and no senior)
      if (footMember) {
        list.push({
          id: 'member-foot',
          name: footMember,
          initials: getInitials(footMember),
          isSenior: false,
          angleDeg: 180,
          x: 0,
          y: Math.round(halfL + seatOffsetHead),
          laptopX: 0,
          laptopY: Math.round(halfL - laptopInsetHead),
          laptopAngleDeg: 0, // Screen opens facing South directly at foot attendee
          chairX: 0,
          chairY: Math.round(halfL + chairOffsetHead),
          staggerDelay: 0.15 + teamCount * 0.1,
          palette: MEMBER_PALETTES[teamCount % MEMBER_PALETTES.length],
        });
      }
    }

    return list;
  }, [seniorNames, teamMembers, tableWidth, tableLength]);

  // RequestAnimationFrame scroll choreography:
  // Rotates the whole diorama assembly in unison while billboards counter-rotate
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const ambientAngleRef = useRef<number>(0);
  const currentCameraTiltRef = useRef<number>(56);
  const rafIdRef = useRef<number>(0);
  const billboardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const onCompleteCalledRef = useRef<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackHeight = trackRef.current.offsetHeight - window.innerHeight;
      if (trackHeight <= 0) return;

      const scrolled = -rect.top;
      const rawProgress = Math.min(1, Math.max(0, scrolled / trackHeight));
      targetProgressRef.current = rawProgress;

      if (scrolled > 20 && !hasScrolled) {
        setHasScrolled(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const updateChoreography = () => {
      if (onCompleteCalledRef.current) return;
      const reducedMotion = prefersReducedMotionRef.current;
      const lerpSpeed = reducedMotion ? 1 : 0.075;

      currentProgressRef.current +=
        (targetProgressRef.current - currentProgressRef.current) * lerpSpeed;

      const p = currentProgressRef.current;

      // 1. Progress Bar
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }

      // 2. Title drifts up cleanly
      if (titleBoxRef.current) {
        const titleNorm = Math.min(1, p / 0.2);
        titleBoxRef.current.style.opacity = Math.max(0, 1 - titleNorm).toFixed(3);
        titleBoxRef.current.style.transform = `translate(-50%, ${(-titleNorm * 32).toFixed(1)}px)`;
      }

      // 3. Scroll hint fades
      if (hintRef.current) {
        const hintNorm = Math.min(1, p / 0.04);
        hintRef.current.style.opacity = Math.max(0, 1 - hintNorm).toFixed(3);
      }

      // 4. Smooth Architectural Diorama Island Rotation
      if (!reducedMotion) {
        ambientAngleRef.current = (ambientAngleRef.current + 0.12) % 360;
      }
      const scrollRotation = p * 420;
      const dioramaRotation = scrollRotation + ambientAngleRef.current;

      // Rotate the unified Diorama Assembly (Table & Podium in 100% synchrony!)
      if (dioramaRef.current) {
        dioramaRef.current.style.transform = `translate(-50%, -50%) rotateZ(${dioramaRotation.toFixed(2)}deg)`;
      }

      // 5. Dynamic Camera Crane Tilt & Zoom
      let cameraScale = 1.0;
      let cameraTilt = 56;

      if (p < 0.45) {
        const norm1 = p / 0.45;
        const ease1 = norm1 * norm1;
        cameraScale = 1.0 + ease1 * 0.25;
        cameraTilt = 56 - ease1 * 6;
      } else {
        const norm2 = Math.min(1, (p - 0.45) / 0.50);
        const ease2 = norm2 * norm2 * (3 - 2 * norm2);
        cameraScale = 1.25 + ease2 * 1.50;
        cameraTilt = 50 - ease2 * 14;
      }
      currentCameraTiltRef.current = cameraTilt;

      if (cameraRigRef.current) {
        cameraRigRef.current.style.transform = `rotateX(${cameraTilt.toFixed(2)}deg) scale3d(${cameraScale.toFixed(3)}, ${cameraScale.toFixed(3)}, ${cameraScale.toFixed(3)})`;
      }

      // 6. Zero-Drift Counter-Rotation of Avatars:
      // Because billboards have fixed base center origin (24px 56px), rotating on Z & X has ZERO swing drift!
      const counterRotation = -dioramaRotation;
      const counterTilt = -cameraTilt;
      for (let i = 0; i < billboardsRef.current.length; i++) {
        const billboard = billboardsRef.current[i];
        if (billboard) {
          billboard.style.transform = `rotateZ(${counterRotation.toFixed(2)}deg) rotateX(${counterTilt.toFixed(2)}deg)`;
        }
      }

      // 7. Dissolve into presentation dashboard
      const dissolveNorm = Math.min(1, Math.max(0, (p - 0.60) / 0.35));
      const introOpacity = Math.max(0, 1 - dissolveNorm);
      const presOpacity = dissolveNorm;
      const presBlur = (1 - dissolveNorm) * 12;
      const presScale = 0.9 + dissolveNorm * 0.1;

      if (introLayerRef.current) {
        introLayerRef.current.style.opacity = introOpacity.toFixed(3);
        introLayerRef.current.style.pointerEvents = dissolveNorm >= 0.98 ? 'none' : 'auto';
        introLayerRef.current.inert = dissolveNorm >= 0.98;
        introLayerRef.current.setAttribute('aria-hidden', String(dissolveNorm >= 0.98));
      }

      if (presentationSlotRef.current) {
        presentationSlotRef.current.style.opacity = presOpacity.toFixed(3);
        presentationSlotRef.current.inert = dissolveNorm < 0.98;
        presentationSlotRef.current.setAttribute('aria-hidden', String(dissolveNorm < 0.98));
        if (dissolveNorm >= 0.98) {
          presentationSlotRef.current.style.filter = 'none';
          presentationSlotRef.current.style.transform = 'none';
          presentationSlotRef.current.classList.add(styles.presentationInteractive);
        } else {
          presentationSlotRef.current.style.filter = `blur(${presBlur.toFixed(1)}px)`;
          presentationSlotRef.current.style.transform = `scale(${presScale.toFixed(3)})`;
          presentationSlotRef.current.classList.remove(styles.presentationInteractive);
        }
      }

      if (p >= 0.96 && !onCompleteCalledRef.current) {
        onCompleteCalledRef.current = true;
        setIsCompleted(true);
        if (onComplete) onComplete();
      }

      rafIdRef.current = requestAnimationFrame(updateChoreography);
    };

    rafIdRef.current = requestAnimationFrame(updateChoreography);

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [hasScrolled, onComplete]);

  const handleSkip = useCallback(() => {
    if (onCompleteCalledRef.current) return;
    onCompleteCalledRef.current = true;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    setIsCompleted(true);
    if (introLayerRef.current) {
      introLayerRef.current.style.opacity = '0';
      introLayerRef.current.style.pointerEvents = 'none';
      introLayerRef.current.inert = true;
      introLayerRef.current.setAttribute('aria-hidden', 'true');
    }
    if (presentationSlotRef.current) {
      presentationSlotRef.current.style.opacity = '1';
      presentationSlotRef.current.style.filter = 'none';
      presentationSlotRef.current.style.transform = 'none';
      presentationSlotRef.current.inert = false;
      presentationSlotRef.current.setAttribute('aria-hidden', 'false');
      presentationSlotRef.current.classList.add(styles.presentationInteractive);
    }
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) handleSkip();
    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) handleSkip();
    };
    mediaQuery.addEventListener('change', onMotionChange);
    return () => mediaQuery.removeEventListener('change', onMotionChange);
  }, [handleSkip]);

  return (
    <div
      ref={trackRef}
      className={`${styles.boardroomContainer} ${isDark ? styles.darkTheme : styles.lightTheme}`}
    >
      <div className={styles.scrollTrack}>
        <div ref={stageRef} className={styles.stickyStage}>
          {/* Progress Bar */}
          <div ref={progressBarRef} className={styles.progressBar} />

          {/* Skip Button */}
          <button
            type="button"
            className={styles.skipButton}
            onClick={handleSkip}
            aria-label="Skip intro to report"
          >
            <span>Skip to Report</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Presentation Slot */}
          <div ref={presentationSlotRef} className={styles.presentationSlot} aria-hidden="true" inert>
            {children}
          </div>

          {/* Cinematic Intro 3D Overlay Layer */}
          <div
            ref={introLayerRef}
            className={`${styles.introLayer} ${isCompleted ? styles.introLayerCompleted : ''}`}
          >
            {/* Header Title: Project Name Only */}
            <div ref={titleBoxRef} className={styles.briefingHeader}>
              <h1 className={styles.briefingTitle}>{escapeHtml(projectName || title)}</h1>
            </div>

            {/* Dot Matrix Creative HUD (Rules 1, 2, 3: Blue/Purple Palette, 15% Opacity, Static Background) */}
            <div className={styles.dotMatrixHud} aria-label="Executive Metrics">
              <div className={styles.dotMatrixGridBackdrop} aria-hidden="true" />
              <div className={styles.dotMatrixHeader}>
                <div className={styles.dotMatrixBeacon} />
                <span className={styles.dotMatrixTag}>SYS // METRICS HUD</span>
              </div>
              <div className={styles.dotMatrixBody}>
                <div className={styles.dotMatrixItem}>
                  <div className={styles.dotMatrixMeta}>
                    <span className={styles.dotMatrixLabel}>New Features</span>
                    <div className={styles.dotMatrixLedBar} aria-hidden="true">
                      {[...Array(6)].map((_, i) => (
                        <span
                          key={i}
                          className={`${styles.dotMatrixLedDot} ${i < Math.min(6, Math.max(1, newFeaturesCount)) ? styles.ledCyan : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.dotMatrixDigitBoxCyan}>
                    <span className={styles.dotMatrixDigit}>{String(newFeaturesCount).padStart(2, '0')}</span>
                  </div>
                </div>

                <div className={styles.dotMatrixItem}>
                  <div className={styles.dotMatrixMeta}>
                    <span className={styles.dotMatrixLabel}>Support Emails</span>
                    <div className={styles.dotMatrixLedBar} aria-hidden="true">
                      {[...Array(6)].map((_, i) => (
                        <span
                          key={i}
                          className={`${styles.dotMatrixLedDot} ${i < Math.min(6, Math.max(1, supportEmailsCount)) ? styles.ledPurple : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.dotMatrixDigitBoxPurple}>
                    <span className={styles.dotMatrixDigit}>{String(supportEmailsCount).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
              <div className={styles.dotMatrixFooter}>
                <span className={styles.dotMatrixPulseDot} />
                <span className={styles.dotMatrixFooterText}>TELEMETRY SYNCHRONIZED</span>
              </div>
            </div>

            {/* 3D Viewport with Cinematic Diorama Rig */}
            <div className={styles.viewport3D}>
              <div ref={cameraRigRef} className={styles.cameraRig}>

                {/* 1. Surrounding Studio Ground Floor (Z = -60px) */}
                <div className={styles.floorPlane}>
                  <div className={styles.floorGridOverlay} />

                  {/* Dual Glowing Energy Conduits (Mint-Cyan & Coral-Amber) */}
                  <svg className={styles.neonTrackMint} viewBox="0 0 520 420" fill="none">
                    <path
                      d="M 30 30 L 440 30 Q 480 30 480 70 L 480 380"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg className={styles.neonTrackCoral} viewBox="0 0 520 420" fill="none">
                    <path
                      d="M 490 390 L 80 390 Q 40 390 40 350 L 40 40"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Floor Blueprint Documents (Bottom-Left - Actual Project Data) */}
                  <div className={styles.floorDocGroup}>
                    <div className={styles.floorDocCard}>
                      <span className={styles.floorDocTitle}>{escapeHtml(projectName || 'QA Report')}</span>
                      <div className={styles.floorDocLine} />
                      <div className={`${styles.floorDocLine} ${styles.floorDocLineShort}`} />
                      <span className={styles.floorDocBadge}>{teamMembers.length} Engineers</span>
                    </div>
                    <div className={styles.floorDocCard}>
                      <span className={styles.floorDocTitle}>Features</span>
                      <div className={styles.floorDocLine} />
                      <div className={`${styles.floorDocLine} ${styles.floorDocLineShort}`} />
                      <span className={styles.floorDocBadge}>{newFeaturesCount} Items</span>
                    </div>
                  </div>

                  {/* Floor 3D Pie Chart Disc (Bottom-Right - Real Proportions) */}
                  <div className={styles.floorPieGroup}>
                    <svg className={styles.floorPieSvg} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="#a855f7" />
                      <path d="M 50 50 L 50 10 A 40 40 0 0 1 88 62 Z" fill="#38bdf8" />
                      <path d="M 50 50 L 88 62 A 40 40 0 0 1 35 88 Z" fill="#10b981" />
                      <circle cx="50" cy="50" r="18" fill={isDark ? "#060911" : "#ffffff"} />
                    </svg>
                    <div className={styles.floorPieBadge}>
                      <span className={styles.floorPieBadgeVal}>
                        {newFeaturesCount + supportEmailsCount}
                      </span>
                      <span className={styles.floorPieBadgeLabel}>Tracked Items</span>
                    </div>
                  </div>

                </div>

                {/* 2. Perimeter Holographic Glass Screens (Background Layer beneath rotating 3D table!) */}

                {/* SCREEN 1: Real Executive Release Board (Back-Right) */}
                <div className={`${styles.holoScreenWrapper} ${styles.screenExecutiveBoard}`}>
                  <div className={styles.holoScreenBase}>
                    <div className={styles.execBoardHeader}>
                      <span className={styles.execBoardTitle}>{escapeHtml(projectName || title)}</span>
                      <span className={styles.execBoardBadge}>
                        {weekStart && weekEnd ? `${weekStart} – ${weekEnd}` : 'Live Overview'}
                      </span>
                    </div>
                    <div className={styles.execBoardRows}>
                      <div className={styles.execRowItem}>
                        <span className={styles.execRowLabel}>New Features</span>
                        <span className={styles.execRowVal}>{newFeaturesCount} Recorded</span>
                      </div>
                      <div className={styles.execRowItem}>
                        <span className={styles.execRowLabel}>Support Tickets</span>
                        <span className={styles.execRowVal}>{supportEmailsCount} Inquiries</span>
                      </div>
                      <div className={styles.execRowItem}>
                        <span className={styles.execRowLabel}>Team Allocated</span>
                        <span className={styles.execRowVal}>{teamMembers.length} Members</span>
                      </div>
                      <div className={styles.execRowItem}>
                        <span className={styles.execRowLabel}>Meeting With</span>
                        <span className={styles.execRowVal} style={{ color: '#38bdf8' }}>
                          {seniorNames.length > 0 ? seniorNames.join(', ') : 'All Team'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.execProgressBar}>
                      <div
                        className={styles.execProgressFill}
                        style={{
                          width: `${Math.min(100, Math.max(20, Math.round(((newFeaturesCount + 1) / (newFeaturesCount + supportEmailsCount + 1)) * 100)))}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* SCREEN 2: Real Sprint Metric Distribution (Back-Left) */}
                <div className={`${styles.holoScreenWrapper} ${styles.screenVelocity}`}>
                  <div className={styles.holoScreenBase}>
                    <div className={styles.execBoardHeader}>
                      <span className={styles.execBoardTitle}>Sprint Metrics</span>
                      <span className={styles.execBoardBadge} style={{ background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc' }}>
                        Live
                      </span>
                    </div>
                    <div className={styles.velocityBarGroup}>
                      <div className={styles.velocityBarCol}>
                        <div
                          className={styles.velocityBarPillar}
                          style={{
                            height: Math.min(44, Math.max(14, newFeaturesCount * 7)),
                            background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                          }}
                        />
                        <span className={styles.velocityBarLabel}>FEAT</span>
                      </div>
                      <div className={styles.velocityBarCol}>
                        <div
                          className={styles.velocityBarPillar}
                          style={{
                            height: Math.min(44, Math.max(14, supportEmailsCount * 4)),
                            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
                          }}
                        />
                        <span className={styles.velocityBarLabel}>SUP</span>
                      </div>
                      <div className={styles.velocityBarCol}>
                        <div
                          className={styles.velocityBarPillar}
                          style={{
                            height: Math.min(44, Math.max(14, teamMembers.length * 5)),
                            background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                          }}
                        />
                        <span className={styles.velocityBarLabel}>TEAM</span>
                      </div>
                      <div className={styles.velocityBarCol}>
                        <div
                          className={styles.velocityBarPillar}
                          style={{
                            height: Math.min(44, Math.max(14, (newFeaturesCount + supportEmailsCount) * 3)),
                            background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                          }}
                        />
                        <span className={styles.velocityBarLabel}>TOTAL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCREEN 3: Support Inquiries (Far-Left) */}
                <div className={`${styles.holoScreenWrapper} ${styles.screenSupportHealth}`}>
                  <div className={styles.holoScreenBase}>
                    <span className={styles.execBoardTitle}>Support Tickets</span>
                    <span className={styles.kpiBigNumber} style={{ color: '#a855f7' }}>{supportEmailsCount}</span>
                    <span className={styles.kpiSubtitle}>Inquiries Logged</span>
                  </div>
                </div>

                {/* SCREEN 4: Team Resources (Far-Right) */}
                <div className={`${styles.holoScreenWrapper} ${styles.screenTestMatrix}`}>
                  <div className={styles.holoScreenBase}>
                    <span className={styles.execBoardTitle}>Team Resources</span>
                    <span className={styles.kpiBigNumber} style={{ color: '#38bdf8' }}>{teamMembers.length}</span>
                    <span className={styles.kpiSubtitle}>Active Allocations</span>
                  </div>
                </div>

                {/* 3. Unified 3D Diorama Island Assembly (ON TOP OF THE LAYER! Z-Index 50) */}
                <div ref={dioramaRef} className={styles.dioramaAssembly}>

                  {/* Elevated Floating Podium Island */}
                  <div
                    className={styles.podiumIsland}
                    style={{
                      ['--table-width' as any]: `${tableWidth}px`,
                      ['--table-length' as any]: `${tableLength}px`,
                    }}
                  >
                    <div className={styles.podiumSurfaceGrid} />
                  </div>

                  {/* Architectural Pedestals beneath Table */}
                  <div
                    className={styles.tablePedestals}
                    style={{
                      ['--table-width' as any]: `${tableWidth}px`,
                      ['--table-length' as any]: `${tableLength}px`,
                    }}
                  >
                    <div className={styles.tablePedestalColumn} />
                    <div className={styles.tablePedestalColumn} />
                  </div>

                  {/* Boardroom Table Assembly */}
                  <div
                    className={styles.boardroomTable}
                    style={{
                      ['--table-width' as any]: `${tableWidth}px`,
                      ['--table-length' as any]: `${tableLength}px`,
                    }}
                  >
                    {/* Under-Rim Chamfer Layer */}
                    <div className={styles.tableUnderRim} />

                    {/* Central Media Runner with Glowing "QA" Emblem Disc */}
                    <div className={styles.tableMediaRunner}>
                      <div className={styles.tableRunnerLine} />
                      <div className={styles.tableCenterEmblem}>
                        <span className={styles.tableCenterQaText}>QA</span>
                      </div>
                      <div className={styles.tableRunnerLine} />
                    </div>

                    {/* 3D Open Executive Workstations (Deskpad + Laptop, 88px clearance from attendees) */}
                    {seats.map(person => (
                      <div
                        key={`laptop-${person.id}`}
                        className={styles.laptopAnchor}
                        style={{
                          transform: `translate3d(${person.laptopX}px, ${person.laptopY}px, 1.5px) rotateZ(${person.laptopAngleDeg}deg)`,
                        }}
                      >
                        {/* Executive Deskpad Mat */}
                        <div className={styles.deskpadMat} />

                        {/* Sleek Executive 3D Laptop */}
                        <div className={styles.laptopContainer}>
                          <div className={styles.laptopBase}>
                            <div className={styles.laptopKeyboard} />
                            <div className={styles.laptopTrackpad} />
                          </div>
                          <div className={styles.laptopScreen}>
                            <div className={styles.laptopScreenGlow} />
                            <div className={styles.laptopScreenBack}>
                              <div className={styles.laptopAppleLogo} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Cantilever Wireframe Executive Chairs (Offset 14px BEHIND each attendee, zero collision) */}
                    {seats.map(person => (
                      <div
                        key={`chair-${person.id}`}
                        className={styles.chairAnchor}
                        style={{
                          transform: `translate3d(${person.chairX}px, ${person.chairY}px, 0px) rotateZ(${person.angleDeg}deg)`,
                        }}
                      >
                        <div className={styles.chairFrame} />
                        <div className={styles.chairBackrest} />
                      </div>
                    ))}

                    {/* Seated Members (Zero-Drift Centered Base Origin, Elevated at Z = 6px) */}
                    {seats.map((person, idx) => (
                      <div
                        key={person.id}
                        className={styles.seatAnchor}
                        style={{
                          transform: `translate3d(${person.x}px, ${person.y}px, 6px)`,
                        }}
                      >
                        <div
                          ref={el => {
                            billboardsRef.current[idx] = el;
                          }}
                          className={`${styles.avatarBillboard} ${person.isSenior ? styles.seniorBillboard : ''}`}
                        >
                          {/* Centered Name Tag above Avatar */}
                          <div className={styles.nameTagWrapper}>
                            <div className={`${styles.nameTagPill} ${person.isSenior ? styles.seniorTagPill : ''}`}>
                              {person.isSenior ? (
                                <svg
                                  className={styles.seniorTagIcon}
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                                </svg>
                              ) : (
                                <span
                                  className={styles.nameTagStatusDot}
                                  style={{
                                    backgroundColor: person.palette.glow,
                                    boxShadow: `0 0 5px ${person.palette.glow}`,
                                  }}
                                />
                              )}
                              <span className={`${styles.nameTagText} ${person.isSenior ? styles.seniorTagText : ''}`}>
                                {person.name}
                              </span>
                            </div>
                          </div>

                          {/* Ultra-Premium SVG Glow Avatar */}
                          <AvatarGraphic
                            initials={person.initials}
                            palette={person.palette}
                            isSenior={person.isSenior}
                            isDark={isDark}
                            uniqueKey={person.id}
                          />
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

              </div>
            </div>

            {/* "Scroll to begin" hint */}
            <div ref={hintRef} className={styles.scrollHint} aria-hidden={hasScrolled}>
              <span className={styles.scrollHintText}>Scroll to begin</span>
              <div className={styles.mouseIcon}>
                <div className={styles.mouseWheel} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
