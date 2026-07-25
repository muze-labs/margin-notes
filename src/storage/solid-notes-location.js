import { error, issues, Required, Optional } from '@muze-nl/assert';
import { solidApi } from '@muze-labs/metro-solid';
import { authorizePopup, createSolidMetroClient } from '@muze-labs/jsfs-solid';
import oldm from '@muze-nl/oldm';
import { from } from '@muze-nl/jaqt';

const DEFAULT_ROOT_FOLDER_NAME = 'margin-notes';
const DEFAULT_PREFERENCES_FILENAME = 'preferences.ttl';
const DEFAULT_CLIENT_NAME = 'Margin Notes';
const LINKED_DATA_ACCEPT = 'text/turtle, application/ld+json;q=0.9, */*;q=0.1';
const TURTLE = 'text/turtle';
const SPARQL_UPDATE = 'application/sparql-update';
const PREFERENCES_SUBJECT = '#margin-notes';

const prefixes = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  pim: 'http://www.w3.org/ns/pim/space#',
  solid: 'http://www.w3.org/ns/solid/terms#',
  ldp: 'http://www.w3.org/ns/ldp#',
  mn: 'https://vocab.muze.nl/margin-notes#',
};

export async function createSolidNotesConnection(options = {}) {
  assertConnectionOptions(options);

  const webId = normalizeUrl(options.webId, 'WebID');
  const pageUrl = currentPageUrl(options.pageUrl);
  const discoverySolid = options.discoverySolid || options.solid || createDiscoverySolid({ webId, options });
  const profile = await discoverySolid.discoverWebId(webId);
  const storageUrl = oldm.one(profile?.storage, 'first');

  if (!storageUrl) {
    throw new Error(`No Solid storage root found in WebID profile: ${webId}`);
  }

  const issuer = profile?.issuer || firstId(profile?.profile?.solid$oidcIssuer);
  const preferences = preferencesUrlForProfile({
    profile: profile?.profile,
    storageUrl,
    options,
  });

  const solid = options.solid || createStorageSolid({
    issuer,
    rootUrl: storageUrl,
    options: storageOptions({ options, pageUrl }),
  });
  const rootFolderUrl = await marginNotesRootFolder({
    solid,
    preferencesUrl: preferences.url,
    storageUrl,
    rootFolderName: options.rootFolderName || DEFAULT_ROOT_FOLDER_NAME,
  });
  const notesResourceUrl = await notesResourceUrlForPage({
    rootFolderUrl,
    pageUrl,
  });
  return {
    webId,
    profile,
    issuer,
    storageUrl,
    preferencesUrl: preferences.url,
    preferencesUrlSource: preferences.source,
    rootFolderUrl,
    pageUrl,
    resourceUrl: notesResourceUrl,
    solid,
  };
}

function preferencesUrlForProfile({ profile, storageUrl, options }) {
  if (options.preferencesUrl) {
    return {
      url: normalizeUrl(options.preferencesUrl, 'preferencesUrl'),
      source: 'configured',
    };
  }

  const profilePreferencesUrl = firstId(profile?.pim$preferencesFile);
  if (profilePreferencesUrl) {
    return {
      url: profilePreferencesUrl,
      source: 'profile',
    };
  }

  return {
    url: new URL(options.preferencesFilename || DEFAULT_PREFERENCES_FILENAME, ensureSlash(storageUrl)).href,
    source: 'default',
  };
}

export async function notesResourceUrlForPage({ rootFolderUrl, pageUrl } = {}) {
  const root = ensureSlash(normalizeUrl(rootFolderUrl, 'rootFolderUrl'));
  const page = currentPageUrl(pageUrl);
  return new URL(`page-${await sha256Hex(page)}.ttl`, root).href;
}

async function marginNotesRootFolder({ solid, preferencesUrl, storageUrl, rootFolderName }) {
  const existing = await loadMarginNotesRootFolder({ solid, preferencesUrl });
  if (existing) return ensureSlash(existing);

  const rootFolderUrl = new URL(`${encodePathSegment(rootFolderName)}/`, ensureSlash(storageUrl)).href;
  await saveDefaultMarginNotesRootFolder({ solid, preferencesUrl, rootFolderUrl });
  await ensureRootFolder({ solid, rootFolderUrl });
  return rootFolderUrl;
}

async function loadMarginNotesRootFolder({ solid, preferencesUrl }) {
  const response = await solid.get(preferencesUrl, {
    headers: { Accept: LINKED_DATA_ACCEPT },
  });
  if (response?.status === 404) return '';
  await ensureOk({ response, operation: 'read preferences' });

  const graph = await graphFromResponse({ response, resourceUrl: preferencesUrl });
  const subject = from(graphSubjects(graph))
    .where(subject => firstId(subject.mn$rootFolder))[0];
  return firstId(subject?.mn$rootFolder);
}

async function saveDefaultMarginNotesRootFolder({ solid, preferencesUrl, rootFolderUrl }) {
  const exists = await resourceExists({ solid, resourceUrl: preferencesUrl });

  if (!exists) {
    const response = await solid.put(preferencesUrl, {
      body: preferencesTurtle({ preferencesUrl, rootFolderUrl }),
      headers: { 'Content-Type': TURTLE },
    });
    await ensureOk({ response, operation: 'create preferences' });
    return;
  }

  const response = await solid.patch(preferencesUrl, {
    body: preferencesPatch({ preferencesUrl, rootFolderUrl }),
    headers: { 'Content-Type': SPARQL_UPDATE },
  });
  await ensureOk({ response, operation: 'update preferences' });
}

async function ensureRootFolder({ solid, rootFolderUrl }) {
  if (typeof solid.createContainer !== 'function') return;

  const response = await solid.createContainer(rootFolderUrl);
  if (response?.ok || [200, 201, 204, 205, 409, 412].includes(response?.status)) return;
  await ensureOk({ response, operation: 'create margin-notes folder' });
}

async function resourceExists({ solid, resourceUrl }) {
  let response;
  if (typeof solid.head === 'function') {
    response = await solid.head(resourceUrl);
  } else {
    response = await solid.get(resourceUrl, {
      headers: { Accept: LINKED_DATA_ACCEPT },
    });
  }

  if (response?.status === 404) return false;
  await ensureOk({ response, operation: 'check preferences' });
  return true;
}

async function graphFromResponse({ response, resourceUrl }) {
  const data = response?.data ?? response;
  if (data?.subjects || data?.primary) {
    return data;
  }

  return oldm.context({
    defaultGraph: resourceUrl,
    prefixes,
  }).parse(await responseText(response), resourceUrl, responseContentType(response) || TURTLE);
}

function graphSubjects(graph) {
  return oldm.subjects(graph);
}

async function responseText(response) {
  if (typeof response?.text === 'function') return response.text();
  if (typeof response?.data === 'string') return response.data;
  return '';
}

function responseContentType(response) {
  return response?.headers?.get?.('Content-Type') || response?.headers?.get?.('content-type') || '';
}

function preferencesTurtle({ preferencesUrl, rootFolderUrl }) {
  return `@prefix mn: <${prefixes.mn}>.\n\n<${preferencesSubject(preferencesUrl)}> a mn:Preferences;\n  mn:rootFolder <${rootFolderUrl}>.\n`;
}

function preferencesPatch({ preferencesUrl, rootFolderUrl }) {
  return `PREFIX mn: <${prefixes.mn}>\nINSERT DATA { <${preferencesSubject(preferencesUrl)}> a mn:Preferences; mn:rootFolder <${rootFolderUrl}>. }`;
}

function preferencesSubject(preferencesUrl) {
  return new URL(PREFERENCES_SUBJECT, preferencesUrl).href;
}

function createDiscoverySolid({ webId, options }) {
  const metroClient = createSolidMetroClient(webId, {
    ...storageOptions({ options, pageUrl: currentPageUrl(options.pageUrl) }),
    oidc: false,
    configureMetro: true,
  });
  return solidApi(metroClient);
}

function createStorageSolid({ issuer, rootUrl, options }) {
  const metroClient = createSolidMetroClient(rootUrl, {
    ...options,
    issuer,
    oidc: Boolean(issuer),
    configureMetro: true,
  });
  return solidApi(metroClient);
}

function storageOptions({ options, pageUrl }) {
  const redirectUri = options.callbackUrl || pageUrl;
  const solidOptions = { ...(options.solidOptions || {}) };
  if (solidOptions.authorize_callback === undefined && options.authorize_callback === undefined && options.usePopupAuth !== false) {
    solidOptions.authorize_callback = authorizePopup;
  }
  const authorizeCallback = options.authorize_callback || solidOptions.authorize_callback;
  if (
    solidOptions.forceAuthorizationForWrites === undefined
    && options.forceAuthorizationForWrites === undefined
    && authorizeCallback
  ) {
    solidOptions.forceAuthorizationForWrites = true;
  }

  return {
    ...solidOptions,
    ...(options.authorize_callback ? { authorize_callback: options.authorize_callback } : {}),
    ...(options.force_authorization !== undefined ? { force_authorization: options.force_authorization } : {}),
    ...(options.forceAuthorizationForWrites !== undefined ? { forceAuthorizationForWrites: options.forceAuthorizationForWrites } : {}),
    client_info: {
      client_name: options.clientName || DEFAULT_CLIENT_NAME,
      redirect_uris: [redirectUri],
      ...(options.client_info || {}),
    },
  };
}

function assertConnectionOptions(options) {
  const optionIssues = issues(options, {
    webId: Required(String),
    pageUrl: Optional(String),
    callbackUrl: Optional(String),
    preferencesUrl: Optional(String),
    preferencesFilename: Optional(String),
    rootFolderName: Optional(String),
    clientName: Optional(String),
    usePopupAuth: Optional(Boolean),
    authorize_callback: Optional(callable),
    force_authorization: Optional(Boolean),
    forceAuthorizationForWrites: Optional(Boolean),
    client_info: Optional(Object),
    solidOptions: Optional(Object),
  });

  if (optionIssues) {
    throw new TypeError(`Invalid Solid notes connection options: ${optionIssues[0].pathString} ${optionIssues[0].message}`);
  }
}

function callable(value, _root, path) {
  if (typeof value !== 'function') {
    return error('data is not a function', value, 'function', path);
  }
  return false;
}

function normalizeUrl(value, name) {
  try {
    return new URL(value).href;
  } catch {
    throw new Error(`Invalid ${name}: ${value}`);
  }
}

function currentPageUrl(value) {
  const href = value || globalThis.location?.href || '';
  const url = new URL(href);
  url.hash = '';
  return url.href;
}

function ensureSlash(url) {
  return String(url).endsWith('/') ? String(url) : `${url}/`;
}

function firstId(value) {
  const item = oldm.one(value, 'first');
  return typeof item === 'string' ? item : item?.id || '';
}

function encodePathSegment(value) {
  return String(value).split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return fallbackHash(value);
}

function fallbackHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function ensureOk({ response, operation }) {
  if (response?.ok) return;

  const detail = (await responseText(response)).trim();
  const suffix = detail ? `: ${detail}` : '';
  throw new Error(`Solid ${operation} failed (${response?.status || 'unknown'} ${response?.statusText || ''})${suffix}`);
}
