import { annotationVocabulary } from './vocabulary.js';
import oldm from '@muze-nl/oldm';
import { BlankNode, NamedNode, Collection } from '@muze-nl/oldm-core';
import { from } from '@muze-nl/jaqt';

export const annotationModel = {
  vocabulary: annotationVocabulary,

  createAnnotationNote({ anchorId, fragment, now = new Date().toISOString() }) {
    const annotationId = this.createLocalSubjectId({});
    const body = {
      id: this.relatedSubjectId({annotationId, part: 'body'}),
      rdf$type: [
        this.vocabulary.classes.textualBody,
        this.vocabulary.classes.cobaltFragment,
      ],
      dcterms$format: this.vocabulary.mediaTypes.cobaltFragment,
      dcterms$modified: now,
      rdf$value: this.noteText({ fragment }),
      schema$text: this.noteText({ fragment }),
      cobalt$fragment: fragment,
    };
    const target = {
      id: this.relatedSubjectId({annotationId, part: 'target'}),
      rdf$type: this.vocabulary.classes.specificResource,
      oa$hasSource: this.currentDocumentIri({}),
      oa$hasSelector: {
        id: this.relatedSubjectId({annotationId, part: 'selector-fragment'}),
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
        oldm.many(selector?.rdf$type).includes(this.vocabulary.classes.fragmentSelector)
        || oldm.many(selector?.a).includes(this.vocabulary.classes.fragmentSelector)
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
    return this.normalizeFragment(this.annotationBody({ annotation })?.cobalt$fragment);
  },

  normalizeFragment(raw) {
    if (raw instanceof String) {
      raw = raw.valueOf();
    }

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw;
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Legacy bodies can contain plain text rather than a JSON fragment.
      }

      return { text: raw, annotations: [] };
    }

    return { text: '', annotations: [] };
  },

  updateAnnotationBody({ annotation, fragment, now = new Date().toISOString() }) {
    const body = this.annotationBody({ annotation });
    if (!body) return;

    body.rdf$value = this.noteText({ fragment });
    body.schema$text = this.noteText({ fragment });
    body.cobalt$fragment = fragment;
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

  toStoredAnnotation({ annotation }) {
    const stored = this.cloneValue({ value: annotation });
    const body = this.annotationBody({ annotation: stored });
    if (body?.rdf$value != null) {
      body.rdf$value = String(body.rdf$value);
    }
    if (body?.schema$text != null) {
      body.schema$text = String(body.schema$text);
    }
    if (body?.cobalt$fragment?.text != null) {
      body.cobalt$fragment.text = String(body.cobalt$fragment.text);
    }

    const target = oldm.one(stored?.oa$hasTarget, 'first');
    for (const selector of oldm.many(target?.oa$hasSelector)) {
      if (selector?.rdf$value != null) {
        selector.rdf$value = String(selector.rdf$value);
      }
    }

    return stored;
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
    const context = oldm.context({prefixes: {...this.vocabulary.prefixes, ...value?.prefixes}});
    value = this.expandStoredTypes({value, context});
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

  // Upgrade only RDF type values at the load boundary. Keep already-current
  // subjects by reference so edits still belong to their workspace records.
  expandStoredTypes({ value, context, seen = new WeakSet() }) {
    if (value && typeof value === 'object') {
      if (seen.has(value)) return value;
      seen.add(value);
    }
    if (Array.isArray(value)) {
      const expanded = value.map(item => this.expandStoredTypes({value: item, context, seen}));
      return expanded.some((item, index) => item !== value[index]) ? expanded : value;
    }
    if (!value || typeof value !== 'object' || value instanceof String || value instanceof Number || value instanceof Boolean) {
      return value;
    }
    let result = value;
    for (const [key, item] of Object.entries(value)) {
      let expanded;
      if (value.id && (key === 'a' || key === 'rdf$type')) {
        expanded = Array.isArray(item) ? item.map(type => context.fullURI(type)) : context.fullURI(item);
        if (Array.isArray(item) && expanded.every((type, index) => type === item[index])) expanded = item;
      } else {
        expanded = this.expandStoredTypes({value: item, context, seen});
      }
      if (expanded !== item) {
        if (result === value) result = {...value};
        result[key] = expanded;
      }
    }
    return result;
  },

  isOldmedAnnotation({ value }) {
    return (
      oldm.many(value?.rdf$type).includes(this.vocabulary.classes.annotation)
      || oldm.many(value?.a).includes(this.vocabulary.classes.annotation)
    );
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
    annotation.oa$hasBody.id = this.relatedSubjectId({annotationId: annotation.id, part: 'body'});
    annotation.oa$hasTarget.id = this.relatedSubjectId({annotationId: annotation.id, part: 'target'});
    annotation.oa$hasTarget.oa$hasSelector.id = this.relatedSubjectId({annotationId: annotation.id, part: 'selector-fragment'});

    return annotation;
  },

  legacyLocalSubjectId({ id }) {
    if (typeof id === 'string' && /^(?:[a-z][a-z0-9+.-]*:)/i.test(id)) {
      return id;
    }

    return `urn:muze:margin-notes:${encodeURIComponent(id || this.createLocalSubjectId({}))}`;
  },

  cloneValue({ value, copied = new WeakMap() }) {
    if (!value || typeof value !== 'object') return value;
    if (copied.has(value)) return copied.get(value);
    let clone;
    if (value instanceof Collection) clone = new Collection(value.graph);
    else if (Array.isArray(value)) clone = [];
    else if (value instanceof NamedNode) clone = new NamedNode(value.id, value.graph);
    else if (value instanceof BlankNode) clone = new BlankNode(value.graph);
    else if (value instanceof String || value instanceof Number || value instanceof Boolean) clone = new value.constructor(value.valueOf());
    else clone = {};
    copied.set(value, clone);
    for (const [key, item] of Object.entries(value)) {
      if (value instanceof NamedNode && key === 'id') continue;
      if (value instanceof String && /^\d+$/.test(key)) continue;
      clone[key] = this.cloneValue({ value: item, copied });
    }
    return clone;
  },

  noteText({ fragment }) {
    if (fragment?.text != null) {
      return String(fragment.text);
    }
    return '(empty note)';
  },
};
