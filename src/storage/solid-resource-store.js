import { error, issues, Optional } from '@muze-nl/assert';
import { lading } from '@muze-labs/lading';
import { createSolidMetroClient } from '@muze-labs/jsfs-solid';
import oldm from '@muze-nl/oldm';

const DEFAULT_ACCEPT = 'text/turtle, application/ld+json;q=0.9, application/json;q=0.2';
const DEFAULT_CONTENT_TYPE = 'text/turtle';
const DEFAULT_FORMAT = 'margin-notes-oldmed-graph';
const DEFAULT_VERSION = 1;
const NODE_PREDICATES = new Set([
  'oa$hasBody',
  'oa$hasTarget',
  'oa$hasSource',
  'oa$hasSelector',
  'schema$about',
]);
const INLINE_PREDICATES = new Set([
  'oa$hasBody',
  'oa$hasTarget',
  'oa$hasSelector',
]);

export function createSolidResourceStore(options = {}) {
  assertOptions(options);

  const defaultResourceUrl = options.resourceUrl || '';
  const accept = options.accept || DEFAULT_ACCEPT;
  const contentType = options.contentType || DEFAULT_CONTENT_TYPE;
  const providedSolid = options.solid || options.lading || null;
  const generatedClient = {
    solid: null,
    rootUrl: '',
  };

  function solidFor(resourceUrl) {
    return solidClientFor({ options, providedSolid, resourceUrl, generatedClient });
  }

  return {
    name: 'solidResourceStore',

    async load({ key } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl);
      const response = await callResource(() => solid.resource(resourceUrl).get({ accept }));

      if (isMissing(response)) return null;
      await ensureOk({ response, operation: 'load' });

      if (isOldmGraph(response?.data)) {
        return storageDocumentFromGraph({ graph: response.data, resourceUrl });
      }

      if (isStorageDocument(response?.data)) {
        return response.data;
      }

      const text = await responseText(response);
      if (!text.trim()) return null;

      if (isLinkedDataResponse(response)) {
        return storageDocumentFromGraph({
          graph: oldmContext({ resourceUrl }).parse(text, resourceUrl, responseContentType(response) || DEFAULT_CONTENT_TYPE),
          resourceUrl,
        });
      }

      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`Solid resource load returned invalid linked data or JSON from ${resourceUrl}: ${error.message}`);
      }
    },

    async save({ key, value } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl);
      const graph = graphFromStorageDocument({ document: value, resourceUrl });
      const response = await callResource(() => solid.resource(resourceUrl).put(
        graph,
        { contentType }
      ));

      await ensureOk({ response, operation: 'save' });
      return {
        key: resourceUrl,
        resourceUrl,
        status: response.status,
      };
    },

    async remove({ key } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl);
      const response = await callResource(() => solid.resource(resourceUrl).delete());

      if (isMissing(response) || response.status === 410) {
        return {
          key: resourceUrl,
          resourceUrl,
          status: response.status,
        };
      }

      await ensureOk({ response, operation: 'remove' });
      return {
        key: resourceUrl,
        resourceUrl,
        status: response.status,
      };
    },
  };
}

function assertOptions(options) {
  const optionIssues = issues(options, {
    resourceUrl: Optional(String),
    rootUrl: Optional(String),
    storageUrl: Optional(String),
    accept: Optional(String),
    contentType: Optional(String),
  });

  if (optionIssues) {
    throw new TypeError(`Invalid Solid resource store options: ${optionIssues[0].pathString} ${optionIssues[0].message}`);
  }
}

function oldmContext({ resourceUrl, prefixes = {} }) {
  return oldm.context({
    defaultGraph: resourceUrl,
    prefixes: annotationPrefixes(prefixes),
  });
}

function annotationPrefixes(prefixes = {}) {
  return {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    dcterms: 'http://purl.org/dc/terms/',
    oa: 'http://www.w3.org/ns/oa#',
    schema: 'https://schema.org/',
    cobalt: 'https://vocab.muze.nl/cobalt#',
    ...prefixes,
  };
}

function graphFromStorageDocument({ document, resourceUrl }) {
  const storageDocument = isStorageDocument(document)
    ? document
    : { subjects: [] };
  const context = oldmContext({
    resourceUrl,
    prefixes: storageDocument.prefixes,
  });
  const graph = context.parse('', resourceUrl, DEFAULT_CONTENT_TYPE);

  for (const subject of storageDocument.subjects) {
    writeSubjectToGraph({ graph, subject });
  }

  return graph;
}

function writeSubjectToGraph({ graph, subject }) {
  if (!subject?.id) return null;

  for (const [predicate, value] of Object.entries(subject)) {
    if (predicate === 'id') continue;

    if (predicate === 'rdf$type') {
      graph.set(subject.id, 'rdf$type', value);
      continue;
    }

    graph.set(subject.id, predicate, graphValueFromStorageValue({ graph, predicate, value }));
  }

  return subject.id;
}

function graphValueFromStorageValue({ graph, predicate, value }) {
  if (Array.isArray(value)) {
    return value.map(item => graphValueFromStorageValue({ graph, predicate, value: item }));
  }

  if (value && typeof value === 'object') {
    if (predicate === 'cobalt$fragment') {
      return JSON.stringify(value);
    }
    if (value.id) {
      writeSubjectToGraph({ graph, subject: value });
      return value.id;
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'string' && !NODE_PREDICATES.has(predicate)) {
    return new String(value);
  }

  return value;
}

function storageDocumentFromGraph({ graph, resourceUrl }) {
  const subjects = graphSubjects(graph)
    .filter(subject => values(subject.a).includes('oa$Annotation') || values(subject.rdf$type).includes('oa$Annotation'))
    .map(subject => storageSubjectFromOldmSubject({ graph, subject }));

  return {
    format: DEFAULT_FORMAT,
    version: DEFAULT_VERSION,
    prefixes: annotationPrefixes(graph?.prefixes ?? graph?.context?.prefixes),
    resourceUrl,
    subjects,
  };
}

function storageSubjectFromOldmSubject({ graph, subject, seen = new Set() }) {
  if (!subject || seen.has(subject.id)) {
    return subject?.id;
  }
  seen.add(subject.id);

  const result = {};
  for (const [predicate, value] of Object.entries(subject)) {
    if (predicate === 'graph') continue;
    if (predicate === 'a') {
      result.rdf$type = storageValueFromOldmValue({ graph, predicate, value, seen });
      continue;
    }
    result[predicate] = storageValueFromOldmValue({ graph, predicate, value, seen });
  }

  return result;
}

function storageValueFromOldmValue({ graph, predicate, value, seen }) {
  if (Array.isArray(value)) {
    return value.map(item => storageValueFromOldmValue({ graph, predicate, value: item, seen }));
  }

  if (isOldmNamedNode(value)) {
    const linkedSubject = graph?.subjects?.[value.id];
    if (linkedSubject && INLINE_PREDICATES.has(predicate)) {
      return storageSubjectFromOldmSubject({ graph, subject: linkedSubject, seen });
    }
    return value.id;
  }

  if (value instanceof String) {
    return storageLiteralValue({ predicate, value: value.toString() });
  }

  if (value && typeof value === 'object') {
    return storageSubjectFromOldmSubject({ graph, subject: value, seen });
  }

  return storageLiteralValue({ predicate, value });
}

function storageLiteralValue({ predicate, value }) {
  if (predicate === 'cobalt$fragment' && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return { text: value, annotations: [] };
    }
  }
  return value;
}

function graphSubjects(graph) {
  if (Array.isArray(graph?.data)) {
    return graph.data;
  }
  if (Array.isArray(graph?.subjects)) {
    return graph.subjects;
  }
  if (graph?.subjects && typeof graph.subjects === 'object') {
    return Object.values(graph.subjects);
  }
  return [];
}

function resourceUrlFrom({ key, defaultResourceUrl }) {
  const resourceUrl = defaultResourceUrl || key;
  if (issues(resourceUrl, String)) {
    throw new Error('Solid resource store requires a resourceUrl option or key');
  }
  return resourceUrl;
}

function solidClientFor({ options, providedSolid, resourceUrl, generatedClient }) {
  if (providedSolid) {
    assertSolidClient(providedSolid);
    return providedSolid;
  }

  const rootUrl = options.rootUrl || options.storageUrl || resourceUrl;
  if (generatedClient.solid && generatedClient.rootUrl === rootUrl) {
    return generatedClient.solid;
  }

  const metroClient = createSolidMetroClient(rootUrl, {
    ...options,
    configureMetro: options.configureMetro ?? true,
  });
  generatedClient.rootUrl = rootUrl;
  generatedClient.solid = lading(metroClient, {
    thrower: options.thrower ?? false,
  });
  return generatedClient.solid;
}

function assertSolidClient(solid) {
  const clientIssues = issues(solid, {
    resource: callable,
  });

  if (clientIssues) {
    throw new TypeError('Solid resource store requires a Lading-style client with resource(url)');
  }
}

function callable(value, _root, path) {
  if (typeof value !== 'function') {
    return error('data is not a function', value, 'function', path);
  }
  return false;
}

async function callResource(operation) {
  try {
    return await operation();
  } catch (error) {
    if (isMissing(error?.cause)) {
      return error.cause;
    }
    throw error;
  }
}

function isMissing(response) {
  return response?.status === 404;
}

function isStorageDocument(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.subjects));
}

function isOldmGraph(value) {
  return Boolean(value && typeof value === 'object' && typeof value.write === 'function' && value.subjects);
}

function isOldmNamedNode(value) {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string' && value.graph);
}

function values(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isLinkedDataResponse(response) {
  return /^text\/turtle\b|^application\/ld\+json\b|^application\/n-quads\b|^application\/trig\b/.test(responseContentType(response));
}

function responseContentType(response) {
  return response?.headers?.get?.('Content-Type') || response?.headers?.get?.('content-type') || '';
}

async function ensureOk({ response, operation }) {
  if (response.ok) return;

  const body = await responseText(response).catch(() => '');
  const detail = body.trim() ? `: ${body.trim()}` : '';
  throw new Error(`Solid resource ${operation} failed (${response.status} ${response.statusText})${detail}`);
}

async function responseText(response) {
  if (typeof response?.text === 'function') {
    return response.text();
  }
  if (typeof response?.data === 'string') {
    return response.data;
  }
  return '';
}
