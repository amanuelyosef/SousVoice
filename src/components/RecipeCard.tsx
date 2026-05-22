/**
 * RecipeCard — The "Antigravity" Floating Step Card
 *
 * HCI Justifications:
 * 1. "One step at a time" reduces cognitive load (Miller's Law).
 * 2. Spring physics create a weightless, playful feel that makes
 *    the interface feel responsive and alive.
 * 3. Drag interaction provides haptic-like feedback, increasing
 *    perceived directness (Direct Manipulation principle, Shneiderman).
 * 4. AnimatePresence ensures smooth enter/exit transitions,
 *    maintaining object constancy (Gestalt continuity).
 */
import { memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useAccessibilityStore } from '../stores/accessibilityStore';
import type { RecipeStep } from '../types';

interface RecipeCardProps {
  step: RecipeStep;
  stepIndex: number;
  totalSteps: number;
  direction: number; // 1 = forward, -1 = backward
  onNext: () => void;
  onPrev: () => void;
  onStartTimer: () => void;
}

/* HCI: Spring config tuned for a "low gravity" / "weightless" feel.
   Low stiffness + moderate damping = slow, floaty motion. */
const springTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
  mass: 1.5,
};

/* Variants for enter/exit animations based on navigation direction. */
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 400 : -400,
    y: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.85,
    rotateZ: direction > 0 ? 5 : -5,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    rotateZ: 0,
    transition: springTransition,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -400 : 400,
    y: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.85,
    rotateZ: direction > 0 ? -5 : 5,
    transition: springTransition,
  }),
};

const RecipeCard = memo(function RecipeCard({
  step,
  stepIndex,
  totalSteps,
  direction,
  onNext,
  onPrev,
  onStartTimer,
}: RecipeCardProps) {
  const { largeText } = useAccessibilityStore(useShallow((state) => ({ largeText: state.largeText })));
  const x = useMotionValue(0);

  // Performance: Compute border and shadow using Framer Motion transforms directly
  // bypassing continuous React renders during drag events.
  const cardBorderColor = useTransform(
    x,
    [-80, -40, 0, 40, 80],
    ['var(--border-active)', 'var(--border-active)', 'var(--border-subtle)', 'var(--border-active)', 'var(--border-active)']
  );

  /**
   * HCI: Drag-to-navigate provides a gestural shortcut.
   * Threshold of 80px prevents accidental navigation (Error Prevention).
   */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80 && stepIndex > 0) {
      onPrev();
    } else if (info.offset.x < -80 && stepIndex < totalSteps - 1) {
      onNext();
    }
  };

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: '420px' }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step.id}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x }}
          whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
          className="w-full max-w-2xl cursor-grab active:cursor-grabbing select-none"
          role="region"
          aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
          aria-live="polite"
          tabIndex={0}
        >
          {/* ── Glassmorphic Card ── */}
          <motion.div
            className="relative rounded-3xl p-8 md:p-10 backdrop-blur-xl border will-change-transform"
            style={{
              background: 'var(--bg-glass)',
              borderColor: cardBorderColor,
              boxShadow: 'var(--shadow-float)',
            }}
          >
            {/* ── Ambient glow effect behind card ── */}
            <div
              className="absolute -inset-1 rounded-3xl -z-10 blur-2xl opacity-30"
              style={{ background: `linear-gradient(135deg, var(--accent-primary), transparent)` }}
            />

            {/* ── Step Counter ── */}
            <div className="flex items-center justify-between mb-6">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                Step {stepIndex + 1} / {totalSteps}
              </span>

              {step.duration && (
                <span
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ⏱️ {step.duration}
                </span>
              )}
            </div>

            {/* ── Progress Bar ── */}
            {/* HCI: Visual progress indicator reduces uncertainty (Norman's Gulf of Evaluation). */}
            <div
              className="w-full h-1.5 rounded-full mb-6 overflow-hidden"
              style={{ background: 'var(--bg-secondary)' }}
              role="progressbar"
              aria-valuenow={stepIndex + 1}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Recipe progress: step ${stepIndex + 1} of ${totalSteps}`}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--accent-primary)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              />
            </div>

            {/* ── Instruction Text ── */}
            <p
              className="leading-relaxed mb-4 font-medium"
              style={{
                color: 'var(--text-primary)',
                fontSize: largeText ? '1.3rem' : '1.1rem',
                lineHeight: 1.7,
              }}
            >
              {step.instruction}
            </p>

            {/* ── Chef's Tip ── */}
            {step.tip && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl mt-4"
                style={{
                  background: 'var(--bg-secondary)',
                  borderLeft: '3px solid var(--accent-primary)',
                }}
                role="note"
                aria-label="Chef's tip"
              >
                <span className="text-xl flex-shrink-0">💡</span>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <strong style={{ color: 'var(--accent-primary)' }}>Pro Tip:</strong> {step.tip}
                </p>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-between mt-8 gap-3">
              <button
                onClick={onPrev}
                disabled={stepIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
                aria-label="Previous step"
                id="btn-prev-step"
              >
                ← Back
              </button>

              {step.timerSeconds && (
                <button
                  onClick={onStartTimer}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: 'transparent',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary)',
                  }}
                  aria-label={`Start timer for ${step.duration}`}
                  id="btn-start-timer"
                >
                  ⏱️ Timer
                </button>
              )}

              <button
                onClick={onNext}
                disabled={stepIndex === totalSteps - 1}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
                aria-label="Next step"
                id="btn-next-step"
              >
                Next →
              </button>
            </div>

            {/* ── Drag Hint ── */}
            <p
              className="text-center text-xs mt-5 opacity-50"
              style={{ color: 'var(--text-muted)' }}
              aria-hidden="true"
            >
              ← Swipe or drag to navigate →
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

export default RecipeCard;
