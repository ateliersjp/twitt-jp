export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    url.host = await env.NITTER_UPDATES.get('HOST#0');
    return fetch(url, request);
  },

  async scheduled(event, env, ctx) {
    const response = await fetch('https://github.com/zedeus/nitter/wiki/Instances');
    const content = await response.text();
    content.matchAll(/<td align="left"><a href="https:\/\/([^\/"]*)\/?" rel="nofollow">[^<]*<\/a><\/td>\n<td align="left">✅<\/td>\n<td align="left">✅<\/td>/g)
    .forEach((match, i) => ctx.waitUntil(
      env.NITTER_UPDATES.put(`HOST#${i}`, match[1], {
        expirationTtl: 3700,
      })
    ));
  },
}
