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
 * @property {string} [storageKey] - Optional storage key prefix for browser storage.
 *   Defaults to `margin-notes-${namespace}`
 * @property {string} [expandedStackBackground] - CSS color used behind an opened stack of notes.
 *   Defaults to `#fffefb`
 */

/**
 * The mounted SimplyFlow app returned to the host page.
 *
 * @typedef {Object} MarginNotesApp
 * @property {() => Promise<void>} destroy - Clean up resources and unmount the component.
 *   The component should not respond to further interactions after this.
 * @property {(anchorId: string) => Object[]} getNotesForAnchor - Return stored notes for a host anchor.
 * @property {Object} actions - SimplyFlow actions for note behavior.
 */

/**
 * The entry point that the host page receives after loading the script.
 *
 * @typedef {Object} MarginNotesAPI
 * @property {(config: HostConfig) => MarginNotesApp} mount - Mount and return the SimplyFlow app.
 * @property {() => Object} create - Backwards-compatible adapter for the previous initialize/destroy API.
 */

// Export for documentation purposes
export {};
