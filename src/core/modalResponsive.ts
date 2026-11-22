/**
 * Responsive modal scaling helper for mobile, tablet, and short landscape screens.
 */
export function calculateModalScale(vw: number, vh: number, baseW = 340, baseH = 370): number {
  if (vw <= 0 || vh <= 0) return 1.0;
  const safeW = vw * 0.92;
  const safeH = vh * 0.88;

  const scaleW = safeW / baseW;
  const scaleH = safeH / baseH;
  const computed = Math.min(1.0, Math.min(scaleW, scaleH));

  return Math.max(0.42, Math.min(1.15, computed));
}

/**
 * Updates the `--modal-scale` CSS custom property on modal and chamber cards
 * based on current window dimensions.
 */
export function updateModalResponsiveScale(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const modalCards = document.querySelectorAll<HTMLElement>('.modal-card, .chamber-card');
  if (modalCards.length === 0) return;

  const vw = window.innerWidth || document.documentElement.clientWidth || 800;
  const vh = window.innerHeight || document.documentElement.clientHeight || 600;
  const finalScale = calculateModalScale(vw, vh);

  modalCards.forEach((card) => {
    card.style.setProperty('--modal-scale', finalScale.toFixed(3));
  });
}
