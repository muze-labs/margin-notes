/**
 * Margin Notes Component with Cobalt Integration
 * 
 * M1.1 implementation:
 * - Mount through host API
 * - Accept stable anchors from host
 * - Store and restore notes from browser storage
 * - Edit notes with Cobalt rich text editor
 */

import { app, html } from '@muze-labs/simplyflow';
import { CobaltEditorModal, COBALT_EDITOR_STYLES } from './cobalt-editor-modal.js';

const MARGIN_NOTES_ROOT_TEMPLATE = html`
  <div class="margin-notes-list" data-simply-list="anchors">
    <template rel="margin-notes-anchor"></template>
  </div>
`;

const MARGIN_NOTES_ANCHOR_TEMPLATE = html`
  <div class="margin-notes-anchor">
    <h3 data-simply-field="label" data-simply-transform="escape_html"></h3>
    <p class="margin-notes-empty" data-simply-field="emptyMessage" data-simply-transform="escape_html"></p>
    <ul data-simply-list="notes">
      <template rel="margin-notes-note"></template>
    </ul>
    <button
      type="button"
      class="margin-notes-anchor-add-btn"
      data-simply-command="createNote"
      data-simply-value=":value.id"
    >+ Add note</button>
  </div>
`;

const MARGIN_NOTES_NOTE_TEMPLATE = html`
  <li class="margin-notes-item">
    <p class="margin-notes-item-text" data-simply-field="bodyText" data-simply-transform="escape_html"></p>
    <small class="margin-notes-item-meta" data-simply-field="createdLabel" data-simply-transform="escape_html"></small>
    <div class="margin-notes-item-actions">
      <button
        type="button"
        class="margin-notes-item-btn margin-notes-item-btn-edit"
        data-simply-command="editNote"
        data-simply-value=":value.id"
      >Edit</button>
      <button
        type="button"
        class="margin-notes-item-btn margin-notes-item-btn-delete"
        data-simply-command="deleteNote"
        data-simply-value=":value.id"
      >Delete</button>
    </div>
  </li>
`;

/**
 * Internal representation of a note in memory.
 * Uses Cobalt Fragment format for the body: { text, annotations }
 *
 * @typedef {Object} LocalNote
 * @property {string} id - Unique note identifier
 * @property {string} anchorId - Anchor this note is attached to
 * @property {Object} body - Cobalt Fragment { text: string, annotations: Array }
 * @property {string} created - ISO timestamp when created
 * @property {string} modified - ISO timestamp of last modification
 */

/**
 * The margin notes component instance.
 */
export class MarginNotes {
  constructor() {
    this.app = null;
  }

  /**
   * Initialize the component with host configuration.
   * Loads any previously stored notes from browser storage.
   * 
   * @param {Object} config - HostConfig with anchors and container
   * @returns {Promise<void>}
   */
  async initialize(config) {
    if (!config) {
      throw new Error('Config is required');
    }
    if (!Array.isArray(config.anchors)) {
      throw new Error('Config must have anchors array');
    }
    if (!config.container || !config.container.element) {
      throw new Error('Config must have container with element');
    }

    if (this.app) {
      await this.destroy();
    }

    this.mountView(config);
  }

  /**
   * Clean up and unmount the component.
   * 
   * @returns {Promise<void>}
   */
  async destroy() {
    if (!this.app) return;

    const container = this.app.container;
    this.app.destroy();
    this.app = null;
    container.replaceChildren();
  }

  /**
   * Create a new note for a given anchor.
   * Opens Cobalt editor modal for editing.
   * 
   * @param {string} anchorId - ID of the anchor this note targets
   * @returns {Promise<void>}
   */
  async createNote(anchorId) {
    const anchor = this.findAnchor(anchorId);
    if (!anchor) return;
    
    const modal = new CobaltEditorModal({
      title: 'New note',
      initialFragment: { text: '', annotations: [] }
    });
    
    const fragment = await modal.show();
    if (!fragment) return; // User cancelled
    
    const id = `note-${Date.now()}`;
    const now = new Date().toISOString();
    
    const note = {
      id,
      anchorId,
      body: fragment,
      created: now,
      modified: now,
    };
    
    anchor.notes.push(this.toRenderableNote(note));
    anchor.emptyMessage = this.emptyMessageFor(anchor.notes);
    this.saveToStorage();
  }

  /**
   * Update an existing note.
   * Opens Cobalt editor modal for editing.
   * 
   * @param {string} noteId - ID of the note to update
   * @returns {Promise<void>}
   */
  async updateNote(noteId) {
    const match = this.findNote(noteId);
    if (!match) return;
    
    const modal = new CobaltEditorModal({
      title: 'Edit note',
      initialFragment: match.note.body
    });
    
    const fragment = await modal.show();
    if (!fragment) return; // User cancelled
    
    match.note.body = fragment;
    match.note.bodyText = this.noteText(fragment);
    match.note.modified = new Date().toISOString();
    this.saveToStorage();
  }

  /**
   * Delete a note.
   * 
   * @param {string} noteId - ID of the note to delete
   */
  deleteNote(noteId) {
    const match = this.findNote(noteId);
    if (!match) return;

    match.anchor.notes.splice(match.index, 1);
    match.anchor.emptyMessage = this.emptyMessageFor(match.anchor.notes);
    this.saveToStorage();
  }

  /**
   * Get all notes for a specific anchor.
   * 
   * @param {string} anchorId - The anchor ID to query
   * @returns {LocalNote[]} Array of notes for this anchor
   */
  getNotesForAnchor(anchorId) {
    const anchor = this.findAnchor(anchorId);
    if (!anchor) return [];

    return Array.from(anchor.notes, note => this.toStoredNote(note));
  }

  /**
   * Save notes to browser storage.
   * Stores Cobalt fragments (not yet RDF).
   * 
   * @private
   */
  saveToStorage() {
    if (!this.app) return;

    try {
      const data = this.app.data.anchors.flatMap(anchor => {
        return Array.from(anchor.notes, note => this.toStoredNote(note));
      });
      localStorage.setItem(this.app.data.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save notes to storage:', e);
    }
  }

  /**
   * Load notes from browser storage.
   * 
   * @private
   * @param {string} storageKey - Browser storage key
   * @returns {LocalNote[]} Stored notes
   */
  loadFromStorage(storageKey) {
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return [];
      
      const notes = JSON.parse(data);
      return Array.isArray(notes) ? notes : [];
    } catch (e) {
      console.error('Failed to load notes from storage:', e);
      return [];
    }
  }

  /**
   * Mount the SimplyFlow view.
   * 
   * @param {Object} config - HostConfig with anchors and container
   * @private
   */
  mountView(config) {
    const container = config.container.element;
    const storageKey = config.storageKey || `margin-notes-${config.namespace || 'default'}`;
    const component = this;

    container.innerHTML = '<simply-render rel="margin-notes"></simply-render>';
    this.app = app({
      container,
      templates: {
        'margin-notes': MARGIN_NOTES_ROOT_TEMPLATE,
        'margin-notes-anchor': MARGIN_NOTES_ANCHOR_TEMPLATE,
        'margin-notes-note': MARGIN_NOTES_NOTE_TEMPLATE,
      },
      styles: {
        'margin-notes-cobalt-editor': COBALT_EDITOR_STYLES,
      },
      data: {
        anchors: [],
        storageKey: '',
      },
      commands: {
        createNote: (_button, anchorId) => this.createNote(anchorId),
        editNote: (_button, noteId) => this.updateNote(noteId),
        deleteNote: (_button, noteId) => this.deleteNote(noteId),
      },
      start() {
        this.data.storageKey = storageKey;
        const notesByAnchor = component.groupNotesByAnchor(component.loadFromStorage(storageKey));
        this.data.anchors = config.anchors.map(anchor => {
          const notes = notesByAnchor[anchor.id] || [];
          return {
            id: anchor.id,
            label: anchor.label || anchor.id,
            emptyMessage: notes.length === 0 ? 'No notes yet' : '',
            notes,
          };
        });
      },
    });
  }

  /**
   * Group stored Cobalt notes by anchor for SimplyFlow's start hook.
   *
   * @private
   * @param {LocalNote[]} notes - Stored notes
   * @returns {Object<string, Array<Object>>}
   */
  groupNotesByAnchor(notes) {
    return notes.reduce((grouped, note) => {
      if (!grouped[note.anchorId]) {
        grouped[note.anchorId] = [];
      }
      grouped[note.anchorId].push(this.toRenderableNote(note));
      return grouped;
    }, {});
  }

  /**
   * Find a reactive anchor by id.
   *
   * @private
   * @param {string} anchorId - Anchor id
   * @returns {Object|undefined}
   */
  findAnchor(anchorId) {
    return this.app?.data.anchors.find(anchor => anchor.id === anchorId);
  }

  /**
   * Find a reactive note and its owning anchor.
   *
   * @private
   * @param {string} noteId - Note id
   * @returns {{ anchor: Object, note: Object, index: number }|undefined}
   */
  findNote(noteId) {
    for (const anchor of this.app?.data.anchors || []) {
      const index = anchor.notes.findIndex(note => note.id === noteId);
      if (index >= 0) {
        return { anchor, note: anchor.notes[index], index };
      }
    }
  }

  /**
   * Add view fields used by SimplyFlow templates to a stored note.
   *
   * @private
   * @param {LocalNote} note - Stored note
   * @returns {Object}
   */
  toRenderableNote(note) {
    return {
      ...note,
      bodyText: this.noteText(note.body),
      createdLabel: `Created: ${note.created.substring(0, 10)}`,
    };
  }

  /**
   * Strip view fields before returning or storing notes.
   *
   * @private
   * @param {Object} note - Reactive note
   * @returns {LocalNote}
   */
  toStoredNote(note) {
    return {
      id: note.id,
      anchorId: note.anchorId,
      body: note.body,
      created: note.created,
      modified: note.modified,
    };
  }

  /**
   * Get display text for a Cobalt fragment.
   *
   * @private
   * @param {Object} fragment - Cobalt fragment
   * @returns {string}
   */
  noteText(fragment) {
    return fragment?.text || '(empty note)';
  }

  /**
   * Message shown for anchors without notes.
   *
   * @private
   * @param {Array<Object>} notes - Reactive notes
   * @returns {string}
   */
  emptyMessageFor(notes) {
    return notes.length === 0 ? 'No notes yet' : '';
  }
}
