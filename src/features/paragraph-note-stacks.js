import { path } from '@muze-labs/simplyflow';
import { CobaltEditorModal, COBALT_EDITOR_STYLES } from '../cobalt-editor-modal.js';
import { annotationModel } from './paragraph-note-stacks/annotation-model.js';
import MARGIN_NOTES_ROOT_TEMPLATE from './paragraph-note-stacks/root.html';
import MARGIN_NOTES_ANCHOR_WIDGET_TEMPLATE from './paragraph-note-stacks/anchor-widget.html';
import MARGIN_NOTES_INLINE_NOTE_TEMPLATE from './paragraph-note-stacks/inline-note.html';
import MARGIN_NOTES_UI_STYLES from './paragraph-note-stacks/ui.css';

export const paragraphNoteStacks = {
  templates: {
    'margin-notes': MARGIN_NOTES_ROOT_TEMPLATE,
    'margin-notes-anchor-widget': MARGIN_NOTES_ANCHOR_WIDGET_TEMPLATE,
    'margin-notes-inline-note': MARGIN_NOTES_INLINE_NOTE_TEMPLATE,
  },
  styles: {
    'margin-notes-ui': MARGIN_NOTES_UI_STYLES,
    'margin-notes-cobalt-editor': COBALT_EDITOR_STYLES,
  },
  actions: {
    async setupParagraphNoteStacks({ anchors, storeKey }) {
      const notesApi = this.api.notes;
      this.data.marginNotes.storeKey = storeKey;
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
      this.marginNotesRuntime.mountContainer?.replaceChildren();
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
      this.data.marginNotes.graph.push(annotation);
      anchor.notes.push(notesApi.toRenderableNote({ annotation }));
      await this.actions.updateAnchorNoteState({ anchor });
      await this.actions.renderAnchorNotes({ anchor });
      await this.actions.saveNotes({});
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
      await this.actions.renderAnchorNotes({ anchor: match.anchor });
      await this.actions.saveNotes({});
    },

    async deleteNote({ noteId }) {
      const notesApi = this.api.notes;
      const match = notesApi.findNote({ app: this, noteId });
      if (!match) return;

      match.anchor.notes.splice(match.index, 1);
      notesApi.removeAnnotationFromGraph({
        app: this,
        annotationId: match.note.id,
      });
      await this.actions.updateAnchorNoteState({ anchor: match.anchor });
      await this.actions.renderAnchorNotes({ anchor: match.anchor });
      await this.actions.saveNotes({});
    },

    async saveNotes() {
      const notesApi = this.api.notes;
      await notesApi.saveGraph({
        app: this,
        key: this.data.marginNotes.storeKey,
        subjects: this.data.marginNotes.graph,
      });
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
      path,
      installedViewAssets: [
        'margin-notes',
        'margin-notes-anchor-widget',
        'margin-notes-inline-note',
        'margin-notes-ui.css',
        'margin-notes-cobalt-editor.css',
      ],

      getNotesForAnchor({ app, anchorId }) {
        const anchor = this.findAnchor({ app, anchorId });
        if (!anchor) return [];

        return Array.from(anchor.notes, note => this.toStoredAnnotation({ annotation: note.annotation }));
      },

      removeInstalledViewAssets() {
        for (const id of this.installedViewAssets) {
          document.getElementById(id)?.remove();
        }
      },

      async loadGraph({ app, key }) {
        try {
          const value = await app.marginNotesRuntime.store.load({ key });
          if (!value) return [];

          return this.toStoredGraph({ value });
        } catch (error) {
          console.error('Failed to load notes:', error);
          return [];
        }
      },

      async saveGraph({ app, key, subjects }) {
        try {
          await app.marginNotesRuntime.store.save({
            key,
            value: this.toStorageDocument({ subjects }),
          });
          return true;
        } catch (error) {
          console.error('Failed to save notes:', error);
          return false;
        }
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
