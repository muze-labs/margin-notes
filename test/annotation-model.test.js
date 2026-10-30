import { test } from 'node:test';
import assert from 'node:assert/strict';
import oldm from '@muze-nl/oldm';
import { annotationModel } from '../src/features/paragraph-note-stacks/annotation-model.js';
import { collection, graph, local, resource, workspace } from '@muze-labs/solid-workspace';

function createModel() {
  return {
    ...annotationModel,
    createAnnotationId: () => 'https://book.example/chapter/1#margin-note-testcode-1',
    currentDocumentIri: () => 'https://book.example/chapter/1',
  };
}

test('AnnotationModel: creates linked annotation input with native RDF fragments', () => {
  const model = createModel();
  const fragment = { text: 'https://example.test/literal-text', annotations: [] };
  const annotation = model.createAnnotationNote({
    anchorId: 'paragraph', fragment, now: '2026-07-19T10:00:00.000Z',
  });
  assert.equal(annotation.id, 'https://book.example/chapter/1#margin-note-testcode-1');
  assert.equal(annotation.a, model.vocabulary.classes.annotation);
  assert.equal(String(annotation.cobalt$fragment.rdf$value), fragment.text);
  assert.deepEqual(model.annotationBodyFragment({ annotation }), fragment);
  assert.equal(model.annotationAnchorId({ annotation }), 'paragraph');
  assert.equal(annotation.oa$hasTarget, 'https://book.example/chapter/1#paragraph');
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
  assert.equal(String(restored.cobalt$fragment.rdf$value), 'After');
  assert.equal(restored.oa$hasBody.schema$comment.language, 'fr');
  assert.equal(String(ws.graph('notes').get('urn:unrelated').schema$text), 'retain');
  assert.equal(model.annotationBodyFragment({ annotation: restored }).annotations[0].tag, '<strong>');
  assert.equal(String(restored.dcterms$modified), '2026-07-19T11:00:00.000Z');
});

test('AnnotationModel: legacy fragment literals are not silently migrated', () => {
  const model = createModel();
  const annotation = { cobalt$fragment: '{"text":"old"}' };
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
      ...model.replicaPolicy,
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
  const secondModel = { ...model, createAnnotationId: () => annotation.id.replace(/-1$/, '-2') };
  await first.createIn('notes', secondModel.createAnnotationNote({
    anchorId: 'another-paragraph', fragment: { text: 'Second note', annotations: [] },
  }));
  const original = annotation.cobalt$fragment;
  assert.equal(original.id, `${annotation.id}-fragment`);
  assert.equal(original.cobalt$annotations[0].id, `${annotation.id}-fragment-0`);
  original.schema$comment = oldm.literal('keep fragment metadata');
  original.cobalt$annotations[0].schema$comment = oldm.literal('keep annotation metadata');
  await first.save(annotation);
  assert.equal((await first.sync('notes')).ok, true);
  const second = replica('second');
  await second.open();
  for (const ws of [first, second]) {
    const current = ws.graph('notes').get(annotation.id);
    assert.deepEqual(model.annotationBodyFragment({ annotation: current }), {
      text: 'Before', annotations: [{ range: [0, 6], tag: '<strong>', order: 1 }],
    });
    assert.equal(current.oa$hasBody.dcterms$modified, undefined);
  }
  const older = first.graph('notes').get(annotation.id);
  const newer = second.graph('notes').get(annotation.id);
  model.updateAnnotationBody({ annotation: older, fragment: {
    text: 'Older edit',
    annotations: [{ range: [0, 5], tag: '<em>', order: 2 }],
  }, now: '2026-10-30T10:01:00Z' });
  model.updateAnnotationBody({ annotation: newer, fragment: {
    text: 'Newer unformatted edit', annotations: [],
  }, now: '2026-10-30T10:02:00Z' });
  assert.equal(older.cobalt$fragment.id, newer.cobalt$fragment.id);
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
    assert.equal(String(restored.cobalt$fragment.rdf$value), 'Newer unformatted edit');
    assert.equal(String(restored.oa$hasBody.rdf$value), 'Newer unformatted edit');
    assert.equal(String(restored.oa$hasBody.dcterms$format), 'text/html');
    assert.equal(restored.cobalt$fragment.dcterms$hasFormat, restored.oa$hasBody);
    const retained = ws.graph('notes').get(original.id);
    assert.equal(String(retained.schema$comment), 'keep fragment metadata');
    const removed = ws.graph('notes').get(`${original.id}-0`);
    assert.equal(String(removed.schema$comment), 'keep annotation metadata');
    assert.equal(removed.cobalt$tag, undefined);
    assert.equal(removed.cobalt$start, undefined);
    assert.equal(ws.graph('notes').data.filter(node => oldm.many(node.a).includes(model.vocabulary.classes.cobaltFragment)).length, 2);
  }
});

test('AnnotationModel: persists standard HTML and editable text, timestamping only the annotation', async () => {
  const model = createModel();
  const source = local.memory('compact', { prefixes: model.vocabulary.prefixes });
  const ws = workspace({ resources: [resource('notes', { local: source })] });
  await ws.open();
  const annotation = await ws.createIn('notes', model.createAnnotationNote({
    anchorId: 'paragraph', fragment: { text: 'unique compact text', annotations: [] },
  }));
  await ws.save(annotation);
  const turtle = await source.load();
  const parsed = oldm.context().parse(turtle, 'urn:compact', 'text/turtle');
  const body = parsed.get(annotation.id).oa$hasBody;
  assert.equal((turtle.match(/unique compact text/g) || []).length, 2);
  assert.equal(String(body.rdf$value), 'unique compact text');
  assert.equal(String(body.dcterms$format), 'text/html');
  assert.equal(parsed.get(annotation.id).cobalt$fragment.dcterms$hasFormat, body);
  assert.equal(body.cobalt$fragment, undefined);
  assert.equal(body.schema$text, undefined);
  assert.equal(body.dcterms$modified, undefined);
  assert.equal(parsed.get(annotation.id).oa$hasTarget.id, 'https://book.example/chapter/1#paragraph');
  assert.equal(model.annotationAnchorId({ annotation: parsed.get(annotation.id) }), 'paragraph');
  assert.doesNotMatch(turtle, /SpecificResource|FragmentSelector|hasSelector|hasSource/);
  const dated = parsed.data.filter(node => node.dcterms$modified !== undefined);
  assert.deepEqual(dated.map(node => node.id), [annotation.id]);
  assert.equal(model.annotationBodyFragment({ annotation: parsed.get(annotation.id) }).text, 'unique compact text');
});

test('AnnotationModel: page IDs share a resource code and resume beyond stored and deleted notes', () => {
  const model = { ...annotationModel, currentDocumentIri: () => 'https://book.example/chapter?edition=2' };
  const sequence = {};
  const first = model.createAnnotationId({ subjects: [], sequence });
  assert.match(first, /^https:\/\/book\.example\/chapter\?edition=2#margin-note-[A-Za-z0-9_-]{8}-1$/);
  const second = model.createAnnotationId({ subjects: [], sequence });
  assert.equal(second, first.replace(/-1$/, '-2'));
  const third = first.replace(/-1$/, '-3');
  const subjects = [{ id: first }, {
    id: third, 'https://purl.org/pdsinterop/link-metadata#deleted': 'deleted',
  }, { id: `${third}-body` }];
  const resumed = model.createAnnotationId({ subjects, sequence: {} });
  assert.equal(resumed, first.replace(/-1$/, '-4'));
  const before = JSON.stringify(subjects);
  model.createAnnotationId({ subjects, sequence: {} });
  assert.equal(JSON.stringify(subjects), before, 'existing subjects are never renamed');
});

test('AnnotationModel: direct targets decode anchor IDs and exclude other pages', () => {
  const model = createModel();
  const anchorId = 'p-café%#part';
  const annotation = model.createAnnotationNote({
    anchorId, fragment: { text: 'Target', annotations: [] },
  });
  assert.equal(annotation.oa$hasTarget, 'https://book.example/chapter/1#p-caf%C3%A9%25%23part');
  assert.equal(model.annotationAnchorId({ annotation }), anchorId);
  for (const target of [
    'https://book.example/chapter/2#paragraph',
    'https://book.example/chapter/1?edition=2#paragraph',
    'https://book.example/chapter/1',
    'https://book.example/chapter/1#',
    'https://book.example/chapter/1#bad%escape',
  ]) {
    assert.equal(model.annotationAnchorId({ annotation: { oa$hasTarget: target } }), undefined);
  }
});

test('AnnotationModel: repeated edits keep one fragment and remove obsolete formatting facts', async () => {
  const model = createModel();
  const source = local.memory('current-fragment', { prefixes: model.vocabulary.prefixes });
  const ws = workspace({ resources: [resource('notes', { local: source, ...model.replicaPolicy })] });
  await ws.open();
  const annotation = await ws.createIn('notes', model.createAnnotationNote({
    anchorId: 'paragraph', fragment: { text: 'First', annotations: [] },
  }));
  const current = annotation.cobalt$fragment;
  for (let edit = 0; edit < 5; edit++) {
    const fragment = { text: `Edit ${edit}`, annotations: [
      { range: [0, 4], tag: '<em>', order: 1 },
      { range: [5, 6], tag: '<strong>', order: 2 },
    ] };
    model.updateAnnotationBody({ annotation, fragment });
    assert.equal(annotation.cobalt$fragment, current);
    assert.deepEqual(model.annotationBodyFragment({ annotation }), fragment);
  }
  model.updateAnnotationBody({ annotation, fragment: { text: 'Final', annotations: [] } });
  await ws.save(annotation);
  const turtle = await source.load();
  assert.doesNotMatch(turtle, /First|Edit [0-9]|cobalt:(start|end|tag|order)/);
  const parsed = oldm.context().parse(turtle, 'https://pod.example/notes.ttl', 'text/turtle');
  assert.equal(parsed.data.filter(node => oldm.many(node.a).includes(model.vocabulary.classes.cobaltFragment)).length, 1);
  assert.equal(parsed.get(`${current.id}-0`), undefined);
  assert.equal(parsed.get(`${current.id}-1`), undefined);
  assert.deepEqual(model.annotationBodyFragment({ annotation: parsed.get(annotation.id) }), { text: 'Final', annotations: [] });
});

test('AnnotationModel: a standard OA reader gets rendered HTML without Cobalt knowledge', async () => {
  const model = createModel();
  const source = local.memory('oa-html', { prefixes: model.vocabulary.prefixes });
  const ws = workspace({ resources: [resource('notes', { local: source, ...model.replicaPolicy })] });
  await ws.open();
  const fragment = { text: 'Bold & <plain>', annotations: [
    { range: [0, 4], tag: '<strong>', order: 1 },
  ] };
  const annotation = await ws.createIn('notes', model.createAnnotationNote({ anchorId: 'paragraph', fragment }));
  const turtle = await source.load();
  const parsed = oldm.context().parse(turtle, 'https://pod.example/notes.ttl', 'text/turtle');
  const field = (node, iri) => node[parsed.propertyName(iri)];
  const body = field(parsed.get(annotation.id), 'http://www.w3.org/ns/oa#hasBody');
  assert.ok(oldm.many(body.a).includes('http://www.w3.org/ns/oa#TextualBody'));
  assert.equal(String(field(body, 'http://purl.org/dc/terms/format')), 'text/html');
  assert.equal(String(field(body, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')), '<strong>Bold</strong> &amp; &lt;plain&gt;');
  assert.equal(oldm.many(field(body, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')).length, 1);
  assert.deepEqual(model.annotationBodyFragment({ annotation: parsed.get(annotation.id) }), fragment);
  assert.equal(body.id, annotation.id + '-html');
  assert.equal(parsed.get(annotation.id).cobalt$fragment.dcterms$hasFormat, body);
  assert.equal(body.dcterms$modified, undefined);
  assert.equal(body.cobalt$fragment, undefined);
  const originalBody = annotation.oa$hasBody;
  originalBody.schema$comment = oldm.literal('preserved body metadata');
  model.updateAnnotationBody({ annotation, fragment: { text: 'https://example.test/', annotations: [] } });
  await ws.save(annotation);
  assert.equal(annotation.oa$hasBody, originalBody);
  assert.equal(String(originalBody.rdf$value), 'https://example.test/');
  assert.equal(String(originalBody.schema$comment), 'preserved body metadata');
  const updated = oldm.context().parse(await source.load(), source.url, 'text/turtle');
  assert.equal(String(updated.get(annotation.id).oa$hasBody.rdf$value), 'https://example.test/');
  assert.equal(updated.get(annotation.id).oa$hasBody.rdf$value.id, undefined);
  assert.doesNotMatch(await source.load(), /Bold|&lt;plain&gt;|text\/plain/);
});
