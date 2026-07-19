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
  assert.equal(annotation.rdf$type, 'oa$Annotation');
  assert.equal(annotation.dcterms$created, '2026-07-19T10:00:00.000Z');
  assert.equal(annotation.oa$hasBody.rdf$value, 'A useful note');
  assert.equal(annotation.oa$hasBody.schema$text, 'A useful note');
  assert.equal(annotation.oa$hasBody.dcterms$format, 'application/vnd.cobalt.fragment+json');
  assert.deepEqual(annotation.oa$hasBody.cobalt$fragment, fragment);
  assert.equal(annotation.oa$hasTarget.oa$hasSource, 'https://book.example/chapter/1');
  assert.equal(annotation.oa$hasTarget.oa$hasSelector.rdf$type, 'oa$FragmentSelector');
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
  assert.equal(document.subjects[0].rdf$type, 'oa$Annotation');
  assert.notEqual(document.subjects[0], annotation);
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
  assert.equal(annotation.rdf$type, 'oa$Annotation');
  assert.equal(annotation.dcterms$created, '2026-07-19T10:00:00.000Z');
  assert.equal(annotation.dcterms$modified, '2026-07-19T10:30:00.000Z');
  assert.equal(model.annotationAnchorId({ annotation }), 'p-chapter-boundaries');
  assert.deepEqual(model.annotationBodyFragment({ annotation }), {
    text: 'Legacy',
    annotations: [],
  });
});
