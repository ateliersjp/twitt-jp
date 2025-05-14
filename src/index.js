export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		url.host = await env.NITTER_UPDATES.get('CURRENT_LOCATION');
		const req = new Request(url, request);
		const cache = caches.default;
		const res = await cache.match(req);

		if (!res) {
			const res = await fetch(req);
			await cache.put(req, res.clone());
			return res;
		}

		return res;
	},

	async scheduled(event, env, ctx) {
		console.log("Scheduled event triggered!");
		const res = await fetch("https://twiiit.com/mccrmx", { method: "GET", redirect: "manual" });
		const location = res.headers.get("Location");
	
		if (location) {
			await env.NITTER_UPDATES.put('CURRENT_LOCATION', new URL(location).host);
		}
	}
};
