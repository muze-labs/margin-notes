import oldm from '@muze-nl/oldm';
import { render } from '@muze-labs/cobalt-rich-text-note';
import { annotationVocabulary } from './vocabulary.js';

const cobalt = annotationVocabulary.prefixes.cobalt;
const rdf = annotationVocabulary.prefixes.rdf;

// This bridge owns the RDF mapping. Cobalt only consumes its plain Fragment.
// Replaces the current fragment while preserving facts outside this mapping.
export function writeCobaltFragment(fragment, { id, htmlId, graph } = {}) {
  validateFragment(fragment);
  if (typeof id !== 'string' || !id) {
    throw new TypeError('cobalt-fragment-rdf: fragment id is required');
  }
  if (typeof htmlId !== 'string' || !htmlId || htmlId === id) {
    throw new TypeError('cobalt-fragment-rdf: a distinct HTML body id is required');
  }
  const html = render(fragment);
  if (!graph) {
    graph = new oldm.Graph(
      [], id, 'text/turtle', annotationVocabulary.prefixes, oldm.context(),
    );
  }
  const node = graph.addNamedNode(id);
  const previous = field(node, cobalt + 'annotations');
  graph.add(node, 'a', annotationVocabulary.classes.cobaltFragment);
  graph.set(node, rdf + 'value', oldm.literal(fragment.text));
  const annotations = new oldm.Collection(graph);
  for (const [index, annotation] of fragment.annotations.entries()) {
    const item = graph.addNamedNode(`${id}-${index}`);
    graph.set(item, cobalt + 'start', integerLiteral(annotation.range[0]));
    graph.set(item, cobalt + 'end', integerLiteral(annotation.range[1]));
    graph.set(item, cobalt + 'tag', oldm.literal(annotation.tag));
    graph.set(item, cobalt + 'order', integerLiteral(annotation.order));
    annotations.push(item);
  }
  // Clear only managed facts from removed members; unknown RDF stays intact.
  const currentIds = new Set(annotations.map(item => item.id));
  if (previous instanceof oldm.Collection) {
    for (const item of previous) {
      if (currentIds.has(item.id)) {
        continue;
      }
      for (const name of ['start', 'end', 'tag', 'order']) {
        graph.delete(item, cobalt + name);
      }
      if (Object.keys(item).length === 1) {
        graph.delete(item);
      }
    }
  }
  if (annotations.length === 0) {
    // Canonical empty RDF list, also used by OLDM when parsing Turtle ().
    graph.set(node, cobalt + 'annotations',
      graph.addNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'));
  }
  else {
    graph.set(node, cobalt + 'annotations', annotations);
  }
  const body = graph.addNamedNode(htmlId);
  graph.add(body, 'a', annotationVocabulary.classes.textualBody);
  graph.set(body, annotationVocabulary.prefixes.dcterms + 'format', 'text/html');
  graph.set(body, rdf + 'value', oldm.literal(html));
  graph.set(node, annotationVocabulary.prefixes.dcterms + 'hasFormat', body);
  return node;
}

export function readCobaltFragment(node) {
  if (!node || !oldm.many(node.a).includes(
    annotationVocabulary.classes.cobaltFragment,
  )) {
    throw new TypeError('cobalt-fragment-rdf: expected a Cobalt Fragment node');
  }
  let annotations = field(node, cobalt + 'annotations');
  // OLDM exposes Turtle's empty list as the rdf:nil named node.
  if (annotations?.id === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
    annotations = new oldm.Collection(node.graph);
  }
  if (!(annotations instanceof oldm.Collection)) {
    throw new TypeError('cobalt-fragment-rdf: annotations must be a Collection');
  }
  const fragment = {
    text: stringValue(field(node, rdf + 'value')),
    annotations: Array.from(annotations, item => ({
      range: [
        numberValue(field(item, cobalt + 'start')),
        numberValue(field(item, cobalt + 'end')),
      ],
      tag: stringValue(field(item, cobalt + 'tag')),
      order: numberValue(field(item, cobalt + 'order')),
    })),
  };
  validateFragment(fragment);
  return fragment;
}

function field(node, predicate) {
  if (!node?.graph) {
    throw new TypeError('cobalt-fragment-rdf: expected a native RDF node');
  }
  return node[node.graph.propertyName(predicate)];
}

function integerLiteral(value) {
  return oldm.literal(value, {
    type: 'http://www.w3.org/2001/XMLSchema#integer',
  });
}

function stringValue(value) {
  if (typeof value !== 'string' && !(value instanceof String)) {
    throw new TypeError('cobalt-fragment-rdf: expected a string literal');
  }
  return String(value);
}

function numberValue(value) {
  // Parsed typed literals can retain their lexical string representation.
  const integerText = value instanceof String
    && value.type === 'http://www.w3.org/2001/XMLSchema#integer'
    && /^[+-]?\d+$/.test(String(value));
  if (!integerText && typeof value !== 'number' && !(value instanceof Number)) {
    throw new TypeError('cobalt-fragment-rdf: expected a numeric literal');
  }
  return Number(value);
}

function validateFragment(fragment) {
  if (typeof fragment?.text !== 'string'
    || !Array.isArray(fragment.annotations)) {
    throw new TypeError('cobalt-fragment-rdf: expected text and annotations');
  }
  for (const annotation of fragment.annotations) {
    const range = annotation?.range;
    if (!Array.isArray(range) || range.length !== 2
      || !range.every(Number.isSafeInteger)
      || range[0] < 0 || range[1] < range[0]
      || range[1] > fragment.text.length
      || typeof annotation.tag !== 'string'
      || !Number.isSafeInteger(annotation.order)) {
      throw new TypeError('cobalt-fragment-rdf: invalid annotation range/tag/order');
    }
  }
}
