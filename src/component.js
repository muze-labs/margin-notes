/**
 * Margin Notes app composition.
 *
 * The real implementation is a SimplyFlow app assembled from feature components.
 * The exported `MarginNotes` class remains as a small compatibility adapter for
 * the previous `create().initialize(config)` host API.
 */

import { app } from '@muze-labs/simplyflow';
import { paragraphNoteStacks } from './features/paragraph-note-stacks.js';
import { storeKeyFromConfig, validateHostConfig } from './host-contract.js';
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
  const storeKey = storeKeyFromConfig(config);
  const store = config.store || createLocalStore();
  const themeRoot = document.documentElement;

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
        solidConnection: {
          status: 'idle',
          message: 'Not connected',
          webId: '',
          storageUrl: '',
          resourceUrl: '',
        },
        theme: config.theme || 'system',
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
      solidConnectionConfig: config.solidConnection || null,
      solidConnectionElement: null,
      solidConnectionCleanup: null,
      themeRoot,
      hadThemeAttribute: themeRoot.hasAttribute('data-margin-notes-theme'),
      previousThemeAttribute: themeRoot.getAttribute('data-margin-notes-theme'),
    },
    async start() {
      await this.actions.setupParagraphNoteStacks({
        anchors: this.marginNotesRuntime.hostAnchors,
        storeKey,
      });
      await this.actions.setupSolidConnection({
        config: this.marginNotesRuntime.solidConnectionConfig,
      });
    },
  });

  const destroyApp = marginApp.destroy.bind(marginApp);
  marginApp.destroy = async function destroyMarginNotesApp() {
    await this.actions.destroySolidConnection({});
    await this.actions.destroyParagraphNoteStacks({});
    destroyApp();
  };
  marginApp.getNotesForAnchor = function getMountedNotesForAnchor(anchorId) {
    return this.api.notes.getNotesForAnchor({
      app: this,
      anchorId,
    });
  };
  marginApp.setTheme = function setMountedTheme(theme) {
    return this.actions.setTheme({ theme });
  };
  marginApp.getTheme = function getMountedTheme() {
    return this.data.marginNotes.theme;
  };
  marginApp.connectSolidStorage = function connectMountedSolidStorage(webId) {
    return this.actions.connectSolidStorage({ webId });
  };
  marginApp.getSolidConnection = function getMountedSolidConnection() {
    return { ...this.data.marginNotes.solidConnection };
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

  setTheme(theme) {
    return this.app?.setTheme(theme);
  }

  getTheme() {
    return this.app?.getTheme() || 'system';
  }

  connectSolidStorage(webId) {
    return this.app?.connectSolidStorage(webId);
  }

  getSolidConnection() {
    return this.app?.getSolidConnection() || null;
  }
}
