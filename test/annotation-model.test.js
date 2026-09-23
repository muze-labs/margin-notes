import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotationModel } from '../src/features/paragraph-note-stacks/annotation-model.js';

function createModel() {
  return {
    ...annotationModel,
    createLocalSubjectId() {
      return 'urn:uuid:test-note';
    },
    currentDocumentIri() {
      return 'https://book.example/chapter/1';
    },
  };
}

test('AnnotationModel: creates OLDMed Web Annotation subjects', () => {
  const model = createModel();
  const fragment = { text: 'A useful note', annotations: [] };

  const annotation = model.createAnnotationNote({
    anchorId: 'p-chapter-boundaries',
    fragment,
    now: '2026-07-19T10:00:00.000Z',
  });

  assert.equal(annotation.id, 'urn:uuid:test-note');
  assert.equal(annotation.rdf$type, 'http://www.w3.org/ns/oa#Annotation');
  assert.equal(annotation.dcterms$created, '2026-07-19T10:00:00.000Z');
  assert.equal(annotation.oa$hasBody.rdf$value, 'A useful note');
  assert.equal(annotation.oa$hasBody.schema$text, 'A useful note');
  assert.equal(annotation.oa$hasBody.dcterms$format, 'application/vnd.cobalt.fragment+json');
  assert.deepEqual(annotation.oa$hasBody.cobalt$fragment, fragment);
  assert.equal(annotation.oa$hasTarget.oa$hasSource, 'https://book.example/chapter/1');
  assert.equal(annotation.oa$hasTarget.oa$hasSelector.rdf$type, 'http://www.w3.org/ns/oa#FragmentSelector');
  assert.equal(annotation.oa$hasTarget.oa$hasSelector.rdf$value, 'p-chapter-boundaries');
});

test('AnnotationModel: derives renderable note fields from the annotation subject', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({
    anchorId: 'p-chapter-boundaries',
    fragment: { text: 'Derived text', annotations: [] },
    now: '2026-07-19T10:00:00.000Z',
  });

  const note = model.toRenderableNote({ annotation });

  assert.equal(note.id, annotation.id);
  assert.equal(note.annotation, annotation);
  assert.equal(note.anchorId, 'p-chapter-boundaries');
  assert.equal(note.bodyText, 'Derived text');
  assert.equal(note.createdLabel, 'Created: 2026-07-19');
});

test('AnnotationModel: updates the body without dropping unknown predicates', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({
    anchorId: 'p-chapter-boundaries',
    fragment: { text: 'Before', annotations: [] },
    now: '2026-07-19T10:00:00.000Z',
  });
  annotation.schema$about = 'https://example.test/topic';
  annotation.oa$hasBody.schema$comment = 'preserve me';

  model.updateAnnotationBody({
    annotation,
    fragment: { text: 'After', annotations: [{ range: [0, 5] }] },
    now: '2026-07-19T11:00:00.000Z',
  });

  assert.equal(annotation.dcterms$modified, '2026-07-19T11:00:00.000Z');
  assert.equal(annotation.oa$hasBody.rdf$value, 'After');
  assert.equal(annotation.oa$hasBody.schema$text, 'After');
  assert.deepEqual(annotation.oa$hasBody.cobalt$fragment, {
    text: 'After',
    annotations: [{ range: [0, 5] }],
  });
  assert.equal(annotation.schema$about, 'https://example.test/topic');
  assert.equal(annotation.oa$hasBody.schema$comment, 'preserve me');
});

test('AnnotationModel: stores a graph document with prefixes and cloned subjects', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({
    anchorId: 'p-chapter-boundaries',
    fragment: { text: 'Stored', annotations: [] },
    now: '2026-07-19T10:00:00.000Z',
  });

  const document = model.toStorageDocument({ subjects: [annotation] });

  assert.equal(document.format, 'margin-notes-oldmed-graph');
  assert.equal(document.version, 1);
  assert.equal(document.prefixes.oa, 'http://www.w3.org/ns/oa#');
  assert.equal(document.subjects[0].rdf$type, 'http://www.w3.org/ns/oa#Annotation');
  assert.notEqual(document.subjects[0], annotation);
});

test('AnnotationModel: ignores incomplete annotation shells when loading and saving notes', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({
    anchorId: 'p-chapter-boundaries',
    fragment: { text: 'Complete note', annotations: [] },
    now: '2026-07-19T10:00:00.000Z',
  });
  const shell = {
    id: 'urn:uuid:annotation-shell',
    rdf$type: 'http://www.w3.org/ns/oa#Annotation',
    dcterms$created: '2026-07-19T20:40:29.378Z',
    dcterms$modified: '2026-07-19T20:40:29.378Z',
  };

  const loaded = model.toStoredGraph({
    value: {
      subjects: [shell, annotation],
    },
  });
  const saved = model.toStorageDocument({
    subjects: [shell, annotation],
  });

  assert.deepEqual(loaded, [annotation]);
  assert.deepEqual(saved.subjects, [annotation]);
});

test('AnnotationModel: migrates old flat note records into OLDMed subjects', () => {
  const model = createModel();

  const [annotation] = model.toStoredGraph({
    value: [{
      id: 'note-1',
      anchorId: 'p-chapter-boundaries',
      body: { text: 'Legacy', annotations: [] },
      created: '2026-07-19T10:00:00.000Z',
      modified: '2026-07-19T10:30:00.000Z',
    }],
  });

  assert.equal(annotation.id, 'urn:muze:margin-notes:note-1');
  assert.equal(annotation.rdf$type, 'http://www.w3.org/ns/oa#Annotation');
  assert.equal(annotation.dcterms$created, '2026-07-19T10:00:00.000Z');
  assert.equal(annotation.dcterms$modified, '2026-07-19T10:30:00.000Z');
  assert.equal(model.annotationAnchorId({ annotation }), 'p-chapter-boundaries');
  assert.deepEqual(model.annotationBodyFragment({ annotation }), {
    text: 'Legacy',
    annotations: [],
  });
});


test('AnnotationModel: loads legacy prefixed classes using the document prefixes without mutating it', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({anchorId: 'paragraph', fragment: {text: 'Legacy', annotations: []}});
  annotation.rdf$type = ['old$Annotation', 'http://schema.org/CreativeWork'];
  annotation.oa$hasBody.rdf$type = ['old$TextualBody', 'cobalt$Fragment'];
  annotation.oa$hasTarget.rdf$type = 'old$SpecificResource';
  annotation.oa$hasTarget.oa$hasSelector.rdf$type = 'old$FragmentSelector';
  annotation.schema$comment = 'old$Annotation';
  const document = {version: 1, prefixes: {old: 'http://www.w3.org/ns/oa#'}, subjects: [annotation]};
  const [loaded] = model.toStoredGraph({value: document});
  assert.deepEqual(loaded.rdf$type, ['http://www.w3.org/ns/oa#Annotation', 'http://schema.org/CreativeWork']);
  assert.equal(model.annotationAnchorId({annotation: loaded}), 'paragraph');
  assert.equal(loaded.schema$comment, 'old$Annotation');
  assert.deepEqual(annotation.rdf$type, ['old$Annotation', 'http://schema.org/CreativeWork']);
});

test('AnnotationModel: keeps full-IRI subjects attached to their workspace and preserves literal metadata', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({anchorId: 'paragraph', fragment: {text: 'Note', annotations: []}});
  annotation.schema$comment = Object.assign(new String('bonjour'), {type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString', language: 'fr'});
  const [loaded] = model.toStoredGraph({value: [annotation]});
  assert.equal(loaded, annotation);
  const stored = model.toStorageDocument({subjects: [loaded]}).subjects[0];
  assert.equal(stored.schema$comment.type, annotation.schema$comment.type);
  assert.equal(stored.schema$comment.language, 'fr');
  assert.notEqual(stored.schema$comment, annotation.schema$comment);
});


test('AnnotationModel: legacy note IDs with fragments produce valid linked subject IRIs', () => {
  const model = createModel();
  const [note] = model.toStoredGraph({value: [{id: 'https://example.org/notes#one', anchorId: 'paragraph', body: {text: 'Legacy', annotations: []}}]});
  assert.equal(note.id, 'https://example.org/notes#one');
  assert.equal(note.oa$hasBody.id, 'https://example.org/notes#one-body');
  assert.equal(note.oa$hasTarget.oa$hasSelector.id, 'https://example.org/notes#one-selector-fragment');
});
