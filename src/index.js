export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		url.host = env.CURRENT_INSTANCE;
		const req = new Request(url, request);
		const res = await fetch(req);
		return res;
	},

	async scheduled(event, env, ctx) {
		console.log("Scheduled event triggered!");
		await updateSecret(env);
	}
};

async function updateSecret(env) {
	const response = await fetch("https://twiiit.com/mccrmx", { method: "GET", redirect: "manual" });
	const location = response.headers.get("Location");

	if (location) {
		const entry = { name: "CURRENT_INSTANCE", text: new URL(location).host };
		const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/workers/secrets`, {
			method: "PUT",
			headers: {
				"Authorization": `Bearer ${env.API_TOKEN}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(entry)
		});
	
		if (!response.ok) {
			console.error("Failed to update secret:", await response.text());
		} else {
			console.log("Secret updated successfully!");
		}
	}
}
