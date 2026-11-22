import type { LevelData, JsonLevelConfig } from '../levelTypes';
import { parseJsonLevel } from '../../core/levelLoader';

// Automatically discover and import all level-*.json files in this folder
const levelModules = import.meta.glob<JsonLevelConfig>('./level-*.json', {
  eager: true,
  import: 'default',
});

// Sort files numerically by level number (e.g. level-1, level-2, ..., level-8)
const sortedEntries = Object.entries(levelModules).sort(([pathA], [pathB]) => {
  const numA = parseInt(pathA.match(/level-(\d+)/)?.[1] || '0', 10);
  const numB = parseInt(pathB.match(/level-(\d+)/)?.[1] || '0', 10);
  return numA - numB;
});

export const DEFAULT_JSON_LEVELS: JsonLevelConfig[] = sortedEntries.map(([path, config]) => {
  const levelNum = parseInt(path.match(/level-(\d+)/)?.[1] || '0', 10);
  const id = typeof config.id === 'number' && config.id < 1000 ? config.id : levelNum;
  return {
    ...config,
    id,
    name: config.name || `Level ${levelNum}`,
  };
});

export const ALL_LEVELS: LevelData[] = DEFAULT_JSON_LEVELS.map((json) => parseJsonLevel(json));
