/**
 * Margin Notes app composition.
 *
 * The real implementation is a SimplyFlow app assembled from feature components.
 * The exported `MarginNotes` class remains as a small compatibility adapter for
 * the previous `create().initialize(config)` host API.
 */

import { app } from '@muze-labs/simplyflow';
import { paragraphNoteStacks } from './features/paragraph-note-stacks.js';
import { createLocalStore } from './storage/local-store.js';

/**
 * Mount the margin notes SimplyFlow app.
 *
 * @param {Object} config - HostConfig with anchors and container
 * @returns {Object} SimplyFlow app instance
 */
export function mount(config) {
  validateHostConfig(config);

  const mountContainer = config.container.element;
  const storeKey = config.storeKey || config.storageKey || `margin-notes-${config.namespace || 'default'}`;
  const store = config.store || createLocalStore();

  mountContainer.innerHTML = '<simply-render rel="margin-notes"></simply-render>';
  const marginApp = app({
    container: document.body,
    components: {
      paragraphNoteStacks,
    },
    data: {
      marginNotes: {
        anchors: [],
        anchorViews: [],
        graph: [],
        storeKey,
      },
    },
    marginNotesRuntime: {
      mountContainer,
      hostAnchors: config.anchors,
      store,
      expandedStackBackground: config.expandedStackBackground || '#fffefb',
      anchorAffordances: [],
      resizeObserver: null,
      syncTimers: new Map(),
    },
    start() {
      return this.actions.setupParagraphNoteStacks({
        anchors: this.marginNotesRuntime.hostAnchors,
        storeKey,
      });
    },
  });

  const destroyApp = marginApp.destroy.bind(marginApp);
  marginApp.destroy = async function destroyMarginNotesApp() {
    await this.actions.destroyParagraphNoteStacks({});
    destroyApp();
  };
  marginApp.getNotesForAnchor = function getMountedNotesForAnchor(anchorId) {
    return this.api.notes.getNotesForAnchor({
      app: this,
      anchorId,
    });
  };

  return marginApp;
}

/**
 * Thin backwards-compatible adapter for the previous component API.
 */
export class MarginNotes {
  constructor() {
    this.app = null;
  }

  async initialize(config) {
    if (this.app) {
      await this.destroy();
    }
    this.app = mount(config);
  }

  async destroy() {
    if (!this.app) return;

    await this.app.destroy();
    this.app = null;
  }

  async createNote(anchorId) {
    return this.app?.actions.createNote({ anchorId });
  }

  async updateNote(noteId) {
    return this.app?.actions.updateNote({ noteId });
  }

  async deleteNote(noteId) {
    return this.app?.actions.deleteNote({ noteId });
  }

  getNotesForAnchor(anchorId) {
    return this.app?.getNotesForAnchor(anchorId) || [];
  }
}

function validateHostConfig(config) {
  if (!config) {
    throw new Error('Config is required');
  }
  if (!Array.isArray(config.anchors)) {
    throw new Error('Config must have anchors array');
  }
  if (!config.container || !config.container.element) {
    throw new Error('Config must have container with element');
  }
}
