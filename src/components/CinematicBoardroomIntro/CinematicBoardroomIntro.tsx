import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import styles from './CinematicBoardroomIntro.module.css';
import { getTeamNames, getInitials, escapeHtml, parseMeetingWithNames, DEMO_MEMBERS, DEMO_SENIOR } from './teamNamesHelper';
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
  /** Optional title override (defaults to "Team briefing") */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Optional theme override */
  isDark?: boolean;
  /** Callback invoked once intro completes or is skipped */
  onComplete?: () => void;
  /** Auto fetch names from /qa-report or DOM on mount (default: true) */
  autoFetchNames?: boolean;
}

export interface AvatarPalette {
  id: string;
  name: string;
  // Multi-stop gradient colors [lightTop, midColor, deepBottom]
  gradient: [string, string, string];
  // Outer ambient glow color
  glow: string;
  // Subtle border strokes
  strokeDark: string;
  strokeLight: string;
}

export const MEMBER_PALETTES: AvatarPalette[] = [
  // 0. Electric Cyan / Azure (Matches User Reference 1)
  {
    id: 'cyan',
    name: 'Electric Cyan',
    gradient: ['#38bdf8', '#0ea5e9', '#0284c7'],
    glow: '#38bdf8',
    strokeDark: 'rgba(56, 189, 248, 0.45)',
    strokeLight: '#0284c7',
  },
  // 1. Royal Violet / Deep Indigo (Matches User Reference 2)
  {
    id: 'violet',
    name: 'Royal Violet',
    gradient: ['#c084fc', '#a855f7', '#6366f1'],
    glow: '#a855f7',
    strokeDark: 'rgba(192, 132, 252, 0.45)',
    strokeLight: '#7c3aed',
  },
  // 2. Emerald / Mint Jade
  {
    id: 'emerald',
    name: 'Emerald Jade',
    gradient: ['#6ee7b7', '#10b981', '#059669'],
    glow: '#10b981',
    strokeDark: 'rgba(52, 211, 153, 0.45)',
    strokeLight: '#059669',
  },
  // 3. Sunset Coral / Crimson
  {
    id: 'coral',
    name: 'Sunset Coral',
    gradient: ['#fda4af', '#f43f5e', '#e11d48'],
    glow: '#f43f5e',
    strokeDark: 'rgba(251, 113, 133, 0.45)',
    strokeLight: '#e11d48',
  },
  // 4. Electric Tangerine / Amber
  {
    id: 'amber',
    name: 'Electric Amber',
    gradient: ['#fde047', '#f59e0b', '#d97706'],
    glow: '#f59e0b',
    strokeDark: 'rgba(251, 191, 36, 0.45)',
    strokeLight: '#d97706',
  },
  // 5. Cosmic Orchid / Magenta
  {
    id: 'magenta',
    name: 'Cosmic Magenta',
    gradient: ['#f472b6', '#e879f9', '#d946ef'],
    glow: '#d946ef',
    strokeDark: 'rgba(244, 114, 182, 0.45)',
    strokeLight: '#c026d3',
  },
  // 6. Deep Sapphire / Marine
  {
    id: 'sapphire',
    name: 'Deep Sapphire',
    gradient: ['#93c5fd', '#3b82f6', '#1d4ed8'],
    glow: '#3b82f6',
    strokeDark: 'rgba(96, 165, 250, 0.45)',
    strokeLight: '#1d4ed8',
  },
  // 7. Seafoam Teal / Turquoise
  {
    id: 'teal',
    name: 'Ocean Teal',
    gradient: ['#5eead4', '#14b8a6', '#0d9488'],
    glow: '#14b8a6',
    strokeDark: 'rgba(45, 212, 191, 0.45)',
    strokeLight: '#0f766e',
  },
  // 8. Vivid Amethyst / Plum
  {
    id: 'amethyst',
    name: 'Vivid Amethyst',
    gradient: ['#f0abfc', '#c084fc', '#9333ea'],
    glow: '#a21caf',
    strokeDark: 'rgba(232, 121, 249, 0.45)',
    strokeLight: '#9333ea',
  },
];

// Dedicated VIP Executive 24k Imperial Gold Palette for "Meeting With" senior leaders
export const SENIOR_PALETTE: AvatarPalette = {
  id: 'senior-gold',
  name: 'Imperial Gold',
  gradient: ['#fef08a', '#fbbf24', '#f59e0b'],
  glow: '#f59e0b',
  strokeDark: 'rgba(254, 240, 138, 0.65)',
  strokeLight: '#b45309',
};

interface SeatedPerson {
  id: string;
  name: string;
  initials: string;
  isSenior: boolean;
  angleDeg: number;
  x: number;
  y: number;
  padX: number;
  padY: number;
  padOrientation: 'horizontal' | 'vertical';
  staggerDelay: number;
  palette: AvatarPalette;
}

/**
 * Procedural Vector SVG Avatar for Boardroom Members (Ultra-High-Definition Luxury Design)
 * Matches the reference silhouette with elevated rendering fidelity:
 * - Geometric precision vector rendering
 * - Dual-layer radiant atmospheric glow
 * - Specular reflection arc on head + subtle chin ambient occlusion
 * - Sleek curved dome shoulders with top edge rim lighting
 * - Inlaid frosted monogram medallion disc for ultra-crisp initials
 * - Imperial 24k Gold dual-ring coronet & diamond star crest for Senior leaders
 */
const AvatarGraphic: React.FC<{
  initials: string;
  palette: AvatarPalette;
  isSenior?: boolean;
  isDark?: boolean;
  size?: number;
  uniqueKey?: string;
}> = React.memo(({ initials, palette, isSenior = false, isDark = true, size = 52, uniqueKey = 'p' }) => {
  const gradId = `avatar-grad-${uniqueKey}-${palette.id}`;
  const auraInnerId = `avatar-aura-in-${uniqueKey}-${palette.id}`;
  const auraOuterId = `avatar-aura-out-${uniqueKey}-${palette.id}`;
  const strokeColor = isSenior
    ? (isDark ? '#fef08a' : '#d97706')
    : (isDark ? palette.strokeDark : palette.strokeLight);

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 64 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      className={isSenior ? styles.seniorAvatarSvgWrapper : styles.avatarSvgWrapper}
      aria-hidden="true"
    >
      <defs>
        {/* Layer 1: Wide Ethereal Radial Ambient Atmosphere */}
        <radialGradient id={auraOuterId} cx="50%" cy="44%" r="56%">
          <stop
            offset="0%"
            stopColor={palette.glow}
            stopOpacity={isDark ? (isSenior ? 0.42 : 0.32) : (isSenior ? 0.24 : 0.16)}
          />
          <stop
            offset="60%"
            stopColor={palette.glow}
            stopOpacity={isDark ? (isSenior ? 0.14 : 0.09) : (isSenior ? 0.07 : 0.04)}
          />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>

        {/* Layer 2: Core Vibrant Volumetric Glow */}
        <radialGradient id={auraInnerId} cx="50%" cy="38%" r="38%">
          <stop
            offset="0%"
            stopColor={palette.glow}
            stopOpacity={isDark ? (isSenior ? 0.58 : 0.48) : (isSenior ? 0.35 : 0.26)}
          />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>

        {/* Multi-Stop Linear Colorway Gradient for Head & Bust */}
        <linearGradient id={gradId} x1="32" y1="6" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.gradient[0]} />
          <stop offset="48%" stopColor={palette.gradient[1]} />
          <stop offset="100%" stopColor={palette.gradient[2]} />
        </linearGradient>

        {/* Specular Highlight Arc Linear Gradient */}
        <linearGradient id={`${gradId}-spec`} x1="24" y1="8" x2="40" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* 1. Dual-Layer Atmospheric Radiant Auras */}
      <ellipse
        cx="32"
        cy="37"
        rx="30"
        ry="30"
        fill={`url(#${auraOuterId})`}
        pointerEvents="none"
      />
      <ellipse
        cx="32"
        cy="37"
        rx="22"
        ry="22"
        fill={`url(#${auraInnerId})`}
        pointerEvents="none"
      />

      {/* 2. Floating VIP Gold Coronet / Halo Ring for "Meeting With" Senior Leaders */}
      {isSenior && (
        <g>
          {/* Outer Halo Ring */}
          <ellipse
            cx="32"
            cy="5.5"
            rx="12"
            ry="3.4"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.6"
            opacity="0.95"
            filter="drop-shadow(0 0 5px #f59e0b)"
          />
          {/* Core Light Shimmer Arc */}
          <ellipse
            cx="32"
            cy="5.5"
            rx="9.5"
            ry="2.4"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.9"
            opacity="0.85"
          />
        </g>
      )}

      {/* 3. Smooth Floating Circular Head (Reference Silhouette) */}
      <circle
        cx="32"
        cy={isSenior ? 19.5 : 18.5}
        r="10.8"
        fill={`url(#${gradId})`}
        stroke={strokeColor}
        strokeWidth={isSenior ? 1.4 : 1.0}
      />

      {/* Specular Light Reflection Highlight on Head */}
      <path
        d="M 25.5 12 C 27.5 9.2, 36.5 9.2, 38.5 12 C 35.5 10.3, 28.5 10.3, 25.5 12 Z"
        fill={`url(#${gradId}-spec)`}
      />

      {/* Soft Ambient Shadow Beneath Head */}
      <ellipse
        cx="32"
        cy={isSenior ? 31 : 30}
        rx="5.5"
        ry="1.4"
        fill="rgba(0, 0, 0, 0.18)"
      />

      {/* 4. Sleek Aerodynamic Dome Shoulders with Rounded Bottom (Reference Silhouette) */}
      <path
        d="M 10 58 C 7 52, 9 44, 18 40 C 23 38, 27 37.5, 32 37.5 C 37 37.5, 41 38, 46 40 C 55 44, 57 52, 54 58 C 52 61, 48 61.5, 42 61.5 L 22 61.5 C 16 61.5, 12 61, 10 58 Z"
        fill={`url(#${gradId})`}
        stroke={strokeColor}
        strokeWidth={isSenior ? 1.4 : 1.0}
      />

      {/* Subtle Specular Rim Light along top edge of Shoulders */}
      <path
        d="M 17 41.5 C 23 38.5, 27 38, 32 38 C 37 38, 41 38.5, 47 41.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />

      {/* 5. Senior Executive Diamond Lapel Crest */}
      {isSenior ? (
        <g>
          <polygon
            points="32,41 35.5,44.5 32,48 28.5,44.5"
            fill="#fef08a"
            stroke="#b45309"
            strokeWidth="0.8"
            filter="drop-shadow(0 0 3px rgba(245, 158, 11, 0.85))"
          />
          <circle cx="32" cy="44.5" r="1" fill="#ffffff" />
        </g>
      ) : null}

      {/* 6. Inlaid Frosted Medallion Disc with Initials */}
      <circle
        cx="32"
        cy={isSenior ? 54.5 : 52}
        r="7.5"
        fill="rgba(255, 255, 255, 0.14)"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="0.6"
      />
      <text
        x="32"
        y={isSenior ? 57 : 54.5}
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
        letterSpacing="0.05em"
        fill="#ffffff"
        style={{
          textShadow: isDark
            ? '0 1px 2px rgba(0, 0, 0, 0.55)'
            : '0 1px 2px rgba(0, 0, 0, 0.35)',
        }}
      >
        {initials}
      </text>
    </svg>
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
  title = 'Team briefing',
  subtitle = 'Executive QA & Engineering Overview',
  isDark: propIsDark,
  onComplete,
  autoFetchNames = true,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const cameraRigRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const presentationSlotRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const titleBoxRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // Theme resolution: props > ThemeContext > document.documentElement
  let contextIsDark = true;
  try {
    const themeContext = useTheme();
    if (themeContext && typeof themeContext.isDark === 'boolean') {
      contextIsDark = themeContext.isDark;
    }
  } catch {
    if (typeof document !== 'undefined') {
      contextIsDark = !document.documentElement.classList.contains('light');
    }
  }
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  // Resolve meetingWith names ONLY - if empty, NO senior avatar is shown
  const initialSeniorNames = useMemo(() => {
    return parseMeetingWithNames(meetingWith);
  }, [meetingWith]);

  const [seniorNames, setSeniorNames] = useState<string[]>(initialSeniorNames);
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
    if (propTeamMembers && propTeamMembers.length > 0) return propTeamMembers;
    return DEMO_MEMBERS;
  });
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Keep senior names synced when meetingWith prop changes
  useEffect(() => {
    const mw = parseMeetingWithNames(meetingWith);
    setSeniorNames(mw);
  }, [meetingWith]);

  // Keep team members synced when prop changes
  useEffect(() => {
    if (propTeamMembers && propTeamMembers.length > 0) {
      setTeamMembers(propTeamMembers);
    }
  }, [propTeamMembers]);

  // Measure responsive rectangular table dimensions dynamically based on attendee count
  const { tableWidth, tableLength } = useMemo(() => {
    const totalAttendees = seniorNames.length + teamMembers.length;
    let maxSideSeats = Math.ceil(teamMembers.length / 2);
    if (seniorNames.length === 0 && teamMembers.length % 2 !== 0 && teamMembers.length > 2) {
      maxSideSeats = Math.floor(teamMembers.length / 2);
    }
    maxSideSeats = Math.max(1, maxSideSeats);

    const seatPitch = windowWidth <= 480 ? 46 : windowWidth <= 768 ? 56 : 64;
    const baseLength = windowWidth <= 480 ? 130 : 170;
    const calculatedLength = baseLength + maxSideSeats * seatPitch;

    let finalLength = Math.max(windowWidth <= 480 ? 250 : 340, calculatedLength);
    let finalWidth = windowWidth <= 480 ? 150 : windowWidth <= 768 ? 190 : 240;

    if (totalAttendees <= 2) {
      finalLength = windowWidth <= 480 ? 220 : 280;
      finalWidth = windowWidth <= 480 ? 140 : 180;
    } else if (totalAttendees <= 4) {
      finalLength = windowWidth <= 480 ? 260 : 340;
      finalWidth = windowWidth <= 480 ? 150 : 200;
    }

    return { tableWidth: finalWidth, tableLength: finalLength };
  }, [windowWidth, seniorNames.length, teamMembers.length]);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check prefers-reduced-motion
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

  // Fetch Team Names on mount as fallback if not explicitly passed
  useEffect(() => {
    if (!autoFetchNames || (propTeamMembers && propTeamMembers.length > 0)) return;
    let active = true;

    getTeamNames(undefined, 24).then(result => {
      if (!active) return;
      // ONLY set seniorNames if meetingWith was explicitly provided
      const mw = parseMeetingWithNames(meetingWith);
      setSeniorNames(mw);
      if (result.members && result.members.length > 0 && (!propTeamMembers || propTeamMembers.length === 0)) {
        setTeamMembers(result.members);
      }
    });

    return () => {
      active = false;
    };
  }, [autoFetchNames, meetingWith, propTeamMembers]);

  // Auto-align attendees around the Rectangular 3D Boardroom table:
  // - If seniorCount > 0 ("Meeting With" provided):
  //     Senior attendee(s) sit at the North head of the table.
  //     Team members auto-align along the sides (West & East), with foot seat if odd.
  // - If seniorCount === 0 ("Meeting With" is EMPTY):
  //     NO avatar is rendered at the senior position.
  //     Team members auto-align with perfect balance around the table.
  const seats: SeatedPerson[] = useMemo(() => {
    const list: SeatedPerson[] = [];
    const seniorCount = seniorNames.length;
    const halfW = tableWidth / 2;
    const halfL = tableLength / 2;
    const seatOffset = 42; // Distance from table perimeter to chair center

    // 1. Head of Table (North, Y < 0): Senior Leader(s) ONLY IF seniorCount > 0
    if (seniorCount === 1) {
      list.push({
        id: 'senior-0',
        name: seniorNames[0],
        initials: getInitials(seniorNames[0]),
        isSenior: true,
        angleDeg: -90,
        x: 0,
        y: Math.round(-halfL - seatOffset),
        padX: 0,
        padY: Math.round(-halfL + 20),
        padOrientation: 'horizontal',
        staggerDelay: 0,
        palette: SENIOR_PALETTE,
      });
    } else if (seniorCount > 1) {
      const seniorSpacing = seniorCount > 2 ? 46 : 56;
      const seniorHalfSpan = ((seniorCount - 1) * seniorSpacing) / 2;
      seniorNames.forEach((name, sIdx) => {
        const xPos = -seniorHalfSpan + sIdx * seniorSpacing;
        list.push({
          id: `senior-${sIdx}`,
          name: name,
          initials: getInitials(name),
          isSenior: true,
          angleDeg: -90,
          x: Math.round(xPos),
          y: Math.round(-halfL - seatOffset),
          padX: Math.round(xPos),
          padY: Math.round(-halfL + 20),
          padOrientation: 'horizontal',
          staggerDelay: sIdx * 0.18,
          palette: SENIOR_PALETTE,
        });
      });
    }

    // 2. Team Members Auto-Alignment
    const teamCount = teamMembers.length;
    if (teamCount > 0) {
      if (seniorCount > 0) {
        // CASE A: Meeting With attendee(s) present at North head
        const hasFootSeat = teamCount % 2 !== 0 && teamCount >= 3;
        const sideMembersCount = hasFootSeat ? teamCount - 1 : teamCount;
        const halfCount = Math.floor(sideMembersCount / 2);

        const leftMembers = teamMembers.slice(0, halfCount);
        const rightMembers = teamMembers.slice(halfCount, sideMembersCount);
        const footMember = hasFootSeat ? teamMembers[teamCount - 1] : null;

        const margin = Math.min(54, halfL * 0.28);
        const usableSpan = (halfL - margin) * 2;

        leftMembers.forEach((member, i) => {
          const yPos = halfCount === 1 ? 0 : -halfL + margin + (i / (halfCount - 1)) * usableSpan;
          list.push({
            id: `member-left-${i + 1}`,
            name: member,
            initials: getInitials(member),
            isSenior: false,
            angleDeg: 180,
            x: Math.round(-halfW - seatOffset),
            y: Math.round(yPos),
            padX: Math.round(-halfW + 18),
            padY: Math.round(yPos),
            padOrientation: 'vertical',
            staggerDelay: (seniorCount * 0.18) + (i + 1) * 0.18,
            palette: MEMBER_PALETTES[i % MEMBER_PALETTES.length],
          });
        });

        rightMembers.forEach((member, i) => {
          const yPos = halfCount === 1 ? 0 : -halfL + margin + (i / (halfCount - 1)) * usableSpan;
          list.push({
            id: `member-right-${i + 1}`,
            name: member,
            initials: getInitials(member),
            isSenior: false,
            angleDeg: 0,
            x: Math.round(halfW + seatOffset),
            y: Math.round(yPos),
            padX: Math.round(halfW - 18),
            padY: Math.round(yPos),
            padOrientation: 'vertical',
            staggerDelay: (seniorCount * 0.18) + (leftMembers.length + i + 1) * 0.18,
            palette: MEMBER_PALETTES[(leftMembers.length + i) % MEMBER_PALETTES.length],
          });
        });

        if (footMember) {
          list.push({
            id: 'member-foot',
            name: footMember,
            initials: getInitials(footMember),
            isSenior: false,
            angleDeg: 90,
            x: 0,
            y: Math.round(halfL + seatOffset),
            padX: 0,
            padY: Math.round(halfL - 20),
            padOrientation: 'horizontal',
            staggerDelay: (seniorCount * 0.18) + teamCount * 0.18,
            palette: MEMBER_PALETTES[(leftMembers.length + rightMembers.length) % MEMBER_PALETTES.length],
          });
        }
      } else {
        // CASE B: Meeting With is EMPTY (seniorCount === 0)
        // Auto-align team members with perfect balance around the table
        if (teamCount === 1) {
          list.push({
            id: 'member-head',
            name: teamMembers[0],
            initials: getInitials(teamMembers[0]),
            isSenior: false,
            angleDeg: -90,
            x: 0,
            y: Math.round(-halfL - seatOffset),
            padX: 0,
            padY: Math.round(-halfL + 20),
            padOrientation: 'horizontal',
            staggerDelay: 0.18,
            palette: MEMBER_PALETTES[0],
          });
        } else if (teamCount === 2) {
          list.push({
            id: 'member-left-1',
            name: teamMembers[0],
            initials: getInitials(teamMembers[0]),
            isSenior: false,
            angleDeg: 180,
            x: Math.round(-halfW - seatOffset),
            y: 0,
            padX: Math.round(-halfW + 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.18,
            palette: MEMBER_PALETTES[0],
          });
          list.push({
            id: 'member-right-1',
            name: teamMembers[1],
            initials: getInitials(teamMembers[1]),
            isSenior: false,
            angleDeg: 0,
            x: Math.round(halfW + seatOffset),
            y: 0,
            padX: Math.round(halfW - 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.36,
            palette: MEMBER_PALETTES[1],
          });
        } else if (teamCount === 3) {
          list.push({
            id: 'member-head',
            name: teamMembers[0],
            initials: getInitials(teamMembers[0]),
            isSenior: false,
            angleDeg: -90,
            x: 0,
            y: Math.round(-halfL - seatOffset),
            padX: 0,
            padY: Math.round(-halfL + 20),
            padOrientation: 'horizontal',
            staggerDelay: 0.18,
            palette: MEMBER_PALETTES[0],
          });
          list.push({
            id: 'member-left-1',
            name: teamMembers[1],
            initials: getInitials(teamMembers[1]),
            isSenior: false,
            angleDeg: 180,
            x: Math.round(-halfW - seatOffset),
            y: 0,
            padX: Math.round(-halfW + 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.36,
            palette: MEMBER_PALETTES[1],
          });
          list.push({
            id: 'member-right-1',
            name: teamMembers[2],
            initials: getInitials(teamMembers[2]),
            isSenior: false,
            angleDeg: 0,
            x: Math.round(halfW + seatOffset),
            y: 0,
            padX: Math.round(halfW - 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.54,
            palette: MEMBER_PALETTES[2],
          });
        } else if (teamCount === 4) {
          list.push({
            id: 'member-head',
            name: teamMembers[0],
            initials: getInitials(teamMembers[0]),
            isSenior: false,
            angleDeg: -90,
            x: 0,
            y: Math.round(-halfL - seatOffset),
            padX: 0,
            padY: Math.round(-halfL + 20),
            padOrientation: 'horizontal',
            staggerDelay: 0.18,
            palette: MEMBER_PALETTES[0],
          });
          list.push({
            id: 'member-left-1',
            name: teamMembers[1],
            initials: getInitials(teamMembers[1]),
            isSenior: false,
            angleDeg: 180,
            x: Math.round(-halfW - seatOffset),
            y: 0,
            padX: Math.round(-halfW + 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.36,
            palette: MEMBER_PALETTES[1],
          });
          list.push({
            id: 'member-right-1',
            name: teamMembers[2],
            initials: getInitials(teamMembers[2]),
            isSenior: false,
            angleDeg: 0,
            x: Math.round(halfW + seatOffset),
            y: 0,
            padX: Math.round(halfW - 18),
            padY: 0,
            padOrientation: 'vertical',
            staggerDelay: 0.54,
            palette: MEMBER_PALETTES[2],
          });
          list.push({
            id: 'member-foot',
            name: teamMembers[3],
            initials: getInitials(teamMembers[3]),
            isSenior: false,
            angleDeg: 90,
            x: 0,
            y: Math.round(halfL + seatOffset),
            padX: 0,
            padY: Math.round(halfL - 20),
            padOrientation: 'horizontal',
            staggerDelay: 0.72,
            palette: MEMBER_PALETTES[3],
          });
        } else {
          // teamCount >= 5:
          // If odd: 1 at North head, remaining split equally between West and East
          // If even: split equally between West and East
          const isOdd = teamCount % 2 !== 0;
          const headMember = isOdd ? teamMembers[0] : null;
          const sideMembers = isOdd ? teamMembers.slice(1) : teamMembers;
          const halfCount = sideMembers.length / 2;

          const leftMembers = sideMembers.slice(0, halfCount);
          const rightMembers = sideMembers.slice(halfCount);

          if (headMember) {
            list.push({
              id: 'member-head',
              name: headMember,
              initials: getInitials(headMember),
              isSenior: false,
              angleDeg: -90,
              x: 0,
              y: Math.round(-halfL - seatOffset),
              padX: 0,
              padY: Math.round(-halfL + 20),
              padOrientation: 'horizontal',
              staggerDelay: 0.18,
              palette: MEMBER_PALETTES[0],
            });
          }

          const margin = Math.min(50, halfL * 0.25);
          const usableSpan = (halfL - margin) * 2;

          leftMembers.forEach((member, i) => {
            const yPos = halfCount === 1 ? 0 : -halfL + margin + (i / (halfCount - 1)) * usableSpan;
            list.push({
              id: `member-left-${i + 1}`,
              name: member,
              initials: getInitials(member),
              isSenior: false,
              angleDeg: 180,
              x: Math.round(-halfW - seatOffset),
              y: Math.round(yPos),
              padX: Math.round(-halfW + 18),
              padY: Math.round(yPos),
              padOrientation: 'vertical',
              staggerDelay: (headMember ? 0.36 : 0.18) + i * 0.18,
              palette: MEMBER_PALETTES[(headMember ? i + 1 : i) % MEMBER_PALETTES.length],
            });
          });

          rightMembers.forEach((member, i) => {
            const yPos = halfCount === 1 ? 0 : -halfL + margin + (i / (halfCount - 1)) * usableSpan;
            list.push({
              id: `member-right-${i + 1}`,
              name: member,
              initials: getInitials(member),
              isSenior: false,
              angleDeg: 0,
              x: Math.round(halfW + seatOffset),
              y: Math.round(yPos),
              padX: Math.round(halfW - 18),
              padY: Math.round(yPos),
              padOrientation: 'vertical',
              staggerDelay: (headMember ? 0.36 : 0.18) + (leftMembers.length + i) * 0.18,
              palette: MEMBER_PALETTES[(headMember ? leftMembers.length + i + 1 : leftMembers.length + i) % MEMBER_PALETTES.length],
            });
          });
        }
      }
    }

    return list;
  }, [seniorNames, teamMembers, tableWidth, tableLength]);

  // Refs for requestAnimationFrame scroll driving
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const currentCameraTiltRef = useRef<number>(60);
  const ambientAngleRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const onCompleteCalledRef = useRef<boolean>(false);

  // Billboards ref collection for counter-rotation
  const billboardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Smooth RAF update loop
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
      const reducedMotion = prefersReducedMotionRef.current;
      const lerpSpeed = reducedMotion ? 1 : 0.065; // High-inertia cinema camera feel

      currentProgressRef.current +=
        (targetProgressRef.current - currentProgressRef.current) * lerpSpeed;

      const p = currentProgressRef.current;

      // 1. Progress Bar
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }

      // 2. 0% to 20%: Title fades & drifts up
      if (titleBoxRef.current) {
        const titleNorm = Math.min(1, p / 0.2);
        const titleOpacity = Math.max(0, 1 - titleNorm);
        const titleTranslateY = -titleNorm * 36;
        titleBoxRef.current.style.opacity = titleOpacity.toFixed(3);
        titleBoxRef.current.style.transform = `translateY(${titleTranslateY.toFixed(1)}px)`;
      }

      // "Scroll to begin" hint
      if (hintRef.current) {
        const hintNorm = Math.min(1, p / 0.04);
        hintRef.current.style.opacity = Math.max(0, 1 - hintNorm).toFixed(3);
      }

      // 3. Full-time continuous circulation across the ENTIRE scroll range (0% to 100%)
      // Ambient slow drift so the 3D room is always alive and turning even while paused
      if (!reducedMotion) {
        ambientAngleRef.current = (ambientAngleRef.current + 0.15) % 360;
      }
      // Expansive 600-degree continuous rotation driven smoothly all the way through the end
      const scrollRotation = p * 600;
      const tableRotation = scrollRotation + ambientAngleRef.current;

      if (tableRef.current) {
        tableRef.current.style.transform = `translate(-50%, -50%) rotateZ(${tableRotation.toFixed(2)}deg)`;
      }

      // 4. Dynamic 3-Axis Camera Crane: Large Cinematic Zoom in the Last Stage
      // Phase 1 (0% to 40%): Gentle framing (1.0x to 1.30x) giving ample time to view all attendees,
      // floating name tags, and the senior gold space at the head of the table.
      // Phase 2 (40% to 95%): "Last time" surging zoom that plunges in to a LARGE scale (up to 3.85x)
      // while rotation actively continues, creating a breathtaking cinematic fly-in into the dashboard.
      let cameraScale = 1.0;
      let cameraTilt = 60;

      if (p < 0.40) {
        const norm1 = p / 0.40;
        const ease1 = norm1 * norm1;
        cameraScale = 1.0 + ease1 * 0.30; // 1.0x -> 1.30x
        cameraTilt = 60 - ease1 * 4;      // 60deg -> 56deg
      } else {
        const norm2 = Math.min(1, (p - 0.40) / 0.55);
        // Smooth cubic ease for surging acceleration in the final push
        const ease2 = norm2 * norm2 * (3 - 2 * norm2);
        cameraScale = 1.30 + ease2 * 2.55; // 1.30x surging to 3.85x (large cinematic zoom at the end!)
        cameraTilt = 56 - ease2 * 14;      // 56deg -> 42deg
      }
      currentCameraTiltRef.current = cameraTilt;

      if (cameraRigRef.current) {
        cameraRigRef.current.style.transform = `rotateX(${cameraTilt.toFixed(2)}deg) scale3d(${cameraScale.toFixed(3)}, ${cameraScale.toFixed(3)}, ${cameraScale.toFixed(3)})`;
      }

      // Counter-rotate all avatar billboards on both axes so they ALWAYS face camera and stay upright
      const counterRotation = -tableRotation;
      const counterTilt = -cameraTilt;
      for (let i = 0; i < billboardsRef.current.length; i++) {
        const billboard = billboardsRef.current[i];
        if (billboard) {
          billboard.style.transform = `translate(-50%, 0) rotateZ(${counterRotation.toFixed(2)}deg) rotateX(${counterTilt.toFixed(2)}deg)`;
        }
      }

      // 5. 55% to 95%: Intro dissolves while presentation window fades in
      const dissolveNorm = Math.min(1, Math.max(0, (p - 0.55) / 0.4));
      const introOpacity = Math.max(0, 1 - dissolveNorm);
      const presOpacity = dissolveNorm;
      const presBlur = (1 - dissolveNorm) * 14;
      const presScale = 0.86 + dissolveNorm * 0.14;

      if (introLayerRef.current) {
        introLayerRef.current.style.opacity = introOpacity.toFixed(3);
        if (dissolveNorm >= 0.98) {
          introLayerRef.current.style.pointerEvents = 'none';
        } else {
          introLayerRef.current.style.pointerEvents = 'auto';
        }
      }

      if (presentationSlotRef.current) {
        presentationSlotRef.current.style.opacity = presOpacity.toFixed(3);
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

      // Completion check
      if (p >= 0.96 && !onCompleteCalledRef.current) {
        onCompleteCalledRef.current = true;
        setIsCompleted(true);
        onComplete?.();
      }

      rafIdRef.current = requestAnimationFrame(updateChoreography);
    };

    rafIdRef.current = requestAnimationFrame(updateChoreography);

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [onComplete, hasScrolled]);

  // Skip Button Handler
  const handleSkip = useCallback(() => {
    if (!trackRef.current) return;
    const targetScroll = trackRef.current.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: targetScroll,
      behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth',
    });

    targetProgressRef.current = 1;
    currentProgressRef.current = 1;

    if (!onCompleteCalledRef.current) {
      onCompleteCalledRef.current = true;
      setIsCompleted(true);
      onComplete?.();
    }
  }, [onComplete]);

  // Render header subtitle with meeting with names if available
  const displaySubtitle = useMemo(() => {
    if (seniorNames.length > 0 && seniorNames[0] !== DEMO_SENIOR) {
      return `Meeting with ${seniorNames.join(' & ')} • Executive QA Overview`;
    }
    return subtitle;
  }, [seniorNames, subtitle]);

  return (
    <div
      ref={trackRef}
      className={`${styles.scrollTrack} ${isDark ? styles.darkTheme : styles.lightTheme}`}
    >
      {/* Top Thin Progress Bar */}
      <div className={styles.progressBarTrack} aria-hidden="true">
        <div ref={progressBarRef} className={styles.progressBarFill} />
      </div>

      {/* Skip Intro Button */}
      {!isCompleted && (
        <button
          type="button"
          onClick={handleSkip}
          className={styles.skipButton}
          aria-label="Skip cinematic intro to presentation"
        >
          <span>Skip Intro</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      )}

      {/* Sticky 100vh Stage */}
      <div ref={stageRef} className={styles.stage}>
        {/* Presentation Window in Slot Beneath Intro */}
        <div
          ref={presentationSlotRef}
          className={styles.presentationSlot}
          style={{ opacity: 0, filter: 'blur(14px)', transform: 'scale(0.86)' }}
          aria-hidden={!isCompleted}
        >
          {children}
        </div>

        {/* Cinematic Intro 3D Overlay Layer */}
        <div
          ref={introLayerRef}
          className={`${styles.introLayer} ${isCompleted ? styles.introLayerCompleted : ''}`}
        >
          {/* Ceiling Soft Light */}
          <div className={styles.ceilingLight} aria-hidden="true" />
          {/* Volumetric Theater Light Rays */}
          <div className={styles.lightRays} aria-hidden="true" />
          {/* Floor Reflection Atmosphere */}
          <div className={styles.roomFloor} aria-hidden="true" />
          {/* 3D Perspective Floor Grid Plane */}
          <div className={styles.floorGridPlane} aria-hidden="true" />

          {/* Header Title: Project Name Only */}
          <div ref={titleBoxRef} className={styles.briefingHeader}>
            <h1 className={styles.briefingTitle}>{escapeHtml(projectName || title)}</h1>
          </div>

          {/* Dot Matrix Creative HUD in Left Bottom Corner */}
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
                        className={`${styles.dotMatrixLedDot} ${i < Math.min(6, Math.max(1, supportEmailsCount)) ? styles.ledAmber : ''}`}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.dotMatrixDigitBoxAmber}>
                  <span className={styles.dotMatrixDigit}>{String(supportEmailsCount).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
            <div className={styles.dotMatrixFooter}>
              <span className={styles.dotMatrixPulseDot} />
              <span className={styles.dotMatrixFooterText}>TELEMETRY SYNCHRONIZED</span>
            </div>
          </div>

          {/* 3D Viewport with Dynamic Camera Tilt & Optical Centering */}
          <div className={styles.viewport3D}>
            <div ref={cameraRigRef} className={styles.cameraRig}>
              {/* Spatial Floor Holographic Orbit Reticle */}
              <div className={styles.floorHoloReticle} aria-hidden="true">
                <div className={styles.floorReticleRingOuter}>
                  <span className={styles.floorReticleTickN}>000° N</span>
                  <span className={styles.floorReticleTickE}>090° E</span>
                  <span className={styles.floorReticleTickS}>180° S</span>
                  <span className={styles.floorReticleTickW}>270° W</span>
                </div>
                <div className={styles.floorReticleRingInner} />
              </div>

              {/* 3D Parallax Horizon Light Batons */}
              <div className={styles.roomHorizonColumns} aria-hidden="true">
                <div className={styles.lightColumn1} />
                <div className={styles.lightColumn2} />
                <div className={styles.lightColumn3} />
                <div className={styles.lightColumn4} />
              </div>

              {/* 1. Ground Cast Shadow (Z -85px) for Rectangular Boardroom Table */}
              <div
                className={styles.tableFloorShadow}
                style={{
                  ['--table-width' as any]: `${tableWidth}px`,
                  ['--table-length' as any]: `${tableLength}px`,
                }}
                aria-hidden="true"
              />

              {/* 2. Dual Architectural Pedestal Columns (Z -48px) */}
              <div
                className={styles.tablePedestals}
                style={{
                  ['--table-width' as any]: `${tableWidth}px`,
                  ['--table-length' as any]: `${tableLength}px`,
                }}
                aria-hidden="true"
              >
                <div className={styles.tablePedestalColumn} />
                <div className={styles.tablePedestalColumn} />
              </div>

              {/* 3. Rectangular Boardroom Tabletop & Assembly (Rotates smoothly around Z) */}
              <div
                ref={tableRef}
                className={styles.boardroomTable}
                style={{
                  ['--table-width' as any]: `${tableWidth}px`,
                  ['--table-length' as any]: `${tableLength}px`,
                }}
              >
                {/* Under-Rim Chamfer Layer (Z -16px) rotates with table assembly */}
                <div
                  className={styles.tableUnderRim}
                  style={{
                    ['--table-width' as any]: `${tableWidth}px`,
                    ['--table-length' as any]: `${tableLength}px`,
                  }}
                  aria-hidden="true"
                />

                {/* Central Conference Media Runner & Holographic Core */}
                <div className={styles.tableMediaRunner}>
                  <div className={styles.tableRunnerMic} />
                  <div className={styles.tableRunnerLine} />
                  <div className={styles.tableCenterEmblem}>
                    <div className={styles.tableCenterEmblemRing} />
                    <div className={styles.centerHoloBeam} />
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className={styles.tableRunnerLine} />
                  <div className={styles.tableRunnerMic} />
                </div>

                {/* Micro Holo-Desk Pads on Table Surface in front of each seat */}
                {seats.map(person => (
                  <div
                    key={`pad-${person.id}`}
                    className={`${styles.deskPad} ${person.isSenior ? styles.seniorDeskPad : ''} ${
                      person.padOrientation === 'vertical' ? styles.deskPadVertical : styles.deskPadHorizontal
                    }`}
                    style={{
                      transform: `translate(calc(-50% + ${person.padX}px), calc(-50% + ${person.padY}px)) translateZ(4px)`,
                    }}
                  >
                    <div className={styles.holoTablet}>
                      <div className={styles.holoTabletLine} />
                    </div>
                  </div>
                ))}

                {/* Seated Members & Executive Luxury Chairs around Table */}
                {seats.map((person, idx) => {
                  const reducedMotion = prefersReducedMotionRef.current;
                  const delay = reducedMotion ? 0 : person.staggerDelay;

                  return (
                    <div
                      key={person.id}
                      className={styles.seatAnchor}
                      style={{
                        transform: `translate3d(${person.x}px, ${person.y}px, 0px)`,
                      }}
                    >
                      {/* Billboard: counter-rotates and stands upright */}
                      <div
                        ref={el => {
                          billboardsRef.current[idx] = el;
                        }}
                        className={`${styles.avatarBillboard} ${person.isSenior ? styles.seniorBillboard : ''}`}
                        style={{
                          animationDelay: `${delay}s`,
                        }}
                      >
                        {/* Minimalist Floating Name Tag (Ultra-Clean & Refined) */}
                        <div className={styles.nameTagWrapper}>
                          <div
                            className={`${styles.nameTagPill} ${person.isSenior ? styles.seniorTagPill : ''}`}
                          >
                            <span
                              className={`${styles.nameTagStatusDot} ${person.isSenior ? styles.seniorTagStatusDot : ''}`}
                              style={!person.isSenior ? { backgroundColor: person.palette.glow, boxShadow: `0 0 5px ${person.palette.glow}` } : undefined}
                            />
                            <span
                              className={`${styles.nameTagText} ${person.isSenior ? styles.seniorTagText : ''}`}
                              style={{ animationDelay: `${delay + 0.1}s` }}
                            >
                              {person.name.replace(/\s*\([^)]*\)/g, '').trim() || person.name}
                            </span>
                          </div>
                        </div>

                        {/* Ultra-Premium SVG Avatar (Reference Design, Distinct Palette per Member) */}
                        <AvatarGraphic
                          initials={person.initials}
                          palette={person.palette}
                          isSenior={person.isSenior}
                          isDark={isDark}
                          uniqueKey={person.id}
                          size={person.isSenior ? (windowWidth <= 480 ? 46 : 58) : (windowWidth <= 480 ? 38 : 48)}
                        />
                      </div>
                    </div>
                  );
                })}
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
  );
};
