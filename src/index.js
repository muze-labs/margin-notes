/**
 * Margin Notes - Entry Point
 * 
 * The host page loads this as a script tag and receives the API object.
 * 
 * Usage:
 *   <script src="margin-notes.js"></script>
 *   <script>
 *     const component = MarginNotes.create();
 *     await component.initialize({
 *       anchors: [ ... ],
 *       container: { element: document.getElementById('notes') }
 *     });
 *   </script>
 */

import { MarginNotes } from './component.js';

/**
 * Global API that the host page receives.
 * 
 * @type {Object}
 * @property {() => MarginNotes} create - Create a new component instance
 */
const MarginNotesAPI = {
  create() {
    return new MarginNotes();
  },
};

// Export for module systems
export { MarginNotesAPI };
export { MarginNotes };
export {};

// Also attach to global for script-tag usage
if (typeof window !== 'undefined') {
  window.MarginNotes = MarginNotesAPI;
}
