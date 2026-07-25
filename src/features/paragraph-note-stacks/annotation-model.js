import oldm from '@muze-nl/oldm';
import { from } from '@muze-nl/jaqt';

export const annotationModel = {
  vocabulary: {
    prefixes: {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      dcterms: 'http://purl.org/dc/terms/',
      oa: 'http://www.w3.org/ns/oa#',
      schema: 'https://schema.org/',
      cobalt: 'https://vocab.muze.nl/cobalt#',
    },
    classes: {
      annotation: 'oa$Annotation',
      textualBody: 'oa$TextualBody',
      specificResource: 'oa$SpecificResource',
      fragmentSelector: 'oa$FragmentSelector',
      cobaltFragment: 'cobalt$Fragment',
    },
    predicates: {
      type: 'rdf$type',
      label: 'rdfs$label',
      created: 'dcterms$created',
      modified: 'dcterms$modified',
      format: 'dcterms$format',
      value: 'rdf$value',
      hasBody: 'oa$hasBody',
      hasTarget: 'oa$hasTarget',
      hasSource: 'oa$hasSource',
      hasSelector: 'oa$hasSelector',
      text: 'schema$text',
      cobaltFragment: 'cobalt$fragment',
    },
    mediaTypes: {
      cobaltFragment: 'application/vnd.cobalt.fragment+json',
    },
  },

  createAnnotationNote({ anchorId, fragment, now = new Date().toISOString() }) {
    const annotationId = this.createLocalSubjectId({});
    const body = {
      id: `${annotationId}#body`,
      rdf$type: [
        this.vocabulary.classes.textualBody,
        this.vocabulary.classes.cobaltFragment,
      ],
      dcterms$format: this.vocabulary.mediaTypes.cobaltFragment,
      rdf$value: this.noteText({ fragment }),
      schema$text: this.noteText({ fragment }),
      cobalt$fragment: fragment,
    };
    const target = {
      id: `${annotationId}#target`,
      rdf$type: this.vocabulary.classes.specificResource,
      oa$hasSource: this.currentDocumentIri({}),
      oa$hasSelector: {
        id: `${annotationId}#selector-fragment`,
        rdf$type: this.vocabulary.classes.fragmentSelector,
        rdf$value: anchorId,
      },
    };

    return {
      id: annotationId,
      rdf$type: this.vocabulary.classes.annotation,
      dcterms$created: now,
      dcterms$modified: now,
      oa$hasBody: body,
      oa$hasTarget: target,
    };
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
      .where(selector => oldm.many(selector?.rdf$type).includes(this.vocabulary.classes.fragmentSelector))[0];

    return fragment?.rdf$value;
  },

  annotationBody({ annotation }) {
    return oldm.one(annotation?.oa$hasBody, 'first');
  },

  annotationBodyFragment({ annotation }) {
    return this.annotationBody({ annotation })?.cobalt$fragment || { text: '', annotations: [] };
  },

  updateAnnotationBody({ annotation, fragment, now = new Date().toISOString() }) {
    const body = this.annotationBody({ annotation });
    if (!body) return;

    body.rdf$value = this.noteText({ fragment });
    body.schema$text = this.noteText({ fragment });
    body.cobalt$fragment = fragment;
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

  toStoredAnnotation({ annotation }) {
    return this.cloneValue({ value: annotation });
  },

  toStorageDocument({ subjects }) {
    return {
      format: 'margin-notes-oldmed-graph',
      version: 1,
      prefixes: this.vocabulary.prefixes,
      subjects: Array.from(from(subjects)
        .where(annotation => this.isMarginNoteAnnotation({ value: annotation }))
        .select(annotation => this.toStoredAnnotation({ annotation }))),
    };
  },

  toStoredGraph({ value }) {
    if (Array.isArray(value)) {
      return Array.from(from(value)
        .select(note => {
          if (this.isMarginNoteAnnotation({ value: note })) {
            return note;
          }

          return this.annotationFromLegacyNote({ note });
        })
        .where(annotation => this.isMarginNoteAnnotation({ value: annotation })));
    }

    if (Array.isArray(value?.subjects)) {
      return Array.from(from(value.subjects)
        .where(subject => this.isMarginNoteAnnotation({ value: subject })));
    }

    return [];
  },

  isOldmedAnnotation({ value }) {
    return oldm.many(value?.rdf$type).includes(this.vocabulary.classes.annotation);
  },

  isMarginNoteAnnotation({ value }) {
    return Boolean(
      this.isOldmedAnnotation({ value })
      && this.annotationBody({ annotation: value })
      && this.annotationAnchorId({ annotation: value })
    );
  },

  annotationFromLegacyNote({ note }) {
    const annotation = this.createAnnotationNote({
      anchorId: note.anchorId,
      fragment: note.body || { text: '', annotations: [] },
      now: note.created || new Date().toISOString(),
    });
    annotation.id = this.legacyLocalSubjectId({ id: note.id });
    annotation.dcterms$created = note.created || annotation.dcterms$created;
    annotation.dcterms$modified = note.modified || annotation.dcterms$modified;
    annotation.oa$hasBody.id = `${annotation.id}#body`;
    annotation.oa$hasTarget.id = `${annotation.id}#target`;
    annotation.oa$hasTarget.oa$hasSelector.id = `${annotation.id}#selector-fragment`;

    return annotation;
  },

  legacyLocalSubjectId({ id }) {
    if (typeof id === 'string' && /^(?:[a-z][a-z0-9+.-]*:)/i.test(id)) {
      return id;
    }

    return `urn:muze:margin-notes:${encodeURIComponent(id || this.createLocalSubjectId({}))}`;
  },

  cloneValue({ value }) {
    return JSON.parse(JSON.stringify(value));
  },

  noteText({ fragment }) {
    return fragment?.text || '(empty note)';
  },
};
