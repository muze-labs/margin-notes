import { test } from 'node:test';
import assert from 'node:assert/strict';
import oldm from '@muze-nl/oldm';
import { annotationModel } from '../src/features/paragraph-note-stacks/annotation-model.js';
import { collection, graph, local, resource, workspace } from '@muze-labs/solid-workspace';

function createModel() {
  return {
    ...annotationModel,
    createLocalSubjectId: () => 'urn:uuid:test-note',
    currentDocumentIri: () => 'https://book.example/chapter/1',
  };
}

test('AnnotationModel: creates linked annotation input with native RDF fragments', () => {
  const model = createModel();
  const fragment = { text: 'https://example.test/literal-text', annotations: [] };
  const annotation = model.createAnnotationNote({
    anchorId: 'paragraph', fragment, now: '2026-07-19T10:00:00.000Z',
  });
  assert.equal(annotation.id, 'urn:uuid:test-note');
  assert.equal(annotation.a, model.vocabulary.classes.annotation);
  assert.equal(String(annotation.oa$hasBody.rdf$value), fragment.text);
  assert.deepEqual(model.annotationBodyFragment({ annotation }), fragment);
  assert.equal(model.annotationAnchorId({ annotation }), 'paragraph');
  assert.equal(annotation.oa$hasTarget.oa$hasSource, 'https://book.example/chapter/1');
});

test('AnnotationModel: render fields retain the original annotation handle', () => {
  const model = createModel();
  const annotation = model.createAnnotationNote({
    anchorId: 'paragraph', fragment: { text: 'Derived text', annotations: [] },
    now: '2026-07-19T10:00:00.000Z',
  });
  const note = model.toRenderableNote({ annotation });
  assert.equal(note.annotation, annotation);
  assert.equal(note.anchorId, 'paragraph');
  assert.equal(note.bodyText, 'Derived text');
  assert.equal(note.createdLabel, 'Created: 2026-07-19');
  assert.equal(model.isMarginNoteAnnotation({ value: { id: 'urn:shell', a: annotation.a } }), false);
});

test('AnnotationModel: edit and Turtle reload preserve graph identity and unknown RDF', async () => {
  const model = createModel();
  const source = local.memory('notes', { prefixes: model.vocabulary.prefixes });
  const ws = workspace({
    resources: [resource('notes', { local: source })],
    collections: { notes: collection({ sources: ['notes'], createIn: 'notes' }) },
  });
  await ws.open();
  const annotation = await ws.createIn('notes', model.createAnnotationNote({
    anchorId: 'paragraph', fragment: { text: 'Before', annotations: [] },
  }));
  const body = annotation.oa$hasBody;
  ws.graph('notes').set(body, 'schema$comment', oldm.literal('bonjour', { language: 'fr' }));
  ws.graph('notes').set('urn:unrelated', 'schema$text', 'retain');
  model.updateAnnotationBody({
    annotation, fragment: { text: 'After', annotations: [{ range: [0, 5], tag: '<strong>', order: 1 }] },
    now: '2026-07-19T11:00:00.000Z',
  });
  assert.equal(annotation.oa$hasBody, body);
  assert.equal(body, ws.graph('notes').get(body.id));
  assert.equal((await ws.save(annotation)).ok, true);
  assert.equal(typeof await source.load(), 'string');
  await ws.open();
  const restored = ws.graph('notes').get(annotation.id);
  assert.equal(String(restored.oa$hasBody.rdf$value), 'After');
  assert.equal(restored.oa$hasBody.schema$comment.language, 'fr');
  assert.equal(String(ws.graph('notes').get('urn:unrelated').schema$text), 'retain');
  assert.equal(model.annotationBodyFragment({ annotation: restored }).annotations[0].tag, '<strong>');
  assert.equal(String(restored.oa$hasBody.dcterms$modified), '2026-07-19T11:00:00.000Z');
});

test('AnnotationModel: legacy fragment literals are not silently migrated', () => {
  const model = createModel();
  const annotation = { oa$hasBody: { cobalt$fragment: '{"text":"old"}' } };
  assert.throws(() => model.annotationBodyFragment({ annotation }), /Fragment node/);
});

test('AnnotationModel: replica sync selects a whole fragment without reviving removed formatting', async () => {
  const model = createModel();
  let turtle = '';
  function replica(id) {
    return workspace({ resources: [resource('notes', {
      local: local.memory(id, { prefixes: model.vocabulary.prefixes }),
      remote: graph.resource({
        id: 'remote', url: 'https://pod.example/notes.ttl',
        prefixes: model.vocabulary.prefixes,
        load: async () => turtle,
        save: async value => { turtle = value; },
      }),
      scalarPredicates: [
        model.vocabulary.prefixes.rdf + 'value',
        model.vocabulary.prefixes.schema + 'text',
        model.vocabulary.prefixes.cobalt + 'fragment',
      ],
    })] });
  }
  const first = replica('first');
  await first.open();
  const annotation = await first.createIn('notes', model.createAnnotationNote({
    anchorId: 'paragraph',
    fragment: {
      text: 'Before',
      annotations: [{ range: [0, 6], tag: '<strong>', order: 1 }],
    },
    now: '2026-10-30T10:00:00Z',
  }));
  const original = annotation.oa$hasBody.cobalt$fragment;
  original.schema$comment = oldm.literal('keep fragment metadata');
  original.cobalt$annotations[0].schema$comment = oldm.literal('keep annotation metadata');
  await first.save(annotation);
  assert.equal((await first.sync('notes')).ok, true);
  const second = replica('second');
  await second.open();
  const older = first.graph('notes').get(annotation.id);
  const newer = second.graph('notes').get(annotation.id);
  model.updateAnnotationBody({ annotation: older, fragment: {
    text: 'Older edit',
    annotations: [{ range: [0, 5], tag: '<em>', order: 2 }],
  }, now: '2026-10-30T10:01:00Z' });
  model.updateAnnotationBody({ annotation: newer, fragment: {
    text: 'Newer unformatted edit', annotations: [],
  }, now: '2026-10-30T10:02:00Z' });
  assert.notEqual(older.oa$hasBody.cobalt$fragment.id, newer.oa$hasBody.cobalt$fragment.id);
  await first.save(older);
  await second.save(newer);
  assert.equal((await second.sync('notes')).ok, true);
  assert.equal((await first.sync('notes')).ok, true);
  assert.equal((await second.sync('notes')).ok, true);
  for (const ws of [first, second]) {
    await ws.open();
    const restored = ws.graph('notes').get(annotation.id);
    assert.deepEqual(model.annotationBodyFragment({ annotation: restored }), {
      text: 'Newer unformatted edit', annotations: [],
    });
    assert.equal(String(restored.oa$hasBody.rdf$value), 'Newer unformatted edit');
    const retained = ws.graph('notes').get(original.id);
    assert.equal(String(retained.schema$comment), 'keep fragment metadata');
    assert.equal(String(retained.cobalt$annotations[0].schema$comment), 'keep annotation metadata');
  }
});
