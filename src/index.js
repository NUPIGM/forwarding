import { saveUrl, delUrl, getKey } from './util';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const target = url.pathname;

		switch (target) {
			case '/ip':
				return new Response(await workerIP());
			case '/shortlink':
				if (request.method === 'POST') {
					const formData = await request.formData();
					const longUrl = formData.get('url') || url.origin;
					const expired = formData.get('expired') || undefined;
					const result = await saveUrl(env, longUrl, expired);
					return new Response(result);
				} else if (request.method === 'DELETE') {
					const formData = await request.formData();
					const auth = request.headers.get('secret');
					const code = formData.get('code');
					const result = await delUrl(env, auth, code);
					return new Response(result + code);
				} else if (request.method === 'GET') {
					const code = url.searchParams.get('code');
					const result = await getKey(env, code);
					return new Response(result);
				}
				return new Response('错误请求', { status: 405 });
			default:
				// 检查是否是http，决定代理流量
				if (target.startsWith('/http://') || target.startsWith('/https://')) {
					const result = await uniproxy(request);
					return new Response(result);
				}
				//执行重定向
	const code = url.pathname.slice(1);
				const result=await redirect(env,code);
				console.log(result)
				if (result) {
					return Response.redirect(result, 302)
				}

				// 访问静态文件，404直接返回首页
				const assets = await env.ASSETS.fetch(request);
				if (assets.status === 404) {
					return await env.ASSETS.fetch(`${url.origin}/`);
				}
				return assets;
				break;
		}
	},
};
async function workerIP() {
	// 调用外部服务获取 Worker 当前的出口 IP
	const res = await fetch('https://api.ipify.org?format=text', {
		method: 'GET',
		headers: { 'User-Agent': 'Cloudflare-Worker-IP-Checker' },
	});
	return res.body;
}
async function redirect(env,key) {
		let value = await env.short_link_kv.get(key);
			 value = JSON.parse(value);
			if (!value||value.expired < Date.now()) {
				return null
			}
			value.visits += 1;
			await env.short_link_kv.put(key, JSON.stringify(value));
			return value.url
	
}
async function uniproxy(request) {
	const url = new URL(request.url);
	const pathStr = url.pathname.slice(1);
	const newRequest = await fetch(pathStr, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		redirect: 'follow',
	}).then((response) => {
		console.info('代理', pathStr);
		return response.body;
	});
	return newRequest;
}
