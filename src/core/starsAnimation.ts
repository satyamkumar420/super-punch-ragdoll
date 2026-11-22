import { playStarSound } from '../audio';

export interface StarsSequenceOptions {
  delayBeforeFirst?: number;
  intervalBetweenStars?: number;
  onStarPopped?: (index: number) => void;
  onComplete?: () => void;
}

let activeTimeoutIds: number[] = [];

/**
 * Cleanly cancels running star animation timers and resets all star badges to initial hidden state.
 */
export function resetStarsPodium(): void {
  if (typeof window === 'undefined') return;

  activeTimeoutIds.forEach((id) => window.clearTimeout(id));
  activeTimeoutIds = [];

  const badges = document.querySelectorAll<HTMLElement>('.stars-podium .star-badge');
  badges.forEach((badge) => {
    badge.classList.remove('is-popped', 'is-pulsing');
  });
}

/**
 * Plays the sequential star appearance animation with synchronized rising pitch star SFX.
 * Star 1 (Left) -> Star 2 (Center, Big) -> Star 3 (Right)
 */
export function playStarsSequenceAnimation(options?: StarsSequenceOptions): void {
  if (typeof window === 'undefined') return;

  resetStarsPodium();

  const star1 = document.getElementById('star-badge-1');
  const star2 = document.getElementById('star-badge-2');
  const star3 = document.getElementById('star-badge-3');

  const stars = [star1, star2, star3].filter(Boolean) as HTMLElement[];
  if (stars.length === 0) return;

  const delayBeforeFirst = options?.delayBeforeFirst ?? 220;
  const interval = options?.intervalBetweenStars ?? 360;

  stars.forEach((starEl, idx) => {
    const triggerTime = delayBeforeFirst + idx * interval;

    const timeoutId = window.setTimeout(() => {
      // Trigger pop-in bounce animation
      starEl.classList.remove('is-popped');
      void starEl.offsetWidth; // Force reflow to restart CSS keyframe
      starEl.classList.add('is-popped');

      // Play matching chime sound
      playStarSound(idx);

      options?.onStarPopped?.(idx);

      // When the last star lands, activate center star pulse and notify completion
      if (idx === stars.length - 1) {
        const pulseTimeout = window.setTimeout(() => {
          star2?.classList.add('is-pulsing');
          options?.onComplete?.();
        }, 420);
        activeTimeoutIds.push(pulseTimeout);
      }
    }, triggerTime);

    activeTimeoutIds.push(timeoutId);
  });
}
