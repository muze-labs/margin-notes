import { error, issues, Optional } from '@muze-nl/assert';
import { lading } from '@muze-labs/lading';
import { createSolidMetroClient } from '@muze-labs/jsfs-solid';

const DEFAULT_ACCEPT = 'application/json';
const DEFAULT_CONTENT_TYPE = 'application/json; charset=utf-8';

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

      if (isStorageDocument(response?.data)) {
        return response.data;
      }

      const text = await responseText(response);
      if (!text.trim()) return null;

      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`Solid resource load returned invalid JSON from ${resourceUrl}: ${error.message}`);
      }
    },

    async save({ key, value } = {}) {
      const resourceUrl = resourceUrlFrom({ key, defaultResourceUrl });
      const solid = solidFor(resourceUrl);
      const response = await callResource(() => solid.resource(resourceUrl).put(
        `${JSON.stringify(value, null, 2)}\n`,
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
