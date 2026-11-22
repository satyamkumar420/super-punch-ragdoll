// 2.5D SVG Visual Previews for Nature Props, Trees, and Terrain Tiles

const common = 'viewBox="0 0 64 64" width="100%" height="100%" fill="none"';

export function getNatureTerrainPreview(assetId: string): string | null {
  switch (assetId) {
    case 'quarry_rock_large':
      return `<svg ${common}>
        <polygon points="14,38 24,18 42,16 52,32 46,48 20,48" fill="#64748b" stroke="#475569" stroke-width="2"/>
        <polygon points="24,18 36,28 28,40 14,38" fill="#94a3b8"/>
        <polygon points="36,28 42,16 52,32 40,38" fill="#475569"/>
      </svg>`;

    case 'quarry_cliff_rock':
      return `<svg ${common}>
        <polygon points="18,12 36,10 46,26 44,52 14,52 16,30" fill="#475569" stroke="#334155" stroke-width="2"/>
        <polygon points="18,12 30,24 24,42 16,30" fill="#64748b"/>
        <polygon points="30,24 36,10 46,26 38,36" fill="#334155"/>
      </svg>`;

    case 'nature_tree_oak':
      return `<svg ${common}>
        <path d="M28 36 L26 56 L38 56 L36 36 Z" fill="#78350f"/>
        <path d="M26 52 L22 56 M38 52 L42 56" stroke="#451a03" stroke-width="2"/>
        <circle cx="32" cy="22" r="14" fill="#15803d"/>
        <circle cx="23" cy="28" r="10" fill="#16a34a"/>
        <circle cx="41" cy="28" r="10" fill="#22c55e"/>
        <circle cx="32" cy="20" r="9" fill="#86efac" opacity="0.4"/>
      </svg>`;

    case 'nature_tree_pine':
      return `<svg ${common}>
        <rect x="29" y="46" width="6" height="10" fill="#78350f" rx="1"/>
        <polygon points="32,8 46,24 18,24" fill="#047857"/>
        <polygon points="32,18 49,35 15,35" fill="#065f46"/>
        <polygon points="32,28 52,48 12,48" fill="#064e3b"/>
      </svg>`;

    case 'nature_tree_default':
      return `<svg ${common}>
        <rect x="29" y="38" width="6" height="18" fill="#854d0e" rx="1"/>
        <ellipse cx="32" cy="24" rx="18" ry="16" fill="#16a34a"/>
        <ellipse cx="32" cy="22" rx="14" ry="12" fill="#22c55e"/>
        <ellipse cx="28" cy="18" rx="8" ry="6" fill="#86efac" opacity="0.5"/>
      </svg>`;

    case 'nature_tree_palm':
      return `<svg ${common}>
        <path d="M30 58 Q31 38 32 20" stroke="#92400e" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M32 20 Q20 12 10 20" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M32 20 Q44 12 54 20" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M32 20 Q24 6 22 2" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M32 20 Q40 6 42 2" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="31" cy="22" r="2.5" fill="#78350f"/>
        <circle cx="34" cy="22" r="2.5" fill="#78350f"/>
      </svg>`;

    case 'nature_tree_palm_bend':
      return `<svg ${common}>
        <path d="M18 58 Q24 38 40 24" stroke="#92400e" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M40 24 Q52 14 58 26" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M40 24 Q48 10 44 4" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M40 24 Q32 12 24 16" stroke="#16a34a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M40 24 Q46 32 54 36" stroke="#15803d" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="39" cy="26" r="2.5" fill="#78350f"/>
      </svg>`;

    case 'nature_fence':
      return `<svg ${common}>
        <rect x="14" y="24" width="5" height="28" fill="#b45309" rx="1"/>
        <rect x="45" y="24" width="5" height="28" fill="#b45309" rx="1"/>
        <rect x="10" y="30" width="44" height="4" fill="#d97706" rx="1"/>
        <rect x="10" y="42" width="44" height="4" fill="#d97706" rx="1"/>
      </svg>`;

    case 'nature_campfire':
      return `<svg ${common}>
        <ellipse cx="32" cy="46" rx="20" ry="8" fill="#475569" stroke="#334155" stroke-width="1.5"/>
        <line x1="20" y1="46" x2="44" y2="40" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
        <line x1="20" y1="40" x2="44" y2="46" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>
        <path d="M32 16 Q38 30 40 40 Q32 46 24 40 Q26 30 32 16 Z" fill="#f97316"/>
        <path d="M32 24 Q36 32 37 40 Q32 44 27 40 Q28 32 32 24 Z" fill="#facc15"/>
      </svg>`;

    case 'nature_bench':
      return `<svg ${common}>
        <path d="M16 38 L14 54 M22 40 L24 54 M42 40 L40 54 M48 38 L50 54" stroke="#1e293b" stroke-width="2.5"/>
        <rect x="10" y="22" width="44" height="4" fill="#b45309" rx="1"/>
        <rect x="10" y="28" width="44" height="4" fill="#b45309" rx="1"/>
        <rect x="10" y="36" width="44" height="5" fill="#d97706" rx="1"/>
      </svg>`;

    case 'nature_grass_tile':
      return `<svg ${common}>
        <polygon points="32,16 52,27 32,38 12,27" fill="#22c55e" stroke="#16a34a" stroke-width="1.5"/>
        <polygon points="32,38 52,27 52,47 32,58" fill="#92400e"/>
        <polygon points="32,38 12,27 12,47 32,58" fill="#78350f"/>
        <path d="M28 24 L27 18 L31 22 M34 22 L36 17 L38 23" stroke="#86efac" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

    case 'nature_grass_forest':
      return `<svg ${common}>
        <polygon points="32,16 52,27 32,38 12,27" fill="#15803d" stroke="#166534" stroke-width="1.5"/>
        <polygon points="32,38 52,27 52,47 32,58" fill="#78350f"/>
        <polygon points="32,38 12,27 12,47 32,58" fill="#451a03"/>
        <circle cx="28" cy="25" r="2.5" fill="#ec4899"/>
        <circle cx="36" cy="22" r="2.5" fill="#facc15"/>
      </svg>`;

    case 'nature_grass_hill':
      return `<svg ${common}>
        <polygon points="12,44 32,18 52,44" fill="#16a34a" stroke="#15803d" stroke-width="1.5"/>
        <polygon points="32,18 52,44 52,52 32,56" fill="#15803d"/>
        <polygon points="12,44 32,56 12,52" fill="#78350f"/>
        <polygon points="32,18 42,32 22,32" fill="#4ade80"/>
      </svg>`;

    case 'nature_water_island':
      return `<svg ${common}>
        <ellipse cx="32" cy="40" rx="24" ry="12" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
        <ellipse cx="32" cy="36" rx="19" ry="9" fill="#fde047"/>
        <ellipse cx="32" cy="34" rx="13" ry="6" fill="#22c55e"/>
        <ellipse cx="32" cy="42" rx="21" ry="8" fill="none" stroke="#e0f2fe" stroke-width="1" stroke-dasharray="4 4"/>
      </svg>`;

    case 'nature_dock':
      return `<svg ${common}>
        <rect x="6" y="38" width="52" height="18" rx="2" fill="#0284c7" opacity="0.45"/>
        <rect x="14" y="26" width="4.5" height="24" fill="#78350f" rx="1"/>
        <rect x="46" y="26" width="4.5" height="24" fill="#78350f" rx="1"/>
        <polygon points="10,26 54,26 48,38 4,38" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <line x1="18" y1="26" x2="14" y2="38" stroke="#78350f" stroke-width="1.2"/>
        <line x1="32" y1="26" x2="27" y2="38" stroke="#78350f" stroke-width="1.2"/>
        <line x1="44" y1="26" x2="39" y2="38" stroke="#78350f" stroke-width="1.2"/>
      </svg>`;

    case 'nature_platform_beach':
      return `<svg ${common}>
        <ellipse cx="32" cy="38" rx="24" ry="13" fill="#38bdf8" opacity="0.6"/>
        <ellipse cx="32" cy="34" rx="22" ry="11" fill="#fde047" stroke="#eab308" stroke-width="2"/>
        <ellipse cx="30" cy="33" rx="14" ry="6" fill="#fef08a"/>
      </svg>`;

    default:
      return null;
  }
}
