import { annotationVocabulary } from './vocabulary.js';
import oldm from '@muze-nl/oldm';
import { readCobaltFragment, writeCobaltFragment } from './cobalt-fragment-rdf.js';
import { from } from '@muze-nl/jaqt';

export const annotationModel = {
  vocabulary: annotationVocabulary,

  createAnnotationNote({ anchorId, fragment, now = new Date().toISOString() }) {
    const annotationId = this.createLocalSubjectId({});
    const body = {
      id: this.relatedSubjectId({annotationId, part: 'body'}),
      a: this.vocabulary.classes.textualBody,
      dcterms$format: 'text/plain',
      dcterms$modified: now,
      rdf$value: oldm.literal(this.noteText({ fragment })),
      schema$text: oldm.literal(this.noteText({ fragment })),
      cobalt$fragment: writeCobaltFragment(fragment),
    };
    const target = {
      id: this.relatedSubjectId({annotationId, part: 'target'}),
      a: this.vocabulary.classes.specificResource,
      oa$hasSource: this.currentDocumentIri({}),
      oa$hasSelector: {
        id: this.relatedSubjectId({annotationId, part: 'selector-fragment'}),
        a: this.vocabulary.classes.fragmentSelector,
        rdf$value: oldm.literal(anchorId),
      },
    };

    return {
      id: annotationId,
      a: this.vocabulary.classes.annotation,
      dcterms$created: now,
      dcterms$modified: now,
      oa$hasBody: body,
      oa$hasTarget: target,
    };
  },

  relatedSubjectId({ annotationId, part }) {
    return `${annotationId}${annotationId.includes('#') ? '-' : '#'}${part}`;
  },

  createLocalSubjectId() {
    if (globalThis.crypto?.randomUUID) {
      return `urn:uuid:${globalThis.crypto.randomUUID()}`;
    }

    return `urn:muze:margin-notes:${Date.now()}-${Math.random().toString(16).slice(2)}`;
  },

  currentDocumentIri() {
    const href = globalThis.location?.href;
    if (!href) {
      return 'urn:muze:margin-notes:local-document';
    }

    return href.replace(/#.*/, '');
  },

  annotationAnchorId({ annotation }) {
    const target = oldm.one(annotation?.oa$hasTarget, 'first');
    const fragment = from(oldm.many(target?.oa$hasSelector))
      .where(selector => (
        oldm.many(selector?.a).includes(this.vocabulary.classes.fragmentSelector)
      ))[0];

    if (fragment?.rdf$value != null) {
      return String(fragment.rdf$value);
    }
    return fragment?.rdf$value;
  },

  annotationBody({ annotation }) {
    return oldm.one(annotation?.oa$hasBody, 'first');
  },

  annotationBodyFragment({ annotation }) {
    return readCobaltFragment(this.annotationBody({ annotation })?.cobalt$fragment);
  },

  updateAnnotationBody({ annotation, fragment, now = new Date().toISOString() }) {
    const body = this.annotationBody({ annotation });
    if (!body) {
      throw new TypeError('annotation-model: annotation has no body');
    }
    const storedFragment = writeCobaltFragment(fragment, body.graph);

    body.rdf$value = oldm.literal(this.noteText({ fragment }));
    body.schema$text = oldm.literal(this.noteText({ fragment }));
    body.cobalt$fragment = storedFragment;
    annotation.dcterms$modified = now;
    body.dcterms$modified = now;
  },

  removeAnnotationFromGraph({ app, annotationId }) {
    const index = app.data.marginNotes.graph.findIndex(annotation => annotation.id === annotationId);
    if (index >= 0) {
      app.data.marginNotes.graph.splice(index, 1);
    }
  },

  toRenderableNote({ annotation }) {
    const note = {
      id: annotation.id,
      annotation,
      anchorId: this.annotationAnchorId({ annotation }),
      body: this.annotationBodyFragment({ annotation }),
      created: annotation.dcterms$created,
      modified: annotation.dcterms$modified,
    };

    return this.syncRenderableNote({ note });
  },

  syncRenderableNote({ note }) {
    const annotation = note.annotation;
    const fragment = this.annotationBodyFragment({ annotation });
    note.anchorId = this.annotationAnchorId({ annotation });
    note.body = fragment;
    note.bodyText = this.noteText({ fragment });
    note.created = annotation.dcterms$created;
    note.modified = annotation.dcterms$modified;
    note.createdLabel = `Created: ${(note.created || '').substring(0, 10)}`;

    return note;
  },

  isOldmedAnnotation({ value }) {
    return (
      oldm.many(value?.a).includes(this.vocabulary.classes.annotation)
    );
  },

  isMarginNoteAnnotation({ value }) {
    return Boolean(
      this.isOldmedAnnotation({ value })
      && this.annotationBody({ annotation: value })
      && this.annotationAnchorId({ annotation: value })
    );
  },

  noteText({ fragment }) {
    if (fragment?.text != null) {
      return String(fragment.text);
    }
    return '(empty note)';
  },
};
