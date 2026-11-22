// 2.5D SVG Visual Previews for Entities and Room Props

const common = 'viewBox="0 0 64 64" width="100%" height="100%" fill="none"';

export function getEntityRoomPreview(assetId: string): string | null {
  switch (assetId) {
    // === ENTITIES ===
    case 'entity_target':
      return `<svg ${common}>
        <circle cx="32" cy="18" r="9" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
        <circle cx="29" cy="16" r="2.8" fill="#fff"/>
        <circle cx="29" cy="16" r="1.2" fill="#0f172a"/>
        <circle cx="35" cy="16" r="2.8" fill="#fff"/>
        <circle cx="35" cy="16" r="1.2" fill="#0f172a"/>
        <rect x="25" y="28" width="14" height="18" rx="4" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
        <path d="M22 30 L16 38 M42 30 L48 38" stroke="#ca8a04" stroke-width="3" stroke-linecap="round"/>
        <path d="M28 46 L26 58 M36 46 L38 58" stroke="#ca8a04" stroke-width="3.5" stroke-linecap="round"/>
      </svg>`;

    case 'prop_static_pistol':
      return `<svg ${common}>
        <path d="M14 26 L42 26 L44 32 L36 34 L33 46 L23 48 L25 34 L14 33 Z" fill="#334155" stroke="#64748b" stroke-width="2"/>
        <rect x="42" y="28" width="8" height="3" rx="1" fill="#475569"/>
        <path d="M26 36 Q30 40 28 42" stroke="#64748b" stroke-width="2" fill="none"/>
        <rect x="25" y="38" width="6" height="8" rx="1" fill="#78350f"/>
      </svg>`;

    // === ROOM & DINING ===
    case 'room_table':
      return `<svg ${common}>
        <polygon points="12,24 52,24 46,32 6,32" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
        <rect x="6" y="32" width="40" height="3" fill="#92400e"/>
        <rect x="9" y="35" width="4" height="20" fill="#78350f" rx="1"/>
        <rect x="39" y="35" width="4" height="20" fill="#78350f" rx="1"/>
        <rect x="15" y="32" width="3" height="15" fill="#451a03" rx="1"/>
        <rect x="45" y="32" width="3" height="15" fill="#451a03" rx="1"/>
      </svg>`;

    case 'room_chair':
      return `<svg ${common}>
        <rect x="22" y="14" width="20" height="18" rx="2" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <polygon points="18,32 46,32 42,39 14,39" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
        <rect x="16" y="39" width="3" height="18" fill="#78350f" rx="1"/>
        <rect x="41" y="39" width="3" height="18" fill="#78350f" rx="1"/>
        <rect x="20" y="39" width="2.5" height="12" fill="#451a03" rx="1"/>
        <rect x="37" y="39" width="2.5" height="12" fill="#451a03" rx="1"/>
      </svg>`;

    case 'room_couch':
      return `<svg ${common}>
        <rect x="10" y="24" width="44" height="18" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
        <rect x="6" y="30" width="8" height="16" rx="3" fill="#2563eb"/>
        <rect x="50" y="30" width="8" height="16" rx="3" fill="#2563eb"/>
        <rect x="14" y="34" width="36" height="12" rx="3" fill="#60a5fa"/>
        <rect x="14" y="47" width="4" height="6" fill="#78350f" rx="1"/>
        <rect x="46" y="47" width="4" height="6" fill="#78350f" rx="1"/>
      </svg>`;

    case 'room_armchair':
      return `<svg ${common}>
        <rect x="18" y="20" width="28" height="22" rx="4" fill="#10b981" stroke="#047857" stroke-width="1.5"/>
        <rect x="12" y="28" width="8" height="18" rx="3" fill="#059669"/>
        <rect x="44" y="28" width="8" height="18" rx="3" fill="#059669"/>
        <rect x="20" y="34" width="24" height="12" rx="2" fill="#34d399"/>
        <rect x="18" y="48" width="4" height="6" fill="#78350f" rx="1"/>
        <rect x="42" y="48" width="4" height="6" fill="#78350f" rx="1"/>
      </svg>`;

    case 'room_food_dinner':
      return `<svg ${common}>
        <ellipse cx="32" cy="36" rx="22" ry="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="16" ry="8" fill="#e2e8f0"/>
        <ellipse cx="30" cy="35" rx="8" ry="4.5" fill="#854d0e"/>
        <circle cx="38" cy="34" r="2.5" fill="#ef4444"/>
        <circle cx="41" cy="36" r="2" fill="#22c55e"/>
      </svg>`;

    case 'room_burger':
      return `<svg ${common}>
        <path d="M16 28 Q26 18 36 28 Z" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
        <rect x="14" y="29" width="24" height="3" rx="1" fill="#22c55e"/>
        <rect x="14" y="33" width="24" height="4" rx="1" fill="#78350f"/>
        <polygon points="18,37 34,37 30,40 22,40" fill="#facc15"/>
        <rect x="16" y="38" width="20" height="5" rx="2.5" fill="#d97706"/>
        <rect x="40" y="24" width="10" height="18" rx="2" fill="#ef4444"/>
        <rect x="43" y="16" width="3" height="10" fill="#f8fafc"/>
      </svg>`;

    case 'room_lamp':
      return `<svg ${common}>
        <polygon points="24,18 40,18 46,32 18,32" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
        <rect x="30" y="32" width="4" height="18" fill="#64748b"/>
        <ellipse cx="32" cy="51" rx="12" ry="4" fill="#475569"/>
      </svg>`;

    case 'room_wall':
      return `<svg ${common}>
        <rect x="12" y="14" width="40" height="38" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="12" y="48" width="40" height="4" fill="#78350f"/>
        <line x1="12" y1="26" x2="52" y2="26" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
        <line x1="12" y1="38" x2="52" y2="38" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      </svg>`;

    case 'room_wall_window':
      return `<svg ${common}>
        <rect x="10" y="14" width="44" height="38" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="18" y="20" width="28" height="22" rx="1" fill="#60a5fa" stroke="#334155" stroke-width="2"/>
        <line x1="32" y1="20" x2="32" y2="42" stroke="#334155" stroke-width="2"/>
        <line x1="18" y1="31" x2="46" y2="31" stroke="#334155" stroke-width="2"/>
        <rect x="10" y="48" width="44" height="4" fill="#78350f"/>
      </svg>`;

    case 'room_carpet':
      return `<svg ${common}>
        <ellipse cx="32" cy="32" rx="24" ry="16" fill="#b91c1c" stroke="#f59e0b" stroke-width="2"/>
        <ellipse cx="32" cy="32" rx="18" ry="11" fill="#991b1b" stroke="#fde047" stroke-width="1.5"/>
        <ellipse cx="32" cy="32" rx="8" ry="5" fill="#facc15"/>
      </svg>`;

    case 'room_plant':
      return `<svg ${common}>
        <polygon points="24,36 40,36 37,54 27,54" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
        <ellipse cx="32" cy="36" rx="9" ry="3" fill="#451a03"/>
        <path d="M32 36 Q22 26 18 16 Q26 22 32 32" fill="#22c55e"/>
        <path d="M32 36 Q38 20 46 14 Q44 24 32 34" fill="#16a34a"/>
        <path d="M32 34 Q32 18 30 10 Q36 18 33 32" fill="#15803d"/>
      </svg>`;

    case 'room_bookshelf':
      return `<svg ${common}>
        <rect x="16" y="12" width="32" height="42" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
        <rect x="19" y="16" width="26" height="10" fill="#451a03"/>
        <rect x="19" y="28" width="26" height="10" fill="#451a03"/>
        <rect x="19" y="40" width="26" height="10" fill="#451a03"/>
        <rect x="21" y="17" width="4" height="8" fill="#ef4444"/>
        <rect x="26" y="18" width="5" height="7" fill="#3b82f6"/>
        <rect x="32" y="17" width="4" height="8" fill="#eab308"/>
        <rect x="22" y="29" width="6" height="8" fill="#10b981"/>
        <rect x="29" y="30" width="5" height="7" fill="#f97316"/>
      </svg>`;

    case 'room_door':
      return `<svg ${common}>
        <rect x="16" y="10" width="32" height="46" rx="2" fill="#78350f" stroke="#451a03" stroke-width="2"/>
        <rect x="20" y="15" width="24" height="16" rx="1" fill="#92400e"/>
        <rect x="20" y="34" width="24" height="18" rx="1" fill="#92400e"/>
        <circle cx="40" cy="35" r="2.2" fill="#fbbf24"/>
      </svg>`;

    case 'room_cabinet':
      return `<svg ${common}>
        <rect x="14" y="16" width="36" height="36" rx="2" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
        <line x1="32" y1="16" x2="32" y2="48" stroke="#78350f" stroke-width="2"/>
        <circle cx="28" cy="32" r="1.8" fill="#fbbf24"/>
        <circle cx="36" cy="32" r="1.8" fill="#fbbf24"/>
        <rect x="16" y="48" width="4" height="6" fill="#451a03"/>
        <rect x="44" y="48" width="4" height="6" fill="#451a03"/>
      </svg>`;

    case 'room_pictureframe':
      return `<svg ${common}>
        <rect x="14" y="16" width="36" height="30" rx="2" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>
        <rect x="18" y="20" width="28" height="22" fill="#38bdf8"/>
        <polygon points="18,38 28,28 34,34 42,24 46,42 18,42" fill="#22c55e"/>
        <circle cx="24" cy="25" r="3" fill="#fde047"/>
      </svg>`;

    case 'room_floor_tile':
      return `<svg ${common}>
        <polygon points="32,16 54,28 32,40 10,28" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
        <polygon points="32,40 54,28 54,34 32,46" fill="#92400e"/>
        <polygon points="32,40 10,28 10,34 32,46" fill="#78350f"/>
      </svg>`;

    case 'room_pizza':
      return `<svg ${common}>
        <circle cx="32" cy="32" r="22" fill="#d97706" stroke="#b45309" stroke-width="2"/>
        <circle cx="32" cy="32" r="18" fill="#facc15"/>
        <circle cx="25" cy="27" r="3.5" fill="#dc2626"/>
        <circle cx="39" cy="26" r="3.5" fill="#dc2626"/>
        <circle cx="32" cy="38" r="3.5" fill="#dc2626"/>
        <circle cx="38" cy="40" r="3" fill="#dc2626"/>
        <circle cx="24" cy="39" r="3" fill="#dc2626"/>
        <circle cx="32" cy="25" r="1.5" fill="#15803d"/>
        <circle cx="29" cy="33" r="1.5" fill="#15803d"/>
        <circle cx="36" cy="33" r="1.5" fill="#15803d"/>
      </svg>`;

    case 'room_donut':
      return `<svg ${common}>
        <circle cx="32" cy="32" r="20" fill="#d97706" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="17" fill="#f472b6"/>
        <circle cx="32" cy="32" r="7" fill="#0f172a"/>
        <line x1="22" y1="24" x2="26" y2="26" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="38" y1="22" x2="42" y2="24" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="24" y1="38" x2="28" y2="40" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="38" y1="38" x2="41" y2="35" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;

    case 'room_soda':
      return `<svg ${common}>
        <rect x="22" y="16" width="20" height="34" rx="4" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5"/>
        <ellipse cx="32" cy="16" rx="10" ry="3.5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
        <ellipse cx="32" cy="16" rx="3.5" ry="1.8" fill="#64748b"/>
        <path d="M22 30 Q32 24 42 34" stroke="#ffffff" stroke-width="3" fill="none"/>
        <ellipse cx="32" cy="50" rx="10" ry="3" fill="#991b1b"/>
      </svg>`;

    case 'room_arcade_machine':
      return `<svg ${common}>
        <polygon points="20,12 44,12 42,20 46,34 38,38 38,54 22,54 22,38 18,34 22,20" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="24" y="14" width="16" height="5" rx="1" fill="#ec4899"/>
        <rect x="24" y="21" width="16" height="12" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
        <circle cx="28" cy="35" r="1.8" fill="#ef4444"/>
        <circle cx="34" cy="35" r="1.4" fill="#facc15"/>
        <circle cx="38" cy="35" r="1.4" fill="#22c55e"/>
        <rect x="28" y="44" width="8" height="6" fill="#0f172a"/>
      </svg>`;

    case 'room_boombox':
      return `<svg ${common}>
        <rect x="10" y="22" width="44" height="26" rx="3" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
        <path d="M18 22 L18 16 L46 16 L46 22" stroke="#94a3b8" stroke-width="3" fill="none"/>
        <circle cx="20" cy="35" r="7" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="44" cy="35" r="7" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
        <rect x="29" y="30" width="6" height="10" rx="1" fill="#475569"/>
        <line x1="14" y1="16" x2="8" y2="7" stroke="#94a3b8" stroke-width="1.5"/>
      </svg>`;

    default:
      return null;
  }
}
