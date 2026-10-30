/**
 * Margin Notes - Entry Point
 * 
 * The host page loads this as a script tag and receives the API object.
 * 
 * Usage:
 *   <script src="margin-notes.js"></script>
 *   <script>
 *     const app = MarginNotes.mount({
 *       anchors: [ ... ],
 *       container: { element: document.getElementById('notes') }
 *     });
 *   </script>
 */

import { mount } from './component.js';
import { createSolidResourceStore } from './storage/solid-resource-store.js';
import { createSolidNotesConnection, notesResourceUrlForPage } from './storage/solid-notes-location.js';
import { popupHandleRedirect } from '@muze-labs/jsfs-solid';

/**
 * Global API that the host page receives.
 * 
 * @type {Object}
 * @property {(config: Object) => Object} mount - Mount and return the SimplyFlow app
 * @property {(options: Object) => Object} createSolidResourceStore - Create a Solid resource-backed store
 */
const MarginNotesAPI = {
  mount(config) {
    return mount(config);
  },

  createSolidResourceStore(options) {
    return createSolidResourceStore(options);
  },

  createSolidNotesConnection(options) {
    return createSolidNotesConnection(options);
  },

  notesResourceUrlForPage(options) {
    return notesResourceUrlForPage(options);
  },

  popupHandleRedirect(origin) {
    return popupHandleRedirect(origin);
  },
};

// Export for module systems
export { MarginNotesAPI };
export { mount };
export { createSolidResourceStore };
export { createSolidNotesConnection, notesResourceUrlForPage };
export { popupHandleRedirect };
export {};

// Also attach to global for script-tag usage
if (typeof window !== 'undefined') {
  window.MarginNotes = MarginNotesAPI;
}
