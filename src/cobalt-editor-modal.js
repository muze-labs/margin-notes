/**
 * Cobalt Note Editor Modal
 * 
 * Creates a modal dialog for editing notes with Cobalt rich text editor.
 */

import { edit } from '@cobalt/rich-text-note';

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
    this.modal.innerHTML = `
      <div class="margin-notes-editor-modal-backdrop"></div>
      <div class="margin-notes-editor-modal-dialog">
        <div class="margin-notes-editor-modal-header">
          <h2>${this.options.title || 'Edit note'}</h2>
          <button type="button" data-action="cancel" class="margin-notes-editor-close" aria-label="Close">×</button>
        </div>
        <div class="margin-notes-editor-modal-content">
          <div class="margin-notes-cobalt-editor" data-editor-container></div>
        </div>
        <div class="margin-notes-editor-modal-footer">
          <button type="button" data-action="cancel" class="margin-notes-editor-btn-cancel">Cancel</button>
          <button type="button" data-action="save" class="margin-notes-editor-btn-save">Save</button>
        </div>
      </div>
    `;
    
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

/**
 * CSS styles for the Cobalt editor modal.
 */
export const COBALT_EDITOR_STYLES = `
  .margin-notes-editor-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .margin-notes-editor-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  }

  .margin-notes-editor-modal-dialog {
    position: relative;
    z-index: 10001;
    background: white;
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .margin-notes-editor-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .margin-notes-editor-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .margin-notes-editor-close {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .margin-notes-editor-close:hover {
    background: #f3f4f6;
    color: #1f2937;
  }

  .margin-notes-editor-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .margin-notes-cobalt-editor {
    min-height: 150px;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 8px;
    background: #fafafa;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.5;
  }

  .margin-notes-cobalt-editor:focus-within {
    outline: none;
    border-color: #3b82f6;
    background: white;
  }

  .margin-notes-editor-modal-footer {
    padding: 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .margin-notes-editor-btn-cancel,
  .margin-notes-editor-btn-save {
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #d1d5db;
    font-size: 0.95rem;
  }

  .margin-notes-editor-btn-cancel {
    background: white;
    color: #374151;
  }

  .margin-notes-editor-btn-cancel:hover {
    background: #f3f4f6;
  }

  .margin-notes-editor-btn-save {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .margin-notes-editor-btn-save:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .margin-notes-editor-btn-save:active {
    background: #1d4ed8;
  }
`;
