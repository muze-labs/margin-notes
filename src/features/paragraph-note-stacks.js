import { path } from '@muze-labs/simplyflow';
import { CobaltEditorModal, COBALT_EDITOR_STYLES } from '../cobalt-editor-modal.js';
import { annotationModel } from './paragraph-note-stacks/annotation-model.js';
import MARGIN_NOTES_ROOT_TEMPLATE from './paragraph-note-stacks/root.html';
import MARGIN_NOTES_ANCHOR_WIDGET_TEMPLATE from './paragraph-note-stacks/anchor-widget.html';
import MARGIN_NOTES_INLINE_NOTE_TEMPLATE from './paragraph-note-stacks/inline-note.html';
import SOLID_CONNECTION_TEMPLATE from './solid-connection/control.html';
import MARGIN_NOTES_DESIGN_SYSTEM_STYLES from '../design-system.css';
import MARGIN_NOTES_UI_STYLES from './paragraph-note-stacks/ui.css';
import SOLID_CONNECTION_STYLES from './solid-connection/ui.css';
import { createSolidNotesConnection } from '../storage/solid-notes-location.js';
import { authorizePopup } from '@muze-labs/jsfs-solid';

export const paragraphNoteStacks = {
  templates: {
    'margin-notes': MARGIN_NOTES_ROOT_TEMPLATE,
    'margin-notes-anchor-widget': MARGIN_NOTES_ANCHOR_WIDGET_TEMPLATE,
    'margin-notes-inline-note': MARGIN_NOTES_INLINE_NOTE_TEMPLATE,
    'margin-notes-solid-connection': SOLID_CONNECTION_TEMPLATE,
  },
  styles: {
    'margin-notes-design-system': MARGIN_NOTES_DESIGN_SYSTEM_STYLES,
    'margin-notes-ui': MARGIN_NOTES_UI_STYLES,
    'margin-notes-solid-connection': SOLID_CONNECTION_STYLES,
    'margin-notes-cobalt-editor': COBALT_EDITOR_STYLES,
  },
  actions: {
    async setupParagraphNoteStacks({ anchors, storeKey }) {
      const notesApi = this.api.notes;
      this.data.marginNotes.storeKey = storeKey;
      await notesApi.setupNotesStorage({
        app: this,
        storeKey,
      });
      await this.actions.setTheme({
        theme: this.data.marginNotes.theme,
      });
      await this.actions.installAnchorAffordances({ anchors });

      this.data.marginNotes.graph = await notesApi.loadGraph({
        app: this,
        key: storeKey,
      });
      const notesByAnchor = notesApi.groupNotesByAnchor({
        notes: this.data.marginNotes.graph,
      });
      const anchorState = anchors.map(anchor => {
        const notes = notesByAnchor[anchor.id] || [];
        return {
          id: anchor.id,
          label: notesApi.anchorLabel({ anchor }),
          notes,
          visibleNotes: [],
          noteCount: notes.length,
          overflowLabel: '',
          hasOverflow: false,
          expanded: false,
        };
      });

      this.data.marginNotes.anchors = anchorState;
      this.data.marginNotes.anchorViews = Array.from(anchorState, anchor => [anchor]);
      for (const anchor of this.data.marginNotes.anchors) {
        await this.actions.renderAnchorNotes({ anchor });
      }
    },

    async destroyParagraphNoteStacks() {
      const notesApi = this.api.notes;
      this.marginNotesRuntime.resizeObserver?.disconnect();
      this.marginNotesRuntime.resizeObserver = null;

      for (const timer of this.marginNotesRuntime.syncTimers.values()) {
        clearTimeout(timer);
      }
      this.marginNotesRuntime.syncTimers.clear();

      await this.actions.removeAnchorAffordances({});
      notesApi.removeInstalledViewAssets({ app: this });
      notesApi.restoreTheme({ app: this });
      this.marginNotesRuntime.mountContainer?.replaceChildren();
    },

    async setupSolidConnection({ config }) {
      if (!config) return;

      const notesApi = this.api.notes;
      const container = notesApi.hostElement(config.container);
      if (!container) return;

      container.innerHTML = notesApi.templates.solidConnection;
      const element = container.querySelector('[data-margin-notes-solid-connection]');
      const input = container.querySelector('[data-margin-notes-solid-webid]');
      if (!element || !input) return;

      const rememberedConnection = notesApi.loadRememberedSolidConnection({ app: this });
      const initialWebId = config.webId || rememberedConnection?.webId || '';
      input.value = initialWebId;
      notesApi.setSolidConnectionStatus({
        app: this,
        status: 'idle',
        webId: initialWebId,
        message: rememberedConnection ? 'Reconnecting...' : 'Not connected',
      });
      notesApi.renderSolidConnectionStatus({ app: this });

      const onSubmit = event => {
        event.preventDefault();
        void this.actions.connectSolidStorage({
          webId: input.value,
        });
      };
      element.addEventListener('submit', onSubmit);

      this.marginNotesRuntime.solidConnectionElement = element;
      this.marginNotesRuntime.solidConnectionCleanup = () => {
        element.removeEventListener('submit', onSubmit);
        container.replaceChildren();
      };

      if (rememberedConnection && config.autoConnect !== false) {
        void this.actions.connectSolidStorage({
          webId: initialWebId,
        });
      }
    },

    async destroySolidConnection() {
      this.marginNotesRuntime.solidConnectionCleanup?.();
      this.marginNotesRuntime.solidConnectionCleanup = null;
      this.marginNotesRuntime.solidConnectionElement = null;
    },

    async setTheme({ theme }) {
      const notesApi = this.api.notes;
      const normalizedTheme = notesApi.normalizeTheme({ theme });

      this.data.marginNotes.theme = normalizedTheme;
      notesApi.applyTheme({
        app: this,
        theme: normalizedTheme,
      });
      return normalizedTheme;
    },

    async createNote({ anchorId }) {
      const notesApi = this.api.notes;
      const anchor = notesApi.findAnchor({ app: this, anchorId });
      if (!anchor) return;

      const modal = new notesApi.CobaltEditorModal({
        title: 'New note',
        initialFragment: { text: '', annotations: [] }
      });

      const fragment = await modal.show();
      if (!fragment) return;

      const annotation = notesApi.createAnnotationNote({ anchorId, fragment });
      const storedAnnotation = await notesApi.createStoredAnnotation({
        app: this,
        annotation,
      });
      const noteAnnotation = storedAnnotation || annotation;
      this.data.marginNotes.graph.push(noteAnnotation);
      anchor.notes.push(notesApi.toRenderableNote({ annotation: noteAnnotation }));
      await this.actions.updateAnchorNoteState({ anchor });
      await this.actions.renderAnchorNotes({ anchor });
      if (!this.marginNotesRuntime.notesService) {
        await this.actions.saveNotes({});
      }
    },

    async updateNote({ noteId }) {
      const notesApi = this.api.notes;
      const match = notesApi.findNote({ app: this, noteId });
      if (!match) return;

      const modal = new notesApi.CobaltEditorModal({
        title: 'Edit note',
        initialFragment: match.note.body
      });

      const fragment = await modal.show();
      if (!fragment) return;

      notesApi.updateAnnotationBody({
        annotation: match.note.annotation,
        fragment,
      });
      notesApi.syncRenderableNote({ note: match.note });
      await notesApi.saveStoredAnnotation({
        app: this,
        annotation: match.note.annotation,
      });
      await this.actions.renderAnchorNotes({ anchor: match.anchor });
      if (!this.marginNotesRuntime.notesService) {
        await this.actions.saveNotes({});
      }
    },

    async deleteNote({ noteId }) {
      const notesApi = this.api.notes;
      const match = notesApi.findNote({ app: this, noteId });
      if (!match) return;

      await notesApi.deleteStoredAnnotation({
        app: this,
        annotation: match.note.annotation,
      });
      match.anchor.notes.splice(match.index, 1);
      notesApi.removeAnnotationFromGraph({
        app: this,
        annotationId: match.note.id,
      });
      await this.actions.updateAnchorNoteState({ anchor: match.anchor });
      await this.actions.renderAnchorNotes({ anchor: match.anchor });
      if (!this.marginNotesRuntime.notesService) {
        await this.actions.saveNotes({});
      }
    },

    async saveNotes() {
      const notesApi = this.api.notes;
      await notesApi.saveGraph({
        app: this,
        key: this.data.marginNotes.storeKey,
        subjects: this.data.marginNotes.graph,
      });
    },

    async connectSolidStorage({ webId }) {
      const notesApi = this.api.notes;
      const config = this.marginNotesRuntime.solidConnectionConfig || {};

      try {
        notesApi.setSolidConnectionStatus({
          app: this,
          status: 'connecting',
          webId,
          message: 'Resolving Solid storage...',
        });
        notesApi.renderSolidConnectionStatus({ app: this });

        const connection = await notesApi.createSolidNotesConnection({
          ...config,
          ...notesApi.prepareSolidAuthorization({ config }),
          webId,
        });

        notesApi.setSolidConnectionStatus({
          app: this,
          status: 'connecting',
          webId: connection.webId,
          storageUrl: connection.storageUrl,
          resourceUrl: connection.resourceUrl,
          message: 'Syncing local notes...',
        });
        notesApi.renderSolidConnectionStatus({ app: this });
        const notesService = await notesApi.ensureNotesService({
          app: this,
          storeKey: this.data.marginNotes.storeKey,
        });
        const solidClient = connection.solid || config.solid || config.solidForStore;
        if (!solidClient) {
          throw new Error('Solid connection did not provide a Lading client for note sync');
        }
        await notesService.connect({
          solid: solidClient,
          resources: {
            notes: {
              url: connection.resourceUrl,
            },
          },
        });
        const syncStatus = await notesService.sync('notes');
        if (syncStatus?.ok === false) {
          throw syncStatus.error || new Error(`Solid notes sync failed: ${syncStatus.status}`);
        }

        notesService.data.notes.refresh();
        this.marginNotesRuntime.solidConnection = connection;
        notesApi.setSolidConnectionStatus({
          app: this,
          status: 'connected',
          webId: connection.webId,
          storageUrl: connection.storageUrl,
          resourceUrl: connection.resourceUrl,
          message: `Connected to ${connection.storageUrl}`,
        });
        notesApi.renderSolidConnectionStatus({ app: this });
        await this.actions.replaceNotesGraph({
          graph: notesService.data.notes.list(),
        });
        notesApi.rememberSolidConnection({
          app: this,
          connection,
        });
        notesApi.renderSolidConnectionStatus({ app: this });
        return connection;
      } catch (error) {
        notesApi.setSolidConnectionStatus({
          app: this,
          status: 'error',
          webId,
          message: error.message,
        });
        notesApi.renderSolidConnectionStatus({ app: this });
        throw error;
      }
    },

    async reloadNotesFromStore() {
      const notesApi = this.api.notes;
      const graph = await notesApi.loadGraph({
        app: this,
        key: this.data.marginNotes.storeKey,
        throwOnError: true,
      });
      await this.actions.replaceNotesGraph({ graph });
    },

    async replaceNotesGraph({ graph }) {
      const notesApi = this.api.notes;
      this.data.marginNotes.graph = graph;
      const notesByAnchor = notesApi.groupNotesByAnchor({
        notes: graph,
      });

      for (const anchor of this.data.marginNotes.anchors) {
        anchor.notes = notesByAnchor[anchor.id] || [];
        anchor.visibleNotes = [];
        anchor.noteCount = anchor.notes.length;
        anchor.overflowLabel = '';
        anchor.hasOverflow = false;
        anchor.expanded = false;
        await this.actions.renderAnchorNotes({ anchor });
      }
    },

    async installAnchorAffordances({ anchors }) {
      const notesApi = this.api.notes;
      await this.actions.removeAnchorAffordances({});
      this.marginNotesRuntime.resizeObserver?.disconnect();
      this.marginNotesRuntime.resizeObserver = notesApi.createResizeObserver({ app: this });

      anchors.forEach((anchor, index) => {
        if (!notesApi.isValidHostAnchor({ anchor })) {
          return;
        }

        const widget = document.createElement('span');
        widget.className = 'margin-notes-anchor-widget-host';
        widget.dataset.marginNotesAnchor = anchor.id;
        widget.setAttribute('data-simply-list', `marginNotes.anchorViews.${index}`);
        widget.innerHTML = '<template rel="margin-notes-anchor-widget"></template>';

        const hadTabIndex = anchor.element.hasAttribute('tabindex');
        const previousTabIndex = anchor.element.getAttribute('tabindex');
        const hadTargetAttribute = anchor.element.hasAttribute('data-margin-notes-target');
        const previousTargetAttribute = anchor.element.getAttribute('data-margin-notes-target');

        anchor.element.dataset.marginNotesTarget = anchor.id;
        if (!hadTabIndex && !notesApi.isNaturallyFocusable({ element: anchor.element })) {
          anchor.element.tabIndex = 0;
          anchor.element.classList.add('margin-notes-target-tabstop');
        }

        const slot = notesApi.anchorSlot({ anchor });
        slot.appendChild(widget);
        this.marginNotesRuntime.anchorAffordances.push({
          element: anchor.element,
          slot,
          widget,
          anchorId: anchor.id,
          expanded: false,
          hasOverflow: false,
          hadTabIndex,
          previousTabIndex,
          hadTargetAttribute,
          previousTargetAttribute,
        });
        this.marginNotesRuntime.resizeObserver?.observe(anchor.element);
      });
    },

    async removeAnchorAffordances() {
      for (const affordance of this.marginNotesRuntime.anchorAffordances) {
        affordance.widget.remove();
        affordance.element.classList.remove('margin-notes-target-tabstop');

        if (affordance.hadTabIndex) {
          affordance.element.setAttribute('tabindex', affordance.previousTabIndex);
        } else {
          affordance.element.removeAttribute('tabindex');
        }

        if (affordance.hadTargetAttribute) {
          affordance.element.setAttribute('data-margin-notes-target', affordance.previousTargetAttribute);
        } else {
          affordance.element.removeAttribute('data-margin-notes-target');
        }
      }
      this.marginNotesRuntime.anchorAffordances = [];
    },

    async renderAnchorNotes({ anchor }) {
      const notesApi = this.api.notes;
      const affordance = notesApi.findAnchorAffordance({ app: this, anchorId: anchor.id });
      if (!affordance) return;

      if (anchor.notes.length === 0) {
        affordance.expanded = false;
        anchor.expanded = false;
      }
      await this.actions.layoutAnchorNotes({ anchorId: anchor.id });
    },

    async moveNoteFocus({ event, direction }) {
      const notesApi = this.api.notes;
      const note = notesApi.noteFromElement({ app: this, source: event.target });
      if (!note) return;

      const match = notesApi.findNote({ app: this, noteId: note.id });
      if (!match) return;

      const next = match.anchor.notes[match.index + direction];
      if (!next) return;

      const nextIsVisible = match.anchor.visibleNotes.some(visibleNote => visibleNote.id === next.id);
      if (!match.anchor.expanded && !nextIsVisible) {
        await this.actions.expandAnchorNoteList({ anchorId: match.anchor.id });
      }

      await this.actions.focusNoteAfterRender({ noteId: next.id });
    },

    async blurAndCollapseNote({ event }) {
      const notesApi = this.api.notes;
      const note = notesApi.noteFromElement({ app: this, source: event.target });
      const match = note ? notesApi.findNote({ app: this, noteId: note.id }) : null;
      const list = event.target?.closest?.('.margin-notes-target-note-list');
      const active = document.activeElement;

      if (active instanceof HTMLElement) {
        active.blur();
      }

      if (list) {
        await this.actions.collapseExpandedInlineNotes({ list });
      }

      if (match?.anchor.expanded) {
        await this.actions.collapseAnchorNoteList({ anchorId: match.anchor.id });
      }
    },

    async layoutAnchorNotes({ anchorId }) {
      const notesApi = this.api.notes;
      const affordance = notesApi.findAnchorAffordance({ app: this, anchorId });
      const anchor = notesApi.findAnchor({ app: this, anchorId });
      if (!affordance || !anchor) return;

      const notes = Array.from(anchor.notes);
      const noteCount = notes.length;
      anchor.noteCount = noteCount;
      anchor.expanded = affordance.expanded && noteCount > 0;
      if (affordance.expanded) {
        anchor.visibleNotes = notes;
        anchor.overflowLabel = affordance.hasOverflow ? 'show fewer notes' : '';
        await this.actions.syncAnchorLayoutDom({ anchorId });
        return;
      }

      if (noteCount === 0) {
        affordance.hasOverflow = false;
        anchor.hasOverflow = false;
        anchor.visibleNotes = [];
        anchor.overflowLabel = '';
        await this.actions.syncAnchorLayoutDom({ anchorId });
        return;
      }

      if (noteCount === 1) {
        affordance.hasOverflow = false;
        anchor.hasOverflow = false;
        anchor.visibleNotes = notes;
        anchor.overflowLabel = '';
        await this.actions.syncAnchorLayoutDom({ anchorId });
        return;
      }

      const availableHeight = Math.max(0, affordance.element.getBoundingClientRect().height);
      const collapsedNoteHeight = 32;
      const overflowToggleHeight = 22;
      let visibleCount = Math.floor(availableHeight / collapsedNoteHeight);

      if (visibleCount >= noteCount) {
        affordance.hasOverflow = false;
        anchor.hasOverflow = false;
        anchor.visibleNotes = notes;
        anchor.overflowLabel = '';
        await this.actions.syncAnchorLayoutDom({ anchorId });
        return;
      }

      affordance.hasOverflow = true;
      anchor.hasOverflow = true;
      visibleCount = Math.floor((availableHeight - overflowToggleHeight) / collapsedNoteHeight);
      visibleCount = Math.max(0, Math.min(visibleCount, noteCount - 1));

      const hiddenCount = Math.max(0, noteCount - visibleCount);
      anchor.visibleNotes = notes.slice(0, visibleCount);
      anchor.overflowLabel = visibleCount > 0
        ? `${hiddenCount} more notes...`
        : `${noteCount} notes`;
      await this.actions.syncAnchorLayoutDom({ anchorId });
    },

    async toggleAnchorNoteList({ anchorId }) {
      if (!anchorId) return;

      const notesApi = this.api.notes;
      const affordance = notesApi.findAnchorAffordance({ app: this, anchorId });
      if (!affordance) return;

      if (affordance.expanded) {
        await this.actions.collapseAnchorNoteList({ anchorId });
      } else {
        await this.actions.expandAnchorNoteList({ anchorId });
      }
    },

    async expandAnchorNoteList({ anchorId }) {
      const notesApi = this.api.notes;
      const affordance = notesApi.findAnchorAffordance({ app: this, anchorId });
      if (!affordance || affordance.expanded) return;

      for (const other of this.marginNotesRuntime.anchorAffordances) {
        if (other.expanded) {
          other.expanded = false;
          await this.actions.collapseExpandedInlineNotes({ list: notesApi.noteListElement({ affordance: other }) });
          await this.actions.layoutAnchorNotes({ anchorId: other.anchorId });
        }
      }

      affordance.expanded = true;
      await this.actions.layoutAnchorNotes({ anchorId });
    },

    async collapseAnchorNoteList({ anchorId }) {
      const notesApi = this.api.notes;
      const affordance = notesApi.findAnchorAffordance({ app: this, anchorId });
      if (!affordance) return;

      affordance.expanded = false;
      await this.actions.collapseExpandedInlineNotes({ list: notesApi.noteListElement({ affordance }) });
      await this.actions.layoutAnchorNotes({ anchorId });
    },

    async expandInlineNote({ source }) {
      const item = source?.closest?.('.margin-notes-target-note');
      if (!item) return;

      const list = item.closest('.margin-notes-target-note-list');
      const toggle = item.querySelector('.margin-notes-target-note-toggle');
      const top = item.offsetTop;

      for (const expanded of list?.querySelectorAll('.margin-notes-target-note.is-expanded') || []) {
        await this.actions.collapseInlineNote({ item: expanded });
      }

      item.style.setProperty('--margin-notes-expanded-top', `${top}px`);
      item.classList.add('is-expanded');
      toggle?.setAttribute('aria-expanded', 'true');
    },

    async collapseInlineNote({ item }) {
      const toggle = item.querySelector('.margin-notes-target-note-toggle');
      item.classList.remove('is-expanded');
      item.style.removeProperty('--margin-notes-expanded-top');
      toggle?.setAttribute('aria-expanded', 'false');
    },

    async collapseExpandedInlineNotes({ list }) {
      if (!list) return;

      for (const note of list.querySelectorAll('.margin-notes-target-note.is-expanded')) {
        await this.actions.collapseInlineNote({ item: note });
      }
    },

    async closeInlineNote({ source }) {
      const item = source?.closest?.('.margin-notes-target-note');
      if (!item) return;

      await this.actions.collapseInlineNote({ item });
      item.querySelector('.margin-notes-target-note-toggle')?.focus();
    },

    async focusNoteAfterRender({ noteId }) {
      setTimeout(() => this.actions.focusNote({ noteId }), 75);
    },

    async focusNote({ noteId }) {
      const notesApi = this.api.notes;
      const buttons = document.body.querySelectorAll('.margin-notes-target-note-toggle[data-simply-value-path]');
      for (const button of buttons) {
        if (notesApi.noteFromElement({ app: this, source: button })?.id === noteId) {
          button.focus();
          return;
        }
      }
    },

    async syncAnchorLayoutDom({ anchorId }) {
      const notesApi = this.api.notes;
      const existing = this.marginNotesRuntime.syncTimers.get(anchorId);
      if (existing) {
        clearTimeout(existing);
      }

      const sync = () => notesApi.syncAnchorLayoutDomNow({ app: this, anchorId });
      sync();
      await notesApi.waitForViewRender();
      sync();
      this.marginNotesRuntime.syncTimers.set(anchorId, setTimeout(sync, 75));
    },

    async updateAnchorNoteState({ anchor }) {
      anchor.noteCount = anchor.notes.length;
    },
  },
  commands: {
    createNote(_element, anchor) {
      return this.actions.createNote({ anchorId: anchor?.id });
    },

    toggleAnchorNoteList(_element, anchor) {
      return this.actions.toggleAnchorNoteList({ anchorId: anchor?.id });
    },

    expandInlineNote(element) {
      return this.actions.expandInlineNote({ source: element });
    },

    collapseInlineNote(element) {
      return this.actions.closeInlineNote({ source: element });
    },

    updateNote(_element, note) {
      return this.actions.updateNote({ noteId: note?.id });
    },

    deleteNote(_element, note) {
      return this.actions.deleteNote({ noteId: note?.id });
    },
  },
  shortcuts: {
    marginNotesNote: {
      arrowdown(event) {
        this.actions.moveNoteFocus({ event, direction: 1 });
        return false;
      },

      arrowright(event) {
        this.actions.moveNoteFocus({ event, direction: 1 });
        return false;
      },

      arrowup(event) {
        this.actions.moveNoteFocus({ event, direction: -1 });
        return false;
      },

      arrowleft(event) {
        this.actions.moveNoteFocus({ event, direction: -1 });
        return false;
      },

      escape(event) {
        this.actions.blurAndCollapseNote({ event });
        return false;
      },
    },
  },
  api: {
    notes: {
      ...annotationModel,
      CobaltEditorModal,
      createSolidNotesConnection,
      authorizePopup,
      path,
      templates: {
        solidConnection: SOLID_CONNECTION_TEMPLATE,
      },
      installedViewAssets: [
        'margin-notes',
        'margin-notes-anchor-widget',
        'margin-notes-inline-note',
        'margin-notes-design-system.css',
        'margin-notes-ui.css',
        'margin-notes-solid-connection.css',
        'margin-notes-cobalt-editor.css',
      ],

      normalizeTheme({ theme }) {
        if (theme === undefined) return 'system';
        if (['system', 'light', 'dark'].includes(theme)) return theme;

        throw new Error('Theme must be "system", "light", or "dark"');
      },

      applyTheme({ app, theme }) {
        app.marginNotesRuntime.themeRoot?.setAttribute('data-margin-notes-theme', theme);
      },

      restoreTheme({ app }) {
        const root = app.marginNotesRuntime.themeRoot;
        if (!root) return;

        if (app.marginNotesRuntime.hadThemeAttribute) {
          root.setAttribute('data-margin-notes-theme', app.marginNotesRuntime.previousThemeAttribute);
        } else {
          root.removeAttribute('data-margin-notes-theme');
        }
      },

      getNotesForAnchor({ app, anchorId }) {
        const anchor = this.findAnchor({ app, anchorId });
        if (!anchor) return [];

        return Array.from(anchor.notes, note => this.toStoredAnnotation({ annotation: note.annotation }));
      },

      hostElement(value) {
        return value?.element || value || null;
      },

      prepareSolidAuthorization({ config }) {
        if (
          config.solid
          || config.discoverySolid
          || config.authorize_callback
          || config.usePopupAuth === false
        ) return {};

        const popup = this.openSolidAuthPopup();
        return {
          authorize_callback: authorizationCodeURL => {
            return this.authorizeSolidPopup({ authorizationCodeURL, popup });
          },
        };
      },

      openSolidAuthPopup() {
        if (typeof globalThis.window?.open !== 'function') return null;

        try {
          return globalThis.window.open('', 'margin-notes-solid-oauth', 'popup,width=520,height=720');
        } catch {
          return null;
        }
      },

      authorizeSolidPopup({ authorizationCodeURL, popup }) {
        return this.authorizePopup(
          authorizationCodeURL,
          popup ? { popup } : {}
        );
      },

      setSolidConnectionStatus({ app, status, message, webId, storageUrl, resourceUrl }) {
        app.data.marginNotes.solidConnection = {
          ...app.data.marginNotes.solidConnection,
          status,
          message,
          webId: webId ?? app.data.marginNotes.solidConnection.webId,
          storageUrl: storageUrl ?? app.data.marginNotes.solidConnection.storageUrl,
          resourceUrl: resourceUrl ?? app.data.marginNotes.solidConnection.resourceUrl,
        };
      },

      solidConnectionMemoryKey({ app }) {
        return `margin-notes.solidConnection.${app.data.marginNotes.namespace || 'default'}`;
      },

      loadRememberedSolidConnection({ app }) {
        if (!globalThis.localStorage) return null;

        try {
          const value = globalThis.localStorage.getItem(this.solidConnectionMemoryKey({ app }));
          if (!value) return null;

          const connection = JSON.parse(value);
          if (typeof connection?.webId !== 'string' || connection.webId.length === 0) return null;
          return connection;
        } catch {
          return null;
        }
      },

      rememberSolidConnection({ app, connection }) {
        if (!globalThis.localStorage) return;

        const value = {
          webId: connection.webId,
          storageUrl: connection.storageUrl,
          resourceUrl: connection.resourceUrl,
          preferencesUrl: connection.preferencesUrl,
          rootFolderUrl: connection.rootFolderUrl,
          issuer: connection.issuer,
        };

        try {
          globalThis.localStorage.setItem(
            this.solidConnectionMemoryKey({ app }),
            JSON.stringify(value)
          );
        } catch {
          // Remembering the WebID is a convenience; connecting still works without storage.
        }
      },

      renderSolidConnectionStatus({ app }) {
        const element = app.marginNotesRuntime.solidConnectionElement;
        const statusElement = element?.querySelector('[data-margin-notes-solid-status]');
        const input = element?.querySelector('[data-margin-notes-solid-webid]');
        const button = element?.querySelector('button[type="submit"]');
        const state = app.data.marginNotes.solidConnection;
        if (!statusElement) return;

        statusElement.textContent = state.message || 'Not connected';
        statusElement.dataset.status = state.status || 'idle';
        if (input && state.webId && input.value !== state.webId) {
          input.value = state.webId;
        }
        if (button) {
          button.disabled = state.status === 'connecting';
        }
      },

      removeInstalledViewAssets() {
        for (const id of this.installedViewAssets) {
          document.getElementById(id)?.remove();
        }
      },

      async setupNotesStorage({ app, storeKey }) {
        if (app.marginNotesRuntime.customStore) {
          return null;
        }

        return this.ensureNotesService({
          app,
          storeKey,
        });
      },

      async ensureNotesService({ app, storeKey = app.data.marginNotes.storeKey }) {
        if (app.marginNotesRuntime.notesService) {
          return app.marginNotesRuntime.notesService;
        }
        if (app.marginNotesRuntime.customStore) {
          return null;
        }

        const legacyGraph = await this.loadGraphFromStore({
          store: app.marginNotesRuntime.store,
          key: storeKey,
        });
        const service = app.marginNotesRuntime.simplySolid({
          localFirst: true,
          app: {
            slug: 'margin-notes',
          },
          data: {
            notes: {
              kind: 'resource',
              local: {
                database: 'margin-notes-workspace',
                store: 'resources',
                key: storeKey,
                prefixes: this.vocabulary.prefixes,
                document: this.toStorageDocument({ subjects: legacyGraph }),
              },
            },
          },
        });

        await service.open();
        app.marginNotesRuntime.notesService = service;
        return service;
      },

      async loadGraph({ app, key, throwOnError = false }) {
        const notesService = await this.ensureNotesService({
          app,
          storeKey: key,
        });
        if (notesService) {
          return notesService.data.notes.list();
        }

        return this.loadGraphFromStore({
          store: app.marginNotesRuntime.store,
          key,
          throwOnError,
        });
      },

      async loadGraphFromStore({ store, key, throwOnError = false }) {
        try {
          const value = await store.load({ key });
          if (!value) return [];

          return this.toStoredGraph({ value });
        } catch (error) {
          if (throwOnError) {
            throw error;
          }
          console.error('Failed to load notes:', error);
          return [];
        }
      },

      async saveGraph({ app, key, subjects }) {
        const notesService = await this.ensureNotesService({
          app,
          storeKey: key,
        });
        if (notesService) {
          await notesService.data.notes.saveAll();
          await this.syncNotesResource({ app });
          return true;
        }

        return this.saveGraphToStore({
          store: app.marginNotesRuntime.store,
          key,
          subjects,
        });
      },

      async saveGraphToStore({ store, key, subjects, throwOnError = false }) {
        try {
          await store.save({
            key,
            value: this.toStorageDocument({ subjects }),
          });
          return true;
        } catch (error) {
          if (throwOnError) {
            throw error;
          }
          console.error('Failed to save notes:', error);
          return false;
        }
      },

      async createStoredAnnotation({ app, annotation }) {
        const notesService = await this.ensureNotesService({ app });
        if (!notesService) {
          return annotation;
        }

        const stored = await notesService.data.notes.create(annotation);
        await this.syncNotesResource({ app });
        return stored;
      },

      async saveStoredAnnotation({ app, annotation }) {
        const notesService = await this.ensureNotesService({ app });
        if (!notesService) {
          return null;
        }

        const saved = await notesService.data.notes.update(
          annotation.id,
          this.toStoredAnnotation({ annotation })
        );
        await this.syncNotesResource({ app });
        return saved;
      },

      async deleteStoredAnnotation({ app, annotation }) {
        const notesService = await this.ensureNotesService({ app });
        if (!notesService) {
          return null;
        }

        const deleted = await notesService.data.notes.delete(annotation.id);
        await this.syncNotesResource({ app });
        return deleted;
      },

      async syncNotesResource({ app }) {
        const notesService = app.marginNotesRuntime.notesService;
        const resource = notesService?.workspace?.resourceById?.get?.('notes');
        if (!resource?.remote) {
          return null;
        }

        const status = await notesService.sync('notes');
        if (status?.ok === false) {
          this.setSolidConnectionStatus({
            app,
            status: 'error',
            message: status.error?.message || `Solid sync failed: ${status.status}`,
          });
          this.renderSolidConnectionStatus({ app });
        }
        return status;
      },

      groupNotesByAnchor({ notes }) {
        return notes.reduce((grouped, note) => {
          const anchorId = this.annotationAnchorId({ annotation: note }) || note.anchorId;
          if (!anchorId) return grouped;

          if (!grouped[anchorId]) {
            grouped[anchorId] = [];
          }
          grouped[anchorId].push(this.toRenderableNote({ annotation: note }));
          return grouped;
        }, {});
      },

      createResizeObserver({ app }) {
        if (typeof ResizeObserver === 'undefined') {
          return;
        }

        return new ResizeObserver(entries => {
          for (const entry of entries) {
            const affordance = app.marginNotesRuntime.anchorAffordances.find(item => item.element === entry.target);
            if (affordance) {
              app.actions.layoutAnchorNotes({ anchorId: affordance.anchorId });
            }
          }
        });
      },

      isValidHostAnchor({ anchor }) {
        return Boolean(
          anchor?.id
          && typeof HTMLElement !== 'undefined'
          && anchor.element instanceof HTMLElement
          && (anchor.slot === undefined || anchor.slot instanceof HTMLElement)
        );
      },

      anchorSlot({ anchor }) {
        return anchor.slot || anchor.element;
      },

      findAnchor({ app, anchorId }) {
        return app?.data.marginNotes.anchors.find(anchor => anchor.id === anchorId);
      },

      findAnchorAffordance({ app, anchorId }) {
        return app.marginNotesRuntime.anchorAffordances.find(affordance => affordance.anchorId === anchorId);
      },

      findNote({ app, noteId }) {
        for (const anchor of app?.data.marginNotes.anchors || []) {
          const index = anchor.notes.findIndex(note => note.id === noteId);
          if (index >= 0) {
            return { anchor, note: anchor.notes[index], index };
          }
        }
      },

      noteListElement({ affordance }) {
        return affordance?.widget.querySelector('.margin-notes-target-note-list');
      },

      noteFromElement({ app, source }) {
        const element = source?.closest?.('[data-simply-value-path]');
        const valuePath = element?.dataset?.simplyValuePath;
        if (!valuePath || !app) return;

        return this.path.get(app.data, valuePath);
      },

      waitForViewRender() {
        return new Promise(resolve => globalThis.setTimeout(resolve, 75));
      },

      syncAnchorLayoutDomNow({ app, anchorId }) {
        app.marginNotesRuntime.syncTimers.delete(anchorId);
        const affordance = this.findAnchorAffordance({ app, anchorId });
        const anchor = this.findAnchor({ app, anchorId });
        if (!affordance || !anchor) return;

        const list = this.noteListElement({ affordance });
        const count = affordance.widget.querySelector('.margin-notes-target-note-count');
        if (!list || !count) return;

        list.classList.toggle('is-expanded', anchor.expanded);
        list.setAttribute('aria-label', `Notes for ${anchor.label}`);
        list.style.setProperty('--margin-notes-open-background', app.marginNotesRuntime.expandedStackBackground);
        count.hidden = !anchor.overflowLabel;
        count.dataset.marginNotesEmpty = anchor.overflowLabel ? 'false' : 'true';
        count.setAttribute('aria-expanded', anchor.expanded ? 'true' : 'false');
        if (anchor.expanded) {
          count.setAttribute('aria-label', `Collapse ${anchor.noteCount} notes`);
        } else if (anchor.visibleNotes.length > 0) {
          const hiddenCount = Math.max(0, anchor.noteCount - anchor.visibleNotes.length);
          count.setAttribute('aria-label', `Show ${hiddenCount} more notes`);
        } else {
          count.setAttribute('aria-label', `Show ${anchor.noteCount} notes`);
        }
      },

      anchorLabel({ anchor }) {
        return (anchor.label || anchor.id).replace(/\s+/g, ' ').trim();
      },

      isNaturallyFocusable({ element }) {
        return element.matches('a[href], button, input, select, textarea, summary, [tabindex]');
      },
    },
  },
};
