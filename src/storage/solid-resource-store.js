import { annotationVocabulary } from '../features/paragraph-note-stacks/vocabulary.js';
import { error, issues, Optional } from '@muze-nl/assert';
import { solidApi } from '@muze-labs/metro-solid';
import { createSolidMetroClient } from '@muze-labs/jsfs-solid';
import oldm from '@muze-nl/oldm';
import { from } from '@muze-nl/jaqt';

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
  const providedSolid = options.solid || options.solidApi || null;
  const generatedClient = {
    clients: new Map(),
  };

  function solidFor(resourceUrl, requestOptions = {}) {
    return solidClientFor({ options, providedSolid, resourceUrl, generatedClient, requestOptions });
  }

  return {
    name: 'solidResourceStore',

    async load({ key } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl);
      const response = await callResource(() => solid.get(resourceUrl, {
        headers: { Accept: accept },
      }));

      if (isMissing(response)) return null;

      const data = response;
      if (isOldmGraph(data)) {
        return storageDocumentFromGraph({ graph: data, resourceUrl });
      }

      if (isStorageDocument(data)) {
        return data;
      }

      await ensureOk({ response, operation: 'load' });
      const text = await responseText(response);
      if (!text.trim()) return null;

      if (isLinkedDataResponse(response)) {
        return storageDocumentFromGraph({
          graph: oldmContext({ resourceUrl }).parse(text, resourceUrl, responseContentType(response) || DEFAULT_CONTENT_TYPE),
          resourceUrl,
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        throw new Error(`Solid resource load returned invalid linked data or JSON from ${resourceUrl}: ${error.message}`);
      }

      if (!isStorageDocument(parsed) && !Array.isArray(parsed)) {
        throw new Error(`Solid resource load returned JSON that is not a notes document from ${resourceUrl}`);
      }
      return parsed;
    },

    async save({ key, value } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl, { writesBody: true });
      const graph = graphFromStorageDocument({ document: value, resourceUrl });
      const response = await callResource(() => solid.put(resourceUrl, {
        body: graph,
        headers: { 'Content-Type': contentType },
      }));

      await ensureOk({ response, operation: 'save' });
      return {
        key: resourceUrl,
        resourceUrl,
        status: response.status,
      };
    },

    async remove({ key } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl, { needsAuthorization: true });
      const response = await callResource(() => solid.delete(resourceUrl));

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
    force_authorization: Optional(Boolean),
    forceAuthorizationForWrites: Optional(Boolean),
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
    ...annotationVocabulary.prefixes,
    ...prefixes,
  };
}

function graphFromStorageDocument({ document, resourceUrl }) {
  let storageDocument = { subjects: [] };
  if (isStorageDocument(document)) {
    storageDocument = document;
  }

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

    if (predicate === 'rdf$type' || predicate === 'a') {
      graph.add(subject.id, 'a', value);
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

  if (value instanceof String || value instanceof Number) {
    return oldm.literal(value);
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
  const subjects = Array.from(from(graphSubjects(graph))
    .where(subject => oldm.many(subject.a).includes(annotationVocabulary.classes.annotation) || oldm.many(subject.rdf$type).includes(annotationVocabulary.classes.annotation))
    .select(subject => repairConventionalAnnotationParts({
      graph,
      annotation: storageSubjectFromOldmSubject({ graph, subject }),
    })));

  return {
    format: DEFAULT_FORMAT,
    version: DEFAULT_VERSION,
    prefixes: annotationPrefixes(graph?.prefixes ?? graph?.context?.prefixes),
    resourceUrl,
    subjects,
  };
}

function repairConventionalAnnotationParts({ graph, annotation }) {
  if (!annotation?.id) return annotation;

  const body = annotation.oa$hasBody || conventionalSubject({
    graph,
    subjectId: annotation.id,
    suffixes: ['#body', '-body'],
    types: [annotationVocabulary.classes.textualBody, annotationVocabulary.classes.cobaltFragment],
  });
  if (body) {
    annotation.oa$hasBody = body;
  }

  const target = annotation.oa$hasTarget || conventionalSubject({
    graph,
    subjectId: annotation.id,
    suffixes: ['#target', '-target'],
    types: [annotationVocabulary.classes.specificResource],
  });
  if (target) {
    target.oa$hasSelector = target.oa$hasSelector || conventionalSubject({
      graph,
      subjectId: annotation.id,
      suffixes: ['#selector-fragment', '-selector', '#selector'],
      types: [annotationVocabulary.classes.fragmentSelector],
    });
    annotation.oa$hasTarget = target;
  }

  return annotation;
}

function conventionalSubject({ graph, subjectId, suffixes, types }) {
  const subject = from(suffixes)
    .select(suffix => graph?.subjects?.[`${subjectId}${suffix}`])
    .where(candidate => candidate && oldm.many(candidate.a).some(type => types.includes(type)))[0];

  if (!subject) return null;
  return storageSubjectFromOldmSubject({ graph, subject });
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
    return NODE_PREDICATES.has(predicate) ? value.id : {id: value.id};
  }

  if (value instanceof String || value instanceof Number) {
    if (predicate !== 'cobalt$fragment' && (value.language || (value.type && value.type !== 'http://www.w3.org/2001/XMLSchema#string'))) {
      return oldm.literal(value);
    }
    return storageLiteralValue({ predicate, value: value.valueOf() });
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
  return Object.values(graph.subjects);
}

function resourceUrlFrom({ key, defaultResourceUrl }) {
  const resourceUrl = defaultResourceUrl || key;
  if (issues(resourceUrl, String)) {
    throw new Error('Solid resource store requires a resourceUrl option or key');
  }
  return resourceUrl;
}

function solidClientFor({ options, providedSolid, resourceUrl, generatedClient, requestOptions = {} }) {
  if (providedSolid) {
    assertSolidClient(providedSolid);
    return providedSolid;
  }

  const rootUrl = options.rootUrl || options.storageUrl || resourceUrl;
  const forceAuthorization = forceAuthorizationForRequest({ options, requestOptions });
  const cacheKey = `${rootUrl}\nforce:${forceAuthorization}`;
  if (generatedClient.clients.has(cacheKey)) {
    return generatedClient.clients.get(cacheKey);
  }

  const metroClient = createSolidMetroClient(rootUrl, {
    ...options,
    oidc: options.oidc ?? Boolean(options.issuer),
    force_authorization: forceAuthorization,
    configureMetro: options.configureMetro ?? true,
  });
  const solid = solidApi(metroClient);
  generatedClient.clients.set(cacheKey, solid);
  return solid;
}

function forceAuthorizationForRequest({ options, requestOptions }) {
  if (options.force_authorization !== undefined) {
    return options.force_authorization;
  }
  if (requestOptions.writesBody || requestOptions.needsAuthorization) {
    return Boolean(options.forceAuthorizationForWrites);
  }
  return false;
}

function assertSolidClient(solid) {
  const clientIssues = issues(solid, {
    get: callable,
    put: callable,
    delete: callable,
  });

  if (clientIssues) {
    throw new TypeError('Solid resource store requires a Solid API client with get/put/delete');
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

function isLinkedDataResponse(response) {
  return /^text\/turtle\b|^application\/ld\+json\b|^application\/n-quads\b|^application\/trig\b/.test(responseContentType(response));
}

function responseContentType(response) {
  return response.headers.get('Content-Type') || '';
}

async function ensureOk({ response, operation }) {
  if (response.ok) return;

  const body = await responseText(response).catch(() => '');
  const detail = body.trim() ? `: ${body.trim()}` : '';
  throw new Error(`Solid resource ${operation} failed (${response.status} ${response.statusText})${detail}`);
}

async function responseText(response) {
  return response.text();
}
