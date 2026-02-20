import { CanvasPreferences, CanvasLayoutMode } from '../types';

const CANVAS_LAYOUT_KEY = 'procastify_canvas_layout';

export class CanvasLayoutService {
  /**
   * Get default canvas preferences
   */
  static getDefaultPreferences(): CanvasPreferences {
    return {
      layoutMode: 'topbar',
      sidebarWidth: 280,
      showGridLines: false,
      snapToGrid: false,
    };
  }

  /**
   * Get canvas preferences from localStorage
   */
  static getLocalPreferences(): CanvasPreferences {
    try {
      const stored = localStorage.getItem(CANVAS_LAYOUT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse canvas layout preferences:', e);
    }
    return this.getDefaultPreferences();
  }

  /**
   * Save canvas preferences to localStorage
   */
  static saveLocalPreferences(preferences: CanvasPreferences): void {
    try {
      localStorage.setItem(CANVAS_LAYOUT_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save canvas layout preferences:', e);
    }
  }

  /**
   * Set layout mode and persist
   */
  static setLayoutMode(mode: CanvasLayoutMode): CanvasPreferences {
    const preferences = this.getLocalPreferences();
    preferences.layoutMode = mode;
    this.saveLocalPreferences(preferences);
    return preferences;
  }

  /**
   * Get current layout mode
   */
  static getLayoutMode(): CanvasLayoutMode {
    const preferences = this.getLocalPreferences();
    return preferences.layoutMode;
  }

  /**
   * Update sidebar width
   */
  static setSidebarWidth(width: number): CanvasPreferences {
    const preferences = this.getLocalPreferences();
    preferences.sidebarWidth = Math.max(200, Math.min(400, width)); // Constrain between 200-400px
    this.saveLocalPreferences(preferences);
    return preferences;
  }

  /**
   * Toggle grid lines
   */
  static toggleGridLines(): CanvasPreferences {
    const preferences = this.getLocalPreferences();
    preferences.showGridLines = !preferences.showGridLines;
    this.saveLocalPreferences(preferences);
    return preferences;
  }

  /**
   * Toggle snap to grid
   */
  static toggleSnapToGrid(): CanvasPreferences {
    const preferences = this.getLocalPreferences();
    preferences.snapToGrid = !preferences.snapToGrid;
    this.saveLocalPreferences(preferences);
    return preferences;
  }

  /**
   * Reset to defaults
   */
  static resetToDefaults(): CanvasPreferences {
    const defaults = this.getDefaultPreferences();
    this.saveLocalPreferences(defaults);
    return defaults;
  }
}
