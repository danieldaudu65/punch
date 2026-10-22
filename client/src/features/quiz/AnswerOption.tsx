import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { Check } from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface AnswerOptionProps {
  index: number;
  text: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/**
 * A pressable answer card. Behaves as one radio button in the question's group.
 * The button itself is moved only by CSS (hover lift, press down), so Framer
 * animates the letter badge inside it and the two never fight over `transform`.
 */
export function AnswerOption({ index, text, selected, disabled, onSelect }: AnswerOptionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={clsx('answer', selected && 'answer--selected')}
      onClick={onSelect}
      disabled={disabled}
    >
      <motion.span
        className="answer__letter"
        aria-hidden="true"
        animate={selected && !reduceMotion ? { scale: [1, 1.22, 1] } : { scale: 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* The letter flips over to reveal a tick. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={selected ? 'tick' : 'letter'}
            className="answer__letter-face"
            initial={reduceMotion ? false : { rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            {selected ? <Check size={18} strokeWidth={3} /> : LETTERS[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <span className="answer__text">{text}</span>
      <span className="answer__key" aria-hidden="true">
        {index + 1}
      </span>
    </button>
  );
}
