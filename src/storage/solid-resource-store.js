import { error, issues, Optional } from '@muze-nl/assert';
import { solidApi } from '@muze-labs/metro-solid';
import { createSolidMetroClient } from '@muze-labs/jsfs-solid';
import oldm from '@muze-nl/oldm';

const DEFAULT_CONTENT_TYPE = 'text/turtle';

export function createSolidResourceStore(options = {}) {
  assertOptions(options);

  const defaultResourceUrl = options.resourceUrl || '';
  const accept = DEFAULT_CONTENT_TYPE;
  const contentType = DEFAULT_CONTENT_TYPE;
  const providedSolid = options.solid || null;
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

      if (response instanceof oldm.Graph) {
        return response.write();
      }
      await ensureOk({ response, operation: 'load' });
      if (!/^text\/turtle\b/.test(response.headers.get('Content-Type') || '')) {
        throw new TypeError('Solid resource store expects text/turtle');
      }
      return response.text();
    },

    async save({ key, value } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl, { writesBody: true });
      if (typeof value !== 'string') {
        throw new TypeError('Solid resource store expects Turtle text');
      }
      const response = await callResource(() => solid.put(resourceUrl, {
        body: value,
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
    force_authorization: Optional(Boolean),
    forceAuthorizationForWrites: Optional(Boolean),
  });

  if (optionIssues) {
    throw new TypeError(`Invalid Solid resource store options: ${optionIssues[0].pathString} ${optionIssues[0].message}`);
  }
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

async function ensureOk({ response, operation }) {
  if (response.ok) return;

  const body = await responseText(response).catch(() => '');
  const detail = body.trim() ? `: ${body.trim()}` : '';
  throw new Error(`Solid resource ${operation} failed (${response.status} ${response.statusText})${detail}`);
}

async function responseText(response) {
  return response.text();
}
