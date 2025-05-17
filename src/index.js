export default {
	async fetch(request, env, ctx) {
		return await rewriteRequest(request, env, ctx)
		.then(handleRequest.bind(this, env, ctx));
	},

	async scheduled(event, env, ctx) {
		if (ctx.ip) {
			await env.NITTER_UPDATES.delete(env, ctx.ip);
		}

		const response = await fetch("https://github.com/zedeus/nitter/wiki/Instances");

		const content = await response.text();
		const instance = content.matchAll(/<td align="left"><a href="https:\/\/([^\/"]+)\/?" rel="nofollow">[^<]+<\/a><\/td>\n<td align="left">✅<\/td>\n<td align="left">✅<\/td>/g)
		                 .map((match) => match[1])
		                 .find((instance) => !ctx.blackList || !ctx.blackList.includes(instance));

		if (instance) {
			await env.NITTER_UPDATES.put('127.0.0.1', instance);
		}
	}
};

function rewriteUrlRelatedHeaders(request, url) {
	const headers = new Headers(request.headers);
	const setCookie = headers.getAll("Set-Cookie");
	headers.delete("Set-Cookie");

	headers.forEach((value, key) => {
		if (typeof value === "string" && value.includes(request.url.host)) {
			headers.set(
				key,
				value.replaceAll(request.url.origin, url.origin).replaceAll(request.url.host, url.host)
			);
		}
	});

	for (const cookie of setCookie) {
		headers.append(
			"Set-Cookie",
			cookie.replace(
				new RegExp(`Domain=${request.url.hostname}($|;|,)`),
				`Domain=${url.hostname}$1`
			)
		);
	}

	return headers;
}

async function updateClientHost(env, ctx, host) {
	await env.NITTER_UPDATES.put(ctx.ip, host, {
		expirationTtl: 600,
	});

	return host;
}

async function rewriteRequest(request, env, ctx) {
	ctx.ip = request.headers.get('cf-connecting-ip');
	const url = new URL(request.url);
	const headers = rewriteUrlRelatedHeaders(request, url);

	url.host = await env.NITTER_UPDATES.get(ctx.ip)
	        ?? await env.NITTER_UPDATES.get('127.0.0.1')
	           .then(updateClientHost.bind(this, env, ctx));

	return new Request(url, {
		method: request.method,
		headers,
		body: request.body,
	});
}

async function handleRequest(env, ctx, request) {
	if (request.method == "GET") {
		const response = await caches.default.match(request);

		if (response) {
			return response;
		}
	}

	return await fetch(request)
		.catch((e) => new Response(e.message || e.toString(), { status: 500 }))
	       .then(handleResponse.bind(this, env, ctx, request));
}

async function handleResponse(env, ctx, request, response) {
	if (!request.ok && request.status != 404) {
		ctx.blackList = request.url.host;
		ctx.waitUntil(this.scheduled(null, env, ctx));
	}

	if (request.method == "GET" && response.ok) {
		const [body, resource] = response.body.tee();
		const headers = new Headers(response.headers);
		headers.append("Cache-Control", "max-age=600");

		ctx.waitUntil(caches.default.put(request, new Response(resource, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})));

		return new Response(body, response);
	}

	return response;
}
