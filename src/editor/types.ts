import type { JsonLevelConfig } from '../config/levelTypes';

export type EditorTool = 'select' | 'props' | 'targets' | 'gun' | 'environment';
export type GizmoMode = 'translate' | 'rotate' | 'scale';

export type SelectedObjectType = 'prop' | 'target' | 'gun';

export interface SelectedObjectRef {
  type: SelectedObjectType;
  index: number;
  id?: string;
}

export interface AssetDef {
  id: string;
  name: string;
  category: 'room' | 'city' | 'rocks' | 'workshop' | 'entity' | 'nature';
  modelPath?: string;
  defaultScale?: number;
  hasCollision?: boolean;
  castShadow?: boolean;
  icon?: string;
  description?: string;
  isEntity?: boolean;
  entityType?: 'target' | 'gun';
}

export interface EditorSettings {
  gridSize: number;
  snapToGrid: boolean;
  gizmoMode: GizmoMode;
  lockGroundY?: boolean;
}

export type EditorEvent =
  | { type: 'level_updated'; level: JsonLevelConfig }
  | { type: 'selection_changed'; selection: SelectedObjectRef | null }
  | { type: 'tool_changed'; tool: EditorTool }
  | { type: 'gizmo_mode_changed'; mode: GizmoMode }
  | { type: 'history_changed'; canUndo: boolean; canRedo: boolean }
  | { type: 'item_modified'; selection: SelectedObjectRef; data: unknown };
