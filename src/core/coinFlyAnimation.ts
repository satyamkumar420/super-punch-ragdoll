export interface CoinCollectionOptions {
  fromElement: HTMLElement;
  toElement: HTMLElement;
  coinCount?: number;
  onCoinLand?: (index: number, total: number) => void;
  onComplete?: () => void;
}

/**
 * Spawns an arcade-style cluster of flying gold coins that burst outwards
 * and arc smoothly to the target coin counter.
 */
export function triggerCoinCollectionAnimation(options: CoinCollectionOptions): Promise<void> {
  return new Promise((resolve) => {
    const { fromElement, toElement, coinCount = 10, onCoinLand, onComplete } = options;

    if (!fromElement || !toElement || typeof window === 'undefined') {
      onComplete?.();
      resolve();
      return;
    }

    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();

    if (fromRect.width === 0 && fromRect.height === 0) {
      onComplete?.();
      resolve();
      return;
    }

    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    const coinSvgTemplate = `
      <svg viewBox="0 0 32 32" width="100%" height="100%">
        <defs>
          <linearGradient id="cfRim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fde047" />
            <stop offset="50%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#ca8a04" />
          </linearGradient>
          <linearGradient id="cfFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="40%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#eab308" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="#b45309" />
        <circle cx="16" cy="15" r="13" fill="url(#cfRim)" stroke="#b45309" stroke-width="1" />
        <circle cx="16" cy="15" r="10" fill="url(#cfFace)" stroke="#ca8a04" stroke-width="0.7" />
        <path d="M16 9.5 L17.5 13 L21 13.3 L18.3 15.5 L19.1 19 L16 17.1 L12.9 19 L13.7 15.5 L11 13.3 L14.5 13 Z" fill="#fef9c3" stroke="#d97706" stroke-width="0.6" stroke-linejoin="round" />
      </svg>
    `;

    let landedCount = 0;
    const total = Math.max(1, coinCount);

    for (let i = 0; i < total; i++) {
      const delay = i * 45;

      window.setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'flying-coin';
        coin.innerHTML = coinSvgTemplate;
        document.body.appendChild(coin);

        const coinHalf = 14;
        const initX = startX - coinHalf;
        const initY = startY - coinHalf;

        const angle = Math.random() * Math.PI * 2;
        const scatterDist = 30 + Math.random() * 45;
        const scatterX = Math.cos(angle) * scatterDist;
        const scatterY = Math.sin(angle) * scatterDist;

        const targetDeltaX = endX - startX;
        const targetDeltaY = endY - startY;

        if (typeof coin.animate === 'function') {
          const anim = coin.animate(
            [
              {
                transform: `translate(${initX}px, ${initY}px) scale(0.2) rotate(0deg)`,
                opacity: 0,
              },
              {
                transform: `translate(${initX + scatterX}px, ${initY + scatterY}px) scale(1.15) rotate(${Math.floor(Math.random() * 60 - 30)}deg)`,
                opacity: 1,
                offset: 0.22,
              },
              {
                transform: `translate(${initX + targetDeltaX}px, ${initY + targetDeltaY}px) scale(0.7) rotate(720deg)`,
                opacity: 0.95,
                offset: 1.0,
              },
            ],
            {
              duration: 550,
              easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              fill: 'forwards',
            }
          );

          anim.onfinish = () => {
            coin.remove();
            landedCount++;
            onCoinLand?.(i, total);
            if (landedCount >= total) {
              onComplete?.();
              resolve();
            }
          };
        } else {
          coin.remove();
          landedCount++;
          onCoinLand?.(i, total);
          if (landedCount >= total) {
            onComplete?.();
            resolve();
          }
        }
      }, delay);
    }
  });
}
