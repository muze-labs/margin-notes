import { annotationVocabulary } from './vocabulary.js';
import oldm from '@muze-nl/oldm';
import { readCobaltFragment, writeCobaltFragment } from './cobalt-fragment-rdf.js';

export const annotationModel = {
  vocabulary: annotationVocabulary,
  replicaPolicy: {
    ownedPredicates: [
      annotationVocabulary.prefixes.dcterms + 'hasFormat',
      annotationVocabulary.prefixes.cobalt + 'fragment',
      annotationVocabulary.prefixes.cobalt + 'annotations',
    ],
    scalarPredicates: [
      annotationVocabulary.prefixes.oa + 'hasBody',
      annotationVocabulary.prefixes.dcterms + 'hasFormat',
      annotationVocabulary.prefixes.dcterms + 'format',
      annotationVocabulary.prefixes.cobalt + 'fragment',
      annotationVocabulary.prefixes.rdf + 'value',
      ...['annotations', 'start', 'end', 'tag', 'order'].map(
        name => annotationVocabulary.prefixes.cobalt + name,
      ),
    ],
  },

  createAnnotationNote({
    anchorId, fragment, subjects = [], sequence = {},
    now = new Date().toISOString(),
  }) {
    const annotationId = this.createAnnotationId({ subjects, sequence });
    const storedFragment = writeCobaltFragment(fragment, {
      id: this.relatedSubjectId({ annotationId, part: 'fragment' }),
      htmlId: this.relatedSubjectId({ annotationId, part: 'html' }),
    });

    return {
      id: annotationId,
      a: this.vocabulary.classes.annotation,
      dcterms$created: now,
      dcterms$modified: now,
      oa$hasBody: storedFragment.dcterms$hasFormat,
      cobalt$fragment: storedFragment,
      oa$hasTarget: `${this.currentDocumentIri({})}#${encodeURIComponent(anchorId)}`,
    };
  },

  relatedSubjectId({ annotationId, part }) {
    return `${annotationId}${annotationId.includes('#') ? '-' : '#'}${part}`;
  },

  restoreAnnotationSequence({ subjects, sequence }) {
    // Read the whole resource, including tombstones, so deleted IDs stay reserved.
    const identifiers = subjects.map(subject => (
      subject.id?.match(/#margin-note-([A-Za-z0-9_-]{8})-([1-9][0-9]*)$/)
    )).filter(Boolean);
    if (!sequence.code) {
      const codes = identifiers.map(match => match[1]).sort();
      sequence.code = codes[0];
    }
    for (const match of identifiers) {
      if (match[1] === sequence.code) {
        sequence.counter = Math.max(sequence.counter || 0, Number(match[2]));
      }
    }
  },

  createAnnotationId({ subjects, sequence }) {
    this.restoreAnnotationSequence({ subjects, sequence });
    sequence.code ||= randomCode();
    sequence.counter = (sequence.counter || 0) + 1;
    if (!Number.isSafeInteger(sequence.counter)) {
      throw new RangeError('annotation-model: annotation counter exhausted');
    }
    return `${this.currentDocumentIri({})}#margin-note-${sequence.code}-${sequence.counter}`;
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
    const iri = typeof target === 'string' ? target : target?.id;
    if (!iri || !iri.startsWith(`${this.currentDocumentIri({})}#`)) {
      return undefined;
    }
    try {
      return decodeURIComponent(iri.slice(iri.indexOf('#') + 1)) || undefined;
    } catch {
      return undefined;
    }
  },

  annotationBody({ annotation }) {
    return oldm.one(annotation?.oa$hasBody, 'first');
  },

  annotationBodyFragment({ annotation }) {
    return readCobaltFragment(oldm.one(annotation?.cobalt$fragment, 'first'));
  },

  updateAnnotationBody({ annotation, fragment, now = new Date().toISOString() }) {
    const body = this.annotationBody({ annotation });
    const storedFragment = oldm.one(annotation?.cobalt$fragment, 'first');
    if (!body || !storedFragment) {
      throw new TypeError('annotation-model: annotation needs a body and Cobalt fragment');
    }
    writeCobaltFragment(fragment, {
      id: storedFragment.id,
      htmlId: body.id,
      graph: storedFragment.graph,
    });
    annotation.dcterms$modified = now;
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
      && oldm.many(oldm.one(value.cobalt$fragment, 'first')?.a).includes(this.vocabulary.classes.cobaltFragment)
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

function randomCode() {
  return btoa(String.fromCharCode(
    ...globalThis.crypto.getRandomValues(new Uint8Array(6)),
  )).replace(/\+/g, '-').replace(/\//g, '_');
}
