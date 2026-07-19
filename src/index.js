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

import { MarginNotes, mount } from './component.js';

/**
 * Global API that the host page receives.
 * 
 * @type {Object}
 * @property {(config: Object) => Object} mount - Mount and return the SimplyFlow app
 * @property {() => MarginNotes} create - Create a new component instance
 */
const MarginNotesAPI = {
  mount(config) {
    return mount(config);
  },

  create() {
    return new MarginNotes();
  },
};

// Export for module systems
export { MarginNotesAPI };
export { MarginNotes };
export { mount };
export {};

// Also attach to global for script-tag usage
if (typeof window !== 'undefined') {
  window.MarginNotes = MarginNotesAPI;
}
