// 2.5D SVG Visual Previews for Workshop Props, Containers, and Melee Weapons

const common = 'viewBox="0 0 64 64" width="100%" height="100%" fill="none"';

export function getWorkshopWeaponPreview(assetId: string): string | null {
  switch (assetId) {
    case 'workshop_race_car':
      return `<svg ${common}>
        <path d="M8 38 L18 30 L44 30 L54 36 L56 42 L8 42 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5"/>
        <rect x="46" y="24" width="8" height="4" rx="1" fill="#1e293b"/>
        <circle cx="18" cy="42" r="5" fill="#0f172a"/><circle cx="18" cy="42" r="2" fill="#fbbf24"/>
        <circle cx="46" cy="42" r="5" fill="#0f172a"/><circle cx="46" cy="42" r="2" fill="#fbbf24"/>
      </svg>`;

    case 'workshop_barrel':
      return `<svg ${common}>
        <ellipse cx="32" cy="18" rx="14" ry="5" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
        <path d="M18 18 L18 46 Q32 54 46 46 L46 18 Z" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
        <line x1="18" y1="28" x2="46" y2="28" stroke="#0369a1" stroke-width="2"/>
        <line x1="18" y1="36" x2="46" y2="36" stroke="#0369a1" stroke-width="2"/>
      </svg>`;

    case 'workshop_box':
      return `<svg ${common}>
        <rect x="16" y="16" width="32" height="32" rx="2" fill="#d97706" stroke="#78350f" stroke-width="2"/>
        <line x1="16" y1="16" x2="48" y2="48" stroke="#78350f" stroke-width="2"/>
        <line x1="48" y1="16" x2="16" y2="48" stroke="#78350f" stroke-width="2"/>
        <rect x="18" y="18" width="28" height="28" fill="none" stroke="#b45309" stroke-width="1"/>
      </svg>`;

    case 'workshop_machine':
      return `<svg ${common}>
        <rect x="14" y="46" width="36" height="8" rx="2" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
        <rect x="20" y="16" width="10" height="30" fill="#475569"/>
        <rect x="16" y="14" width="28" height="12" rx="2" fill="#0284c7"/>
        <rect x="36" y="26" width="4" height="14" fill="#94a3b8"/>
        <circle cx="23" cy="20" r="3" fill="#f8fafc"/>
        <line x1="38" y1="18" x2="48" y2="12" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
      </svg>`;

    case 'workshop_box_large':
      return `<svg ${common}>
        <rect x="12" y="14" width="40" height="38" rx="2" fill="#92400e" stroke="#78350f" stroke-width="2"/>
        <rect x="12" y="14" width="6" height="38" fill="#475569"/>
        <rect x="46" y="14" width="6" height="38" fill="#475569"/>
        <line x1="18" y1="14" x2="46" y2="52" stroke="#78350f" stroke-width="2"/>
        <line x1="46" y1="14" x2="18" y2="52" stroke="#78350f" stroke-width="2"/>
        <rect x="18" y="20" width="28" height="26" fill="none" stroke="#b45309" stroke-width="1.5"/>
      </svg>`;

    case 'workshop_box_cardboard':
      return `<svg ${common}>
        <rect x="14" y="18" width="36" height="32" rx="2" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
        <rect x="30" y="18" width="4" height="32" fill="#78350f" opacity="0.6"/>
        <line x1="14" y1="28" x2="50" y2="28" stroke="#b45309" stroke-width="1" stroke-dasharray="2 2"/>
        <ellipse cx="20" cy="34" rx="2.5" ry="1.5" fill="#451a03"/>
        <ellipse cx="44" cy="34" rx="2.5" ry="1.5" fill="#451a03"/>
      </svg>`;

    case 'workshop_chest':
      return `<svg ${common}>
        <rect x="14" y="28" width="36" height="22" rx="2" fill="#78350f" stroke="#451a03" stroke-width="2"/>
        <path d="M14 28 Q32 14 50 28 Z" fill="#92400e" stroke="#451a03" stroke-width="2"/>
        <rect x="20" y="22" width="4" height="28" fill="#f59e0b"/>
        <rect x="40" y="22" width="4" height="28" fill="#f59e0b"/>
        <circle cx="32" cy="34" r="3" fill="#f59e0b"/>
      </svg>`;

    // === MELEE WEAPONS ===
    case 'prop_sword_steel':
      return `<svg ${common}>
        <polygon points="30,8 34,8 33,38 31,38" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2"/>
        <rect x="22" y="38" width="20" height="3.5" rx="1.5" fill="#f59e0b"/>
        <rect x="30.5" y="41.5" width="3" height="8" rx="1" fill="#78350f"/>
        <circle cx="32" cy="51.5" r="2.5" fill="#f59e0b"/>
        <line x1="32" y1="10" x2="32" y2="36" stroke="#94a3b8" stroke-width="1"/>
      </svg>`;

    case 'prop_sword_curved':
      return `<svg ${common}>
        <path d="M22 42 Q30 30 46 12 Q38 24 24 44 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
        <path d="M18 46 Q24 40 26 44" stroke="#f59e0b" stroke-width="3" fill="none"/>
        <line x1="18" y1="46" x2="14" y2="52" stroke="#78350f" stroke-width="3"/>
      </svg>`;

    case 'prop_sword_wood':
      return `<svg ${common}>
        <rect x="30" y="10" width="4" height="30" rx="1.5" fill="#b45309" stroke="#78350f" stroke-width="1.2"/>
        <rect x="23" y="40" width="18" height="3" rx="1.5" fill="#92400e"/>
        <rect x="30.5" y="43" width="3" height="8" fill="#78350f"/>
        <circle cx="32" cy="53" r="2.5" fill="#92400e"/>
      </svg>`;

    case 'prop_sword_shield':
      return `<svg ${common}>
        <line x1="14" y1="12" x2="48" y2="52" stroke="#cbd5e1" stroke-width="3"/>
        <rect x="42" y="44" width="8" height="3" fill="#f59e0b" transform="rotate(45 46 45)"/>
        <path d="M22 18 L42 18 L42 34 Q42 46 32 52 Q22 46 22 34 Z" fill="#1e40af" stroke="#f59e0b" stroke-width="2"/>
        <line x1="22" y1="32" x2="42" y2="32" stroke="#f59e0b" stroke-width="2"/>
        <line x1="32" y1="18" x2="32" y2="48" stroke="#f59e0b" stroke-width="2"/>
      </svg>`;

    case 'prop_axe_diamond':
      return `<svg ${common}>
        <line x1="16" y1="52" x2="44" y2="16" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
        <polygon points="40,14 54,20 46,28 34,22" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
        <polygon points="36,18 42,8 30,14 34,22" fill="#22d3ee" stroke="#0891b2" stroke-width="1.5"/>
        <line x1="20" y1="46" x2="24" y2="42" stroke="#f59e0b" stroke-width="2"/>
      </svg>`;

    case 'prop_axe_gold':
      return `<svg ${common}>
        <line x1="16" y1="52" x2="44" y2="16" stroke="#451a03" stroke-width="3.5" stroke-linecap="round"/>
        <polygon points="40,14 54,20 46,28 34,22" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
        <polygon points="36,18 42,8 30,14 34,22" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>
        <line x1="20" y1="46" x2="24" y2="42" stroke="#ef4444" stroke-width="2"/>
      </svg>`;

    default:
      return null;
  }
}
