import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { PandaSVG } from '@/components/LazyPanda/PandaSVG';
import { useLazyPanda } from '@/components/LazyPanda/useLazyPanda';

const ACCENT = '#6366F1';
const ACCENT_HOVER = '#4F46E5';
const PAGE_GRADIENT = 'linear-gradient(to bottom, #7C5CFF, #5A7DFF 55%, #2D8CFF)';

/** Oversized Lazy Panda hero with phone, stage rings, and playful motion. */
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
      send({ type: 'LOGIN_SUCCESS' });
      window.setTimeout(() => send({ type: 'RESET' }), 1800);
    }, 7000);
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

  const orbitDots = [
    { angle: 0, delay: 0, size: 10 },
    { angle: 72, delay: 0.4, size: 7 },
    { angle: 144, delay: 0.8, size: 12 },
    { angle: 216, delay: 1.2, size: 8 },
    { angle: 288, delay: 1.6, size: 9 },
  ];

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
      {/* Soft luminous stage disc */}
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

      {/* Concentric pulse rings */}
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

      {/* Orbiting spark dots */}
      {!prefersReducedMotion &&
        orbitDots.map((dot, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[48%] rounded-full bg-white"
            style={{
              width: dot.size,
              height: dot.size,
              marginLeft: -dot.size / 2,
              marginTop: -dot.size / 2,
              boxShadow: '0 0 12px rgba(255,255,255,0.8)',
            }}
            animate={{ rotate: [dot.angle, dot.angle + 360] }}
            transition={{
              duration: 14 + i * 2,
              repeat: Infinity,
              ease: 'linear',
              delay: dot.delay,
            }}
          >
            <span
              className="absolute block rounded-full bg-white"
              style={{
                width: dot.size,
                height: dot.size,
                transform: `translateX(${150 + i * 24}px)`,
                opacity: 0.85,
              }}
            />
          </motion.span>
        ))}

      {/* Speech bubble */}
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
          Lost? I was napping…
        </p>
        <span
          className="absolute -bottom-1.5 left-4 w-3 h-3 rotate-45"
          style={{ background: 'rgba(255,255,255,0.95)' }}
        />
      </motion.div>

      {/* Hero panda */}
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
        Lazy Panda · Guide
      </motion.p>
    </motion.div>
  );
}

export default function App() {
  const [scaleY, setScaleY] = useState(1);
  const text404Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = 'qaly-404-inter-font';
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

  useEffect(() => {
    const updateScale = () => {
      const el = text404Ref.current;
      if (!el) return;
      const height = el.offsetHeight;
      if (height > 0) {
        setScaleY(window.innerHeight / height);
      }
    };

    updateScale();
    const t = window.setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div
      className="qaly-404 w-full h-screen overflow-hidden flex flex-col relative"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: PAGE_GRADIENT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        color: '#FFFFFF',
      }}
    >
      <style>{`
        .qaly-404,
        .qaly-404 * {
          box-sizing: border-box;
        }
        .qaly-404 .tt-white,
        .qaly-404 .tt-white *,
        .light .qaly-404 .tt-white,
        .theme-light .qaly-404 .tt-white,
        .qaly-404 h1.tt-white {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-404 .tt-btn-accent {
          background-color: ${ACCENT} !important;
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-404 .tt-btn-accent:hover {
          background-color: ${ACCENT_HOVER} !important;
        }
        .qaly-404 .tt-404 {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        .qaly-404 .tt-oval {
          background-color: #FFFFFF !important;
        }
      `}</style>

      {/* Background "404" + oval */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.8,
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            ref={text404Ref}
            className="tt-404 font-black leading-none tracking-tighter whitespace-nowrap"
            style={{
              fontSize: 'clamp(200px, 48vw, 800px)',
              transform: `scale(1.15, ${scaleY * 1.4})`,
            }}
          >
            404
          </span>
          <div
            className="tt-oval absolute rounded-full h-[22vh] sm:h-[26vh] md:h-[50vh]"
            style={{
              width: 'clamp(120px, 20vw, 400px)',
              transform: `scaleY(${scaleY})`,
              transformOrigin: 'center',
            }}
          />
        </div>
      </div>

      {/* Center Lazy Panda */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        style={{ marginTop: 'calc(-10vh - 8px)' }}
      >
        <div className="pointer-events-auto">
          <CenterLazyPanda />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex flex-row items-center px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <Logo size="md" mono animate={false} />
      </nav>

      {/* Bottom content */}
      <div className="relative z-30 mt-auto pb-8 sm:pb-16 flex flex-col items-center text-center px-4">
        <h1 className="tt-white text-lg sm:text-xl md:text-2xl font-medium mb-3 sm:mb-4">
          Oops, something went wrong!
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
