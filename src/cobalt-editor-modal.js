/**
 * Cobalt Note Editor Modal
 * 
 * Creates a modal dialog for editing notes with Cobalt rich text editor.
 */

import { edit } from '@cobalt/rich-text-note';
import COBALT_EDITOR_TEMPLATE from './cobalt-editor-modal.html';
import COBALT_EDITOR_STYLES from './cobalt-editor-modal.css';

export { COBALT_EDITOR_STYLES };

/**
 * Simple promise-based modal for editing a note with Cobalt.
 * 
 * @param {Object} options
 * @param {string} [options.title] - Modal title
 * @param {Object} options.initialFragment - Initial Cobalt Fragment { text, annotations }
 * @param {Function} options.onSave - Callback when note is saved
 * @returns {Promise<Object>} The edited fragment
 */
export class CobaltEditorModal {
  constructor(options = {}) {
    this.options = options;
    this.modal = null;
    this.editor = null;
    this.fragment = options.initialFragment || { text: '', annotations: [] };
  }

  /**
   * Show the modal and return a promise that resolves with the edited fragment.
   * 
   * @returns {Promise<Object>} The edited fragment, or null if cancelled
   */
  async show() {
    return new Promise((resolve) => {
      this.createModal();
      
      const saveBtn = this.modal.querySelector('[data-action="save"]');
      const cancelBtn = this.modal.querySelector('[data-action="cancel"]');
      
      const onSave = async () => {
        const edited = this.editor.getValue();
        this.destroy();
        resolve(edited);
      };
      
      const onCancel = () => {
        this.destroy();
        resolve(null);
      };
      
      saveBtn.addEventListener('click', onSave);
      cancelBtn.addEventListener('click', onCancel);
      
      // Also allow Ctrl+S to save
      this.modal.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          onSave();
        }
      });
      
      // Focus the editor
      setTimeout(() => {
        this.editor.focus();
      }, 0);
    });
  }

  /**
   * Create the modal DOM structure.
   * 
   * @private
   */
  createModal() {
    // Create modal overlay
    this.modal = document.createElement('div');
    this.modal.className = 'margin-notes-editor-modal';
    this.modal.dataset.readerKeyScope = 'margin-notes-editor';
    this.modal.innerHTML = COBALT_EDITOR_TEMPLATE;
    this.modal.querySelector('[data-title]').textContent = this.options.title || 'Edit note';
    
    document.body.appendChild(this.modal);
    
    // Create the Cobalt editor in the container
    const editorContainer = this.modal.querySelector('[data-editor-container]');
    this.editor = edit(editorContainer, this.fragment);
    
    // Close on backdrop click
    const backdrop = this.modal.querySelector('.margin-notes-editor-modal-backdrop');
    backdrop.addEventListener('click', () => {
      this.modal.querySelector('[data-action="cancel"]').click();
    });
  }

  /**
   * Destroy the modal and clean up.
   * 
   * @private
   */
  destroy() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
