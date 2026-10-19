// 1984: Worker entry. /api/* is handled here; everything else is static (public/).

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const json = (data, init) => Response.json(data, init);

async function handleApi(request, env, url) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true });
  }
  throw new HttpError(404, 'Not found.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Serve from one host: *.workers.dev redirects to the custom domain.
    if (env.CANONICAL_HOST && url.hostname.endsWith('.workers.dev')) {
      url.hostname = env.CANONICAL_HOST;
      return Response.redirect(url.toString(), ['GET', 'HEAD'].includes(request.method) ? 301 : 308);
    }
    try {
      // Reject cross-site state-changing requests.
      if (!['GET', 'HEAD'].includes(request.method)) {
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) throw new HttpError(403, 'Cross-origin request rejected.');
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      console.error(e);
      return json({ error: 'Internal error.' }, { status: 500 });
    }
  },
};
