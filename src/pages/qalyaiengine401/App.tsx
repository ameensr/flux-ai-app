import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { PandaSVG } from '@/components/LazyPanda/PandaSVG';
import { useLazyPanda } from '@/components/LazyPanda/useLazyPanda';

const ACCENT = '#6366F1';
const ACCENT_HOVER = '#4F46E5';
const PAGE_GRADIENT = 'linear-gradient(to bottom, #7C5CFF, #5A7DFF 55%, #2D8CFF)';

/** Same oversized Lazy Panda stage as the 404 page (no orbit dots — they read as stray marks on 401). */
function CenterLazyPanda() {
  const { ctx, send, eyeOffset, headRotation, isBlinking } = useLazyPanda(false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      send({ type: 'IDLE_TIMEOUT' });
      window.setTimeout(() => send({ type: 'WAKE_UP' }), 1600);
    }, 7500);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, send]);

  const handleClick = () => {
    setClickCount((prev) => prev + 1);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => setClickCount(0), 2000);

    if (clickCount === 2) {
      send({ type: 'LOGIN_SUCCESS' });
      setTimeout(() => send({ type: 'RESET' }), 1500);
    } else if (clickCount === 5) {
      send({ type: 'IDLE_TIMEOUT' });
      setTimeout(() => send({ type: 'WAKE_UP' }), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center justify-center select-none cursor-pointer"
      onClick={handleClick}
      aria-hidden="true"
      style={{ width: 'min(96vw, 720px)', height: 'min(78vh, 700px)' }}
    >
      <motion.div
        className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: '78%',
          height: '28%',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 45%, transparent 72%)',
          filter: 'blur(2px)',
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : { opacity: [0.55, 0.85, 0.55], scaleX: [1, 1.04, 1] }
        }
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
          style={{ width: `${48 + i * 18}%`, height: `${48 + i * 18}%` }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.15 }
              : {
                  opacity: [0.35, 0.05, 0.35],
                  scale: [1, 1.06 + i * 0.02, 1],
                }
          }
          transition={{
            duration: 4.5 + i * 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.55,
          }}
        />
      ))}

      <motion.div
        className="absolute z-20 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl rounded-bl-sm"
        style={{
          top: '2%',
          right: '4%',
          background: 'rgba(255,255,255,0.95)',
          color: ACCENT,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)',
        }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
        transition={{
          opacity: { delay: 0.5, duration: 0.4 },
          y: { delay: 0.5, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { delay: 0.5, duration: 0.4 },
        }}
      >
        <p className="text-sm sm:text-base font-semibold whitespace-nowrap leading-none">
          Hold up… no badge, no entry.
        </p>
        <span
          className="absolute -bottom-1.5 left-4 w-3 h-3 rotate-45"
          style={{ background: 'rgba(255,255,255,0.95)' }}
        />
      </motion.div>

      <motion.div
        className="relative z-10 flex items-end justify-center"
        style={{
          width: 'min(88vw, 580px)',
          height: 'min(88vw, 580px)',
          filter:
            'drop-shadow(0 16px 40px rgba(15,23,42,0.25)) drop-shadow(0 0 40px rgba(255,255,255,0.35))',
        }}
        animate={prefersReducedMotion ? undefined : { y: [0, -14, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <PandaSVG
          state={prefersReducedMotion ? 'IDLE' : ctx.state}
          eyeOffset={prefersReducedMotion ? { x: 0, y: 0 } : eyeOffset}
          headRotation={prefersReducedMotion ? 0 : headRotation}
          isBlinking={isBlinking}
          size={580}
        />
      </motion.div>

      <motion.p
        className="relative z-10 mt-1 text-[11px] sm:text-xs font-medium tracking-[0.22em] uppercase"
        style={{ color: 'rgba(255,255,255,0.75)' }}
        animate={prefersReducedMotion ? undefined : { opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        Lazy Panda · Gatekeeper
      </motion.p>
    </motion.div>
  );
}

/** Public 401 page — “0” is the layout center (same axis as panda + oval). */
export default function App() {
  const [scaleY, setScaleY] = useState(1);
  const zeroRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = 'qaly-401-inter-font';
    if (!document.getElementById(id)) {
      const preconnect1 = document.createElement('link');
      preconnect1.rel = 'preconnect';
      preconnect1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement('link');
      preconnect2.rel = 'preconnect';
      preconnect2.href = 'https://fonts.gstatic.com';
      preconnect2.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect2);

      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useLayoutEffect(() => {
    const update = () => {
      const zero = zeroRef.current;
      if (!zero) return;
      const height = zero.offsetHeight;
      if (height > 0) setScaleY(window.innerHeight / height);
    };

    update();
    const t1 = window.setTimeout(update, 50);
    const t2 = window.setTimeout(update, 200);
    window.addEventListener('resize', update);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className="qaly-401 w-full h-screen overflow-hidden flex flex-col relative"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: PAGE_GRADIENT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        color: '#FFFFFF',
      }}
    >
      <style>{`
        .qaly-401,
        .qaly-401 * {
          box-sizing: border-box;
        }
        .qaly-401 .tt-white,
        .qaly-401 .tt-white *,
        .light .qaly-401 .tt-white,
        .theme-light .qaly-401 .tt-white,
        .qaly-401 h1.tt-white {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-401 .tt-btn-accent {
          background-color: ${ACCENT} !important;
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-401 .tt-btn-accent:hover {
          background-color: ${ACCENT_HOVER} !important;
        }
        .qaly-401 .tt-401 {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-401 .tt-oval {
          background-color: #FFFFFF !important;
        }
      `}</style>

      {/*
        Center the scene on the digit "0" (same axis as panda).
        "4" and "1" hang off the sides so digit width never shifts the center.
      */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.8,
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="tt-401 relative font-black leading-none tracking-tighter"
            style={{
              fontSize: 'clamp(200px, 48vw, 800px)',
              transform: `scale(1.15, ${scaleY * 1.4})`,
              transformOrigin: 'center center',
            }}
          >
            {/* In-flow center digit */}
            <span ref={zeroRef} className="relative inline-block">
              0
              <span
                className="absolute top-0 right-full"
                aria-hidden="true"
                style={{ lineHeight: 1 }}
              >
                4
              </span>
              <span
                className="absolute top-0 left-full"
                aria-hidden="true"
                style={{ lineHeight: 1 }}
              >
                1
              </span>
            </span>

            {/* Oval locked to the zero’s box */}
            <div
              className="tt-oval absolute left-1/2 top-1/2 rounded-full h-[22vh] sm:h-[26vh] md:h-[50vh]"
              style={{
                width: 'clamp(120px, 20vw, 400px)',
                transform: `translate(-50%, -50%) scaleY(${Math.max(scaleY, 1)})`,
                transformOrigin: 'center',
              }}
            />
          </div>
        </div>
      </div>

      {/* Panda — same center axis as the "0" */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ marginTop: 'calc(-10vh - 8px)' }}
      >
        <div className="pointer-events-auto">
          <CenterLazyPanda />
        </div>
      </div>

      <nav className="relative z-20 flex flex-row items-center px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <Logo size="md" mono animate={false} />
      </nav>

      <div className="relative z-30 mt-auto pb-8 sm:pb-16 flex flex-col items-center text-center px-4">
        <div
          className="mb-3 sm:mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em]"
          style={{
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.28)',
          }}
        >
          <ShieldOff className="w-3.5 h-3.5" />
          Access denied
        </div>
        <h1 className="tt-white text-lg sm:text-xl md:text-2xl font-medium mb-3 sm:mb-4">
          You Are Unauthorized
        </h1>
        <a
          href="/"
          className="tt-btn-accent inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold text-sm sm:text-base hover:scale-105 hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Home
        </a>
      </div>
    </div>
  );
}
