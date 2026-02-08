/**
 * AnimatedLogo – SPB SecureDrive brand with staggered entrance animation.
 *
 * compact  = sidebar (small, white text, single-line)
 * full     = auth pages (larger, slate-900 text)
 *
 * Uses framer-motion. Respects prefers-reduced-motion.
 */

import { motion, useReducedMotion } from 'framer-motion';

interface AnimatedLogoProps {
  compact?: boolean;
  className?: string;
}

const SPB_LETTERS = ['S', 'P', 'B'];

const AnimatedLogo = ({ compact = false, className = '' }: AnimatedLogoProps) => {
  const shouldReduce = useReducedMotion();

  // When reduced-motion is preferred, render static immediately
  const letterVariants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' },
        }),
      };

  const driveVariants = shouldReduce
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { delay: 0.3, duration: 0.4, ease: 'easeOut' },
        },
      };

  if (compact) {
    // ── Sidebar compact layout ──
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Icon square */}
        <div className="w-9 h-9 bg-gradient-to-br from-[#10854a] to-[#0d4d2e] rounded-lg flex items-center justify-center shadow-lg shadow-brand-dark/40">
          <motion.span
            className="text-white text-lg font-bold"
            initial="hidden"
            animate="visible"
            variants={letterVariants}
            custom={0}
          >
            S
          </motion.span>
        </div>

        {/* Brand text */}
        <span className="font-semibold text-[17px] text-white tracking-tight flex items-baseline gap-[3px]">
          {SPB_LETTERS.map((letter, i) => (
            <motion.span
              key={letter}
              initial="hidden"
              animate="visible"
              variants={letterVariants}
              custom={i}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            initial="hidden"
            animate="visible"
            variants={driveVariants}
            className="inline-block ml-[2px]"
          >
            SecureDrive
          </motion.span>
        </span>
      </div>
    );
  }

  // ── Full / Auth page layout ──
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 bg-brand rounded-2xl mb-8 shadow-xl shadow-brand/25">
        <motion.span
          className="text-white text-2xl font-bold"
          initial="hidden"
          animate="visible"
          variants={letterVariants}
          custom={0}
        >
          S
        </motion.span>
      </div>

      {/* Brand heading */}
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-2 flex items-baseline gap-[3px]">
        {SPB_LETTERS.map((letter, i) => (
          <motion.span
            key={letter}
            initial="hidden"
            animate="visible"
            variants={letterVariants}
            custom={i}
            className="inline-block"
          >
            {letter}
          </motion.span>
        ))}
        <motion.span
          initial="hidden"
          animate="visible"
          variants={driveVariants}
          className="inline-block ml-[2px]"
        >
          SecureDrive
        </motion.span>
      </h1>
    </div>
  );
};

export default AnimatedLogo;
