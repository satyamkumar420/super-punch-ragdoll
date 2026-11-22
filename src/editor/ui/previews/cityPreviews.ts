// 2.5D SVG Visual Previews for City Vehicles, Buildings, and Houses

const common = 'viewBox="0 0 64 64" width="100%" height="100%" fill="none"';

export function getCityPreview(assetId: string): string | null {
  switch (assetId) {
    case 'city_sedan':
      return `<svg ${common}>
        <path d="M12 36 L18 26 L42 26 L50 34 L54 36 L54 44 L10 44 L10 38 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
        <polygon points="21,28 30,28 29,34 18,34" fill="#93c5fd"/>
        <polygon points="33,28 41,28 44,34 32,34" fill="#93c5fd"/>
        <circle cx="19" cy="44" r="5" fill="#0f172a"/><circle cx="19" cy="44" r="2" fill="#cbd5e1"/>
        <circle cx="45" cy="44" r="5" fill="#0f172a"/><circle cx="45" cy="44" r="2" fill="#cbd5e1"/>
      </svg>`;

    case 'city_cone':
      return `<svg ${common}>
        <polygon points="32,12 42,46 22,46" fill="#f97316" stroke="#ea580c" stroke-width="1.5"/>
        <polygon points="29,23 35,23 37,30 27,30" fill="#f8fafc"/>
        <polygon points="26,34 38,34 40,41 24,41" fill="#f8fafc"/>
        <rect x="16" y="46" width="32" height="6" rx="2" fill="#334155"/>
      </svg>`;

    case 'city_police':
      return `<svg ${common}>
        <path d="M10 38 L16 28 L44 28 L52 36 L54 38 L54 46 L10 46 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="22" y="36" width="16" height="10" fill="#1e3a8a"/>
        <polygon points="19,30 28,30 27,36 16,36" fill="#38bdf8"/>
        <polygon points="32,30 41,30 45,36 31,36" fill="#38bdf8"/>
        <rect x="26" y="24" width="6" height="4" fill="#ef4444" rx="1"/>
        <rect x="32" y="24" width="6" height="4" fill="#3b82f6" rx="1"/>
        <circle cx="18" cy="46" r="5" fill="#0f172a"/><circle cx="18" cy="46" r="2" fill="#cbd5e1"/>
        <circle cx="46" cy="46" r="5" fill="#0f172a"/><circle cx="46" cy="46" r="2" fill="#cbd5e1"/>
      </svg>`;

    case 'city_suv':
      return `<svg ${common}>
        <rect x="10" y="24" width="42" height="18" rx="3" fill="#059669" stroke="#047857" stroke-width="1.5"/>
        <rect x="16" y="20" width="30" height="4" fill="#334155" rx="1"/>
        <rect x="14" y="27" width="10" height="7" fill="#6ee7b7" rx="1"/>
        <rect x="27" y="27" width="10" height="7" fill="#6ee7b7" rx="1"/>
        <rect x="40" y="27" width="9" height="7" fill="#6ee7b7" rx="1"/>
        <circle cx="18" cy="44" r="6" fill="#0f172a"/><circle cx="18" cy="44" r="2.5" fill="#94a3b8"/>
        <circle cx="44" cy="44" r="6" fill="#0f172a"/><circle cx="44" cy="44" r="2.5" fill="#94a3b8"/>
      </svg>`;

    case 'city_delivery':
      return `<svg ${common}>
        <path d="M10 44 L10 32 L16 26 L26 26 L26 44 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>
        <rect x="26" y="18" width="28" height="26" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
        <polygon points="14,32 18,28 24,28 24,34 14,34" fill="#38bdf8"/>
        <circle cx="18" cy="46" r="5" fill="#0f172a"/>
        <circle cx="44" cy="46" r="5" fill="#0f172a"/>
      </svg>`;

    case 'city_taxi':
      return `<svg ${common}>
        <path d="M12 36 L18 26 L42 26 L50 34 L54 36 L54 44 L10 44 L10 38 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
        <rect x="27" y="22" width="10" height="4" rx="1" fill="#f8fafc" stroke="#0f172a" stroke-width="1"/>
        <rect x="18" y="37" width="4" height="3" fill="#0f172a"/>
        <rect x="26" y="37" width="4" height="3" fill="#0f172a"/>
        <rect x="34" y="37" width="4" height="3" fill="#0f172a"/>
        <rect x="42" y="37" width="4" height="3" fill="#0f172a"/>
        <polygon points="21,28 30,28 29,34 18,34" fill="#93c5fd"/>
        <polygon points="33,28 41,28 44,34 32,34" fill="#93c5fd"/>
        <circle cx="19" cy="44" r="5" fill="#0f172a"/><circle cx="45" cy="44" r="5" fill="#0f172a"/>
      </svg>`;

    case 'city_building_a':
      return `<svg ${common}>
        <rect x="18" y="14" width="28" height="42" rx="2" fill="#475569" stroke="#334155" stroke-width="1.5"/>
        <rect x="22" y="18" width="5" height="6" rx="1" fill="#38bdf8"/>
        <rect x="31" y="18" width="5" height="6" rx="1" fill="#38bdf8"/>
        <rect x="39" y="18" width="5" height="6" rx="1" fill="#38bdf8"/>
        <rect x="22" y="28" width="5" height="6" rx="1" fill="#38bdf8"/>
        <rect x="31" y="28" width="5" height="6" rx="1" fill="#facc15"/>
        <rect x="39" y="28" width="5" height="6" rx="1" fill="#38bdf8"/>
        <rect x="29" y="44" width="8" height="12" fill="#0f172a"/>
      </svg>`;

    case 'city_building_b':
      return `<svg ${common}>
        <polygon points="32,8 32,14 36,14 36,54 28,54 28,14 32,14" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
        <rect x="30" y="18" width="4" height="4" fill="#38bdf8"/>
        <rect x="30" y="26" width="4" height="4" fill="#38bdf8"/>
        <rect x="30" y="34" width="4" height="4" fill="#facc15"/>
        <rect x="30" y="42" width="4" height="4" fill="#38bdf8"/>
      </svg>`;

    case 'city_building1_large':
      return `<svg ${common}>
        <rect x="10" y="18" width="44" height="38" rx="2" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
        <rect x="8" y="15" width="48" height="4" rx="1" fill="#991b1b"/>
        <polygon points="10,38 54,38 50,43 14,43" fill="#ef4444"/>
        <rect x="14" y="44" width="14" height="12" fill="#38bdf8"/>
        <rect x="36" y="44" width="14" height="12" fill="#38bdf8"/>
        <rect x="14" y="23" width="8" height="8" rx="1" fill="#38bdf8"/>
        <rect x="28" y="23" width="8" height="8" rx="1" fill="#38bdf8"/>
        <rect x="42" y="23" width="8" height="8" rx="1" fill="#38bdf8"/>
      </svg>`;

    case 'city_building1_small':
      return `<svg ${common}>
        <rect x="18" y="20" width="28" height="36" rx="2" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
        <polygon points="16,36 48,36 44,41 20,41" fill="#dc2626"/>
        <rect x="22" y="42" width="8" height="14" fill="#78350f"/>
        <rect x="34" y="42" width="8" height="9" fill="#38bdf8"/>
        <rect x="26" y="25" width="12" height="8" rx="1" fill="#38bdf8"/>
      </svg>`;

    case 'city_building2_large':
      return `<svg ${common}>
        <rect x="12" y="14" width="40" height="42" rx="2" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
        <rect x="15" y="20" width="34" height="6" rx="1" fill="#38bdf8"/>
        <rect x="15" y="29" width="34" height="6" rx="1" fill="#38bdf8"/>
        <rect x="15" y="38" width="34" height="6" rx="1" fill="#38bdf8"/>
        <line x1="26" y1="14" x2="26" y2="56" stroke="#334155" stroke-width="2"/>
        <line x1="38" y1="14" x2="38" y2="56" stroke="#334155" stroke-width="2"/>
        <rect x="28" y="46" width="8" height="10" fill="#0f172a"/>
      </svg>`;

    case 'city_building2_small':
      return `<svg ${common}>
        <rect x="18" y="18" width="28" height="38" rx="2" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
        <rect x="21" y="24" width="22" height="6" rx="1" fill="#38bdf8"/>
        <rect x="21" y="34" width="22" height="6" rx="1" fill="#38bdf8"/>
        <rect x="27" y="44" width="10" height="12" fill="#0f172a"/>
      </svg>`;

    case 'city_building3_big':
      return `<svg ${common}>
        <rect x="16" y="10" width="32" height="46" rx="1" fill="#991b1b" stroke="#7f1d1d" stroke-width="1.5"/>
        <rect x="22" y="6" width="20" height="4" fill="#78350f"/>
        <rect x="20" y="14" width="5" height="6" fill="#fef08a"/>
        <rect x="29" y="14" width="5" height="6" fill="#fef08a"/>
        <rect x="38" y="14" width="5" height="6" fill="#fef08a"/>
        <rect x="20" y="23" width="5" height="6" fill="#fef08a"/>
        <rect x="29" y="23" width="5" height="6" fill="#fef08a"/>
        <rect x="38" y="23" width="5" height="6" fill="#fef08a"/>
        <rect x="20" y="32" width="5" height="6" fill="#fef08a"/>
        <rect x="29" y="32" width="5" height="6" fill="#fef08a"/>
        <rect x="38" y="32" width="5" height="6" fill="#fef08a"/>
        <rect x="28" y="44" width="8" height="12" fill="#0f172a"/>
      </svg>`;

    case 'city_building3_small':
      return `<svg ${common}>
        <rect x="20" y="14" width="24" height="42" rx="1" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
        <rect x="24" y="20" width="6" height="7" fill="#fef08a"/>
        <rect x="34" y="20" width="6" height="7" fill="#fef08a"/>
        <rect x="24" y="31" width="6" height="7" fill="#fef08a"/>
        <rect x="34" y="31" width="6" height="7" fill="#fef08a"/>
        <path d="M28 56 L28 44 Q32 40 36 44 L36 56 Z" fill="#0f172a"/>
      </svg>`;

    case 'city_building4':
      return `<svg ${common}>
        <line x1="32" y1="2" x2="32" y2="8" stroke="#94a3b8" stroke-width="2"/>
        <rect x="18" y="8" width="28" height="48" rx="2" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
        <line x1="27" y1="8" x2="27" y2="56" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3 3"/>
        <line x1="37" y1="8" x2="37" y2="56" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3 3"/>
        <line x1="18" y1="20" x2="46" y2="20" stroke="#38bdf8" stroke-width="1"/>
        <line x1="18" y1="32" x2="46" y2="32" stroke="#38bdf8" stroke-width="1"/>
        <line x1="18" y1="44" x2="46" y2="44" stroke="#38bdf8" stroke-width="1"/>
      </svg>`;

    case 'city_house1':
      return `<svg ${common}>
        <polygon points="32,12 10,28 54,28" fill="#b91c1c" stroke="#991b1b" stroke-width="1.5"/>
        <rect x="39" y="10" width="5" height="10" fill="#78350f"/>
        <rect x="16" y="28" width="32" height="26" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <rect x="28" y="38" width="8" height="16" fill="#78350f" rx="1"/>
        <rect x="19" y="32" width="6" height="7" fill="#38bdf8"/>
        <rect x="39" y="32" width="6" height="7" fill="#38bdf8"/>
      </svg>`;

    case 'city_house2':
      return `<svg ${common}>
        <rect x="18" y="16" width="28" height="18" rx="1" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="14" y="34" width="36" height="22" rx="1" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
        <rect x="14" y="28" width="10" height="6" fill="#64748b"/>
        <rect x="22" y="20" width="8" height="8" fill="#38bdf8"/>
        <rect x="34" y="20" width="8" height="8" fill="#38bdf8"/>
        <rect x="28" y="42" width="8" height="14" fill="#78350f"/>
        <rect x="40" y="40" width="6" height="8" fill="#38bdf8"/>
      </svg>`;

    default:
      return null;
  }
}
