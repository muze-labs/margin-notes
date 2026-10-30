/** Margin notes app composition. */

import { app } from '@muze-labs/simplyflow';
import { simplySolid } from '@muze-labs/simplysolid';
import { paragraphNoteStacks } from './features/paragraph-note-stacks.js';
import { storeKeyFromConfig, validateHostConfig } from './host-contract.js';

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
  const store = config.store;
  const themeRoot = document.documentElement;

  mountContainer.innerHTML = '<simply-render rel="margin-notes"></simply-render>';
  const marginApp = app({
    container: document.body,
    components: {
      paragraphNoteStacks,
    },
    data: {
      marginNotes: {
        namespace: config.namespace || 'default',
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
      notesService: config.notesService || null,
      simplySolid,
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
