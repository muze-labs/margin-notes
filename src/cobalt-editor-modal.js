/**
 * Cobalt Note Editor Modal
 * 
 * Creates a modal dialog for editing notes with Cobalt rich text editor.
 */

import { edit } from '@muze-labs/cobalt-rich-text-note';
import COBALT_EDITOR_TEMPLATE from './cobalt-editor-modal.html';
import COBALT_EDITOR_STYLES from './cobalt-editor-modal.css';

export { COBALT_EDITOR_STYLES };

let modalId = 0;

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
      
      const modal = this.modal;
      let settled = false;

      const finish = (value) => {
        if (settled) return;

        settled = true;
        if (modal.matches(':popover-open')) {
          modal.hidePopover();
        }
        this.destroy();
        resolve(value);
      };
      
      const onSave = async () => {
        const edited = this.editor.getValue();
        finish(edited);
      };
      
      const onCancel = () => {
        finish(null);
      };

      const onModalKeydown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          e.stopPropagation();
          onSave();
          return;
        }

        e.stopPropagation();
      };

      const onToggle = (e) => {
        if (e.newState === 'closed') {
          onCancel();
        }
      };

      modal.querySelector('[data-action="save"]').addEventListener('click', onSave);
      modal.addEventListener('keydown', onModalKeydown);
      modal.addEventListener('toggle', onToggle);
      modal.showPopover();
      
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
    modalId += 1;
    this.modal.id = `margin-notes-editor-modal-${modalId}`;
    this.modal.dataset.readerKeyScope = 'margin-notes-editor';
    this.modal.setAttribute('popover', 'auto');
    this.modal.innerHTML = COBALT_EDITOR_TEMPLATE;
    this.modal.querySelector('[data-title]').textContent = this.options.title || 'Edit note';
    this.modal.querySelectorAll('[data-action="cancel"]').forEach(cancelBtn => {
      cancelBtn.setAttribute('popovertarget', this.modal.id);
      cancelBtn.setAttribute('popovertargetaction', 'hide');
    });
    
    document.body.appendChild(this.modal);
    
    // Create the Cobalt editor in the container
    const editorContainer = this.modal.querySelector('[data-editor-container]');
    this.editor = edit(editorContainer, this.fragment);
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
