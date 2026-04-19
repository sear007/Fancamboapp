const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=UTF-8',
};

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: buildCorsHeaders(request, env),
        });
      }

      const verificationToken = matchTikTokVerificationPath(url.pathname);

      if (request.method === 'GET' && verificationToken) {
        return new Response(`tiktok-developers-site-verification=${verificationToken}`, {
          headers: {
            'Content-Type': 'text/plain; charset=UTF-8',
          },
        });
      }

      if (url.pathname.startsWith('/api/')) {
        validateOrigin(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return jsonResponse(request, env, {
          ok: true,
          worker: 'fancambo-worker',
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/tiktok/oauth/exchange') {
        return handleTikTokOAuthExchange(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/r2/multipart/start') {
        return handleMultipartStart(request, env);
      }

      if (request.method === 'PUT' && url.pathname === '/api/r2/multipart/part') {
        return handleMultipartPartUpload(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/r2/multipart/complete') {
        return handleMultipartComplete(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/tiktok/post/creator-info') {
        return handleTikTokCreatorInfo(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/tiktok/post/init') {
        return handleTikTokPostInit(request, env);
      }

      if (request.method === 'POST' && (url.pathname === '/api/tiktok/post/status' || url.pathname === '/api/tiktok/upload/status')) {
        return handleTikTokPostStatus(request, env);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
        return handleMediaRequest(request, env, url);
      }

      return jsonResponse(
        request,
        env,
        {
          error: 'not_found',
          message: 'Route not found.',
        },
        {status: 404},
      );
    } catch (error) {
      return jsonResponse(
        request,
        env,
        {
          error: 'internal_error',
          message: error instanceof Error ? error.message : 'Unexpected worker error.',
        },
        {status: 500},
      );
    }
  },
};

async function handleTikTokOAuthExchange(request, env) {
  requireSecrets(env, ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);

  const body = await readJson(request);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri.trim() : '';

  if (!code || !redirectUri) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: 'Both "code" and "redirectUri" are required.',
      },
      {status: 400},
    );
  }

  const tokenBody = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody,
  });

  const tokenJson = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenJson?.access_token) {
    return jsonResponse(
      request,
      env,
      {
        error: tokenJson?.error || 'token_exchange_failed',
        message: tokenJson?.error_description || 'TikTok did not return an access token.',
        details: tokenJson,
      },
      {status: tokenResponse.status || 502},
    );
  }

  const profile = await fetchTikTokProfile(tokenJson.access_token);
  const now = Date.now();

  return jsonResponse(request, env, {
    session: {
      accessToken: tokenJson.access_token,
      authCode: code,
      connectedAt: now,
      expiresAt: now + Number(tokenJson.expires_in || 0) * 1000,
      openId: tokenJson.open_id || profile?.open_id || '',
      profile: profile
        ? {
            avatarUrl: profile.avatar_url || null,
            displayName: profile.display_name || null,
            openId: profile.open_id || tokenJson.open_id || '',
          }
        : null,
      refreshExpiresAt: tokenJson.refresh_expires_in ? now + Number(tokenJson.refresh_expires_in) * 1000 : null,
      refreshToken: tokenJson.refresh_token || null,
      scope: String(tokenJson.scope || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      tokenType: tokenJson.token_type || null,
    },
  });
}

async function handleMultipartStart(request, env) {
  assertBucketBinding(env);

  const body = await readJson(request);
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : 'application/octet-stream';

  if (!fileName) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"fileName" is required.',
      },
      {status: 400},
    );
  }

  const safeFileName = sanitizeFileName(fileName);
  const objectKey = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName}`;
  const multipartUpload = await env.VIDEOS_BUCKET.createMultipartUpload(objectKey, {
    httpMetadata: {
      contentDisposition: `inline; filename="${safeFileName.replace(/"/g, '')}"`,
      contentType,
    },
  });

  return jsonResponse(request, env, {
    objectKey,
    uploadId: multipartUpload.uploadId,
  });
}

async function handleMultipartPartUpload(request, env) {
  assertBucketBinding(env);

  const url = new URL(request.url);
  const objectKey = url.searchParams.get('objectKey') || '';
  const uploadId = url.searchParams.get('uploadId') || '';
  const partNumber = Number(url.searchParams.get('partNumber') || '');

  if (!objectKey || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"objectKey", "uploadId", and a valid "partNumber" are required.',
      },
      {status: 400},
    );
  }

  const body = await request.arrayBuffer();

  if (!body.byteLength) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: 'Chunk body cannot be empty.',
      },
      {status: 400},
    );
  }

  const multipartUpload = env.VIDEOS_BUCKET.resumeMultipartUpload(objectKey, uploadId);
  const uploadedPart = await multipartUpload.uploadPart(partNumber, body);

  return jsonResponse(request, env, {
    etag: uploadedPart.etag,
    partNumber: uploadedPart.partNumber,
  });
}

async function handleMultipartComplete(request, env) {
  assertBucketBinding(env);

  const body = await readJson(request);
  const objectKey = typeof body.objectKey === 'string' ? body.objectKey.trim() : '';
  const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : '';
  const parts = Array.isArray(body.parts) ? body.parts : [];

  if (!objectKey || !uploadId || !parts.length) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"objectKey", "uploadId", and non-empty "parts" are required.',
      },
      {status: 400},
    );
  }

  const sortedParts = parts
    .map((part) => ({
      etag: typeof part.etag === 'string' ? part.etag : '',
      partNumber: Number(part.partNumber),
    }))
    .filter((part) => part.etag && Number.isInteger(part.partNumber) && part.partNumber > 0)
    .sort((left, right) => left.partNumber - right.partNumber);

  if (!sortedParts.length) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: 'No valid multipart upload parts were provided.',
      },
      {status: 400},
    );
  }

  const multipartUpload = env.VIDEOS_BUCKET.resumeMultipartUpload(objectKey, uploadId);
  await multipartUpload.complete(sortedParts);

  return jsonResponse(request, env, {
    mediaUrl: buildMediaUrl(request.url, objectKey),
    objectKey,
  });
}

async function handleTikTokCreatorInfo(request, env) {
  const body = await readJson(request);
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

  if (!accessToken) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"accessToken" is required.',
      },
      {status: 400},
    );
  }

  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });

  const json = await response.json();
  const error = json?.error;

  if (!response.ok || (error?.code && error.code !== 'ok')) {
    return jsonResponse(
      request,
      env,
      {
        error: error?.code || 'tiktok_creator_info_failed',
        message: error?.message || 'TikTok did not return creator information.',
        details: json,
      },
      {status: response.status || 502},
    );
  }

  return jsonResponse(request, env, {
    commentDisabled: Boolean(json?.data?.comment_disabled),
    creatorAvatarUrl: typeof json?.data?.creator_avatar_url === 'string' ? json.data.creator_avatar_url : null,
    creatorNickname: typeof json?.data?.creator_nickname === 'string' ? json.data.creator_nickname : null,
    creatorUsername: typeof json?.data?.creator_username === 'string' ? json.data.creator_username : null,
    duetDisabled: Boolean(json?.data?.duet_disabled),
    maxVideoPostDurationSec: Number.isFinite(Number(json?.data?.max_video_post_duration_sec))
      ? Number(json.data.max_video_post_duration_sec)
      : null,
    privacyLevelOptions: Array.isArray(json?.data?.privacy_level_options)
      ? json.data.privacy_level_options.filter((value) => typeof value === 'string')
      : [],
    stitchDisabled: Boolean(json?.data?.stitch_disabled),
  });
}

async function handleTikTokPostInit(request, env) {
  const body = await readJson(request);
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  const privacyLevel = typeof body.privacyLevel === 'string' ? body.privacyLevel.trim() : '';
  const title = typeof body.title === 'string' ? body.title : '';
  const allowComment = Boolean(body.allowComment);
  const allowDuet = Boolean(body.allowDuet);
  const allowStitch = Boolean(body.allowStitch);
  const discloseBrandContent = Boolean(body.discloseBrandContent);
  const discloseBrandOrganic = Boolean(body.discloseBrandOrganic);
  const isAigc = Boolean(body.isAigc);

  if (!accessToken || !videoUrl || !privacyLevel) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"accessToken", "videoUrl", and "privacyLevel" are required.',
      },
      {status: 400},
    );
  }

  if (title.length > 2200) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: 'TikTok captions must be 2200 characters or fewer.',
      },
      {status: 400},
    );
  }

  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        brand_content_toggle: discloseBrandContent,
        brand_organic_toggle: discloseBrandOrganic,
        disable_comment: !allowComment,
        disable_duet: !allowDuet,
        disable_stitch: !allowStitch,
        is_aigc: isAigc,
        privacy_level: privacyLevel,
        ...(title.trim() ? {title} : {}),
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  });

  const json = await response.json();
  const error = json?.error;

  if (!response.ok || (error?.code && error.code !== 'ok')) {
    return jsonResponse(
      request,
      env,
      {
        error: error?.code || 'tiktok_post_init_failed',
        message: error?.message || 'TikTok did not accept the direct post request.',
        details: json,
      },
      {status: response.status || 502},
    );
  }

  return jsonResponse(request, env, {
    publishId: json?.data?.publish_id || null,
  });
}

async function handleTikTokPostStatus(request, env) {
  const body = await readJson(request);
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const publishId = typeof body.publishId === 'string' ? body.publishId.trim() : '';

  if (!accessToken || !publishId) {
    return jsonResponse(
      request,
      env,
      {
        error: 'invalid_request',
        message: '"accessToken" and "publishId" are required.',
      },
      {status: 400},
    );
  }

  const response = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      publish_id: publishId,
    }),
  });

  const json = await response.json();
  const error = json?.error;

  if (!response.ok || (error?.code && error.code !== 'ok')) {
    return jsonResponse(
      request,
      env,
      {
        error: error?.code || 'tiktok_post_status_failed',
        message: error?.message || 'TikTok did not return post status.',
        details: json,
      },
      {status: response.status || 502},
    );
  }

  return jsonResponse(request, env, json?.data || {});
}

async function handleMediaRequest(request, env, url) {
  assertBucketBinding(env);

  const objectKey = decodeObjectKey(url.pathname.slice('/media/'.length));

  if (!objectKey) {
    return new Response('Not found', {status: 404});
  }

  const object = await env.VIDEOS_BUCKET.get(objectKey);

  if (!object) {
    return new Response('Not found', {status: 404});
  }

  const headers = new Headers(buildCorsHeaders(request, env));
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, {
    headers,
  });
}

async function fetchTikTokProfile(accessToken) {
  const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  return json?.data?.user || null;
}

function jsonResponse(request, env, payload, init = {}) {
  const headers = new Headers({
    ...JSON_HEADERS,
    ...buildCorsHeaders(request, env),
  });

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

function buildCorsHeaders(request, env) {
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const allowedOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function validateOrigin(request, env) {
  const requestOrigin = request.headers.get('Origin');

  if (!requestOrigin) {
    return;
  }

  const allowedOrigins = getAllowedOrigins(env);

  if (!allowedOrigins.includes(requestOrigin)) {
    throw new Error(`Origin "${requestOrigin}" is not allowed for this worker.`);
  }
}

function getAllowedOrigins(env) {
  const configuredOrigins = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = ['http://127.0.0.1:3000', 'http://localhost:3000'];
  return [...new Set([...configuredOrigins, ...defaults])];
}

async function readJson(request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function buildMediaUrl(requestUrl, objectKey) {
  const origin = new URL(requestUrl).origin;
  const encodedPath = objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${origin}/media/${encodedPath}`;
}

function decodeObjectKey(value) {
  return value
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

function sanitizeFileName(value) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'upload-video.mp4';
}

function requireSecrets(env, keys) {
  for (const key of keys) {
    if (!env[key]) {
      throw new Error(`Missing worker secret: ${key}`);
    }
  }
}

function assertBucketBinding(env) {
  if (!env.VIDEOS_BUCKET) {
    throw new Error('Missing Worker R2 binding: VIDEOS_BUCKET');
  }
}

function matchTikTokVerificationPath(pathname) {
  const match = pathname.match(/^\/tiktok([A-Za-z0-9]+)\.txt$/);
  return match ? match[1] : null;
}
