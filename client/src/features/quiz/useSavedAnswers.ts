import { useCallback, useEffect, useState } from 'react';

type AnswerMap = Record<string, number>;

const storageKey = (attemptId: string) => `pn-answers:${attemptId}`;

function readSaved(attemptId: string): AnswerMap {
  try {
    const raw = sessionStorage.getItem(storageKey(attemptId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as AnswerMap) : {};
  } catch {
    // Private browsing or blocked storage: start empty, the quiz still works.
    return {};
  }
}

/**
 * The student's picks for one attempt, mirrored into sessionStorage.
 * After a refresh the server resumes the same attempt, and this restores
 * the answers that went with it. The component using it is keyed by
 * attemptId, so one hook instance only ever serves one attempt.
 */
export function useSavedAnswers(attemptId: string) {
  const [answers, setAnswers] = useState<AnswerMap>(() => readSaved(attemptId));

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
    } catch {
      // Ignore: saving is a convenience, not a requirement.
    }
  }, [attemptId, answers]);

  const choose = useCallback((questionKey: string, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionKey]: optionIndex }));
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey(attemptId));
    } catch {
      // Nothing to clean up.
    }
  }, [attemptId]);

  return { answers, choose, clear };
}
