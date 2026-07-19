/**
 * Host Contract for Margin Notes Component
 * 
 * This defines the contract between the host page and the margin-notes component.
 * The host page is responsible for providing document structure and anchors.
 * The component is responsible for rendering and managing notes.
 */

/**
 * A stable anchor supplied by the host page that identifies
 * a specific location in the document for annotation.
 * 
 * Recommended ID format (from programming-for-wizards):
 *   {type}-{namespace}-{text-slug}
 * 
 * Examples:
 *   p-chapter1-dependencies-are-not-a-problem
 *   h-chapter1-heading-text
 *   aside-chapter1-sidebar-note
 * 
 * The ID should be stable across page reloads. The text-slug portion
 * is human-readable and helps with manual debugging.
 *
 * @typedef {Object} AnchorTarget
 * @property {string} id - Unique identifier for this anchor within the host page.
 *   Should be stable across page reloads.
 *   Should follow the pattern: {type}-{namespace}-{text-slug}
 * @property {HTMLElement} element - The element in the document that this anchor refers to
 * @property {HTMLElement} [slot] - Optional host-owned element where note controls
 *   for this anchor should render. Defaults to `element`.
 * @property {string} [label] - Human-readable description of what this anchor targets
 */

/**
 * The element where the margin-notes component should mount.
 *
 * @typedef {Object} HostContainer
 * @property {HTMLElement} element - The HTML element that will contain the margin notes UI
 */

/**
 * Configuration passed by the host when mounting the component.
 * Keep this minimal for M1.1 — only what's needed for local persistence.
 *
 * @typedef {Object} HostConfig
 * @property {AnchorTarget[]} anchors - Array of anchors that the host supplies for annotation.
 *   These should be stable identifiers supplied by the host page.
 * @property {HostContainer} container - The container element where the component UI will be mounted.
 * @property {string} [namespace] - Optional namespace for stored notes.
 *   Allows multiple instances on the same host page.
 *   Defaults to "margin-notes"
 * @property {string} [storeKey] - Optional key for browser-local notes.
 *   Defaults to `margin-notes-${namespace}`
 * @property {string} [storageKey] - Backwards-compatible alias for storeKey.
 *   Defaults to `margin-notes-${namespace}`
 * @property {Object} [store] - Optional store with async load/save/remove methods.
 * @property {string} [expandedStackBackground] - CSS color used behind an opened stack of notes.
 *   Defaults to `#fffefb`
 * @property {'system'|'light'|'dark'} [theme] - Color theme for margin notes.
 *   Defaults to `system`.
 */

/**
 * The mounted SimplyFlow app returned to the host page.
 *
 * @typedef {Object} MarginNotesApp
 * @property {() => Promise<void>} destroy - Clean up resources and unmount the component.
 *   The component should not respond to further interactions after this.
 * @property {(anchorId: string) => Object[]} getNotesForAnchor - Return stored notes for a host anchor.
 * @property {(theme: 'system'|'light'|'dark') => Promise<string>} setTheme - Change margin notes theme at runtime.
 * @property {() => 'system'|'light'|'dark'} getTheme - Return the current margin notes theme setting.
 * @property {Object} actions - SimplyFlow actions for note behavior.
 */

/**
 * The entry point that the host page receives after loading the script.
 *
 * @typedef {Object} MarginNotesAPI
 * @property {(config: HostConfig) => MarginNotesApp} mount - Mount and return the SimplyFlow app.
 * @property {() => Object} create - Backwards-compatible adapter for the previous initialize/destroy API.
 */

export function validateHostConfig(config) {
  if (!config) {
    throw new Error('Config is required');
  }
  if (!Array.isArray(config.anchors)) {
    throw new Error('Config must have anchors array');
  }
  if (!config.container || !isElementLike(config.container.element)) {
    throw new Error('Config must have container with element');
  }
  if (config.store) {
    validateStore(config.store);
  }
  validateTheme(config.theme);

  const anchorIds = new Set();
  config.anchors.forEach((anchor, index) => {
    validateAnchor(anchor, index);
    if (anchorIds.has(anchor.id)) {
      throw new Error(`Config anchors must have unique ids: ${anchor.id}`);
    }
    anchorIds.add(anchor.id);
  });

  return config;
}

export function storeKeyFromConfig(config) {
  const namespace = config?.namespace || 'default';
  return config?.storeKey || config?.storageKey || `margin-notes-${namespace}`;
}

function validateAnchor(anchor, index) {
  if (!anchor || typeof anchor.id !== 'string' || anchor.id.length === 0) {
    throw new Error(`Config anchor at index ${index} must have an id`);
  }
  if (!isElementLike(anchor.element)) {
    throw new Error(`Config anchor "${anchor.id}" must have an element`);
  }
  if (anchor.slot !== undefined && !isElementLike(anchor.slot)) {
    throw new Error(`Config anchor "${anchor.id}" slot must be an element`);
  }
}

function validateStore(store) {
  for (const method of ['load', 'save', 'remove']) {
    if (typeof store[method] !== 'function') {
      throw new Error(`Config store must provide ${method}()`);
    }
  }
}

function validateTheme(theme) {
  if (theme === undefined) return;

  if (!['system', 'light', 'dark'].includes(theme)) {
    throw new Error('Config theme must be "system", "light", or "dark"');
  }
}

function isElementLike(value) {
  return value && typeof value === 'object' && value.nodeType === 1;
}
