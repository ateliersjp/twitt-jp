/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { getCurrentInstance } from './utils';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		url.host = await getCurrentInstance();
		const req = new Request(url, request);
		const res = await fetch(req);
		return res;
	},
};
