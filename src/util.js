const day = 0;
const hour = 0;
const minute = 0;

export function expired(date) {}
export async function saveUrl(env, url, exp = '9999-12-31T23:59') {
	try {
		const shortValue = { url, expired: Date.parse(exp), visits: 0 };
		const shortCode = Math.random().toString(36).substring(2, 8);

		// 储存到KV中和格式化数据
		await env.short_link_kv.put(shortCode, JSON.stringify(shortValue));
		console.info('生成成功', shortCode, url, exp);
		return JSON.stringify({
			status: 200,
			shortCode,
			url,
			exp,
		});
	} catch (error) {
		console.warn('formData err:\n', error);
		return JSON.stringify({ url: 'url错误', status: 0 }, { status: 400 });
	}
}

export async function delUrl(env, auth, key) {
	const secret = env.SECRET || 'admin';

	// 验证
	if (auth !== secret) {
		return 'Authorization error';
	}
	if (key) {
		await env.short_link_kv.delete(key);
		return '已删除';
	}
	const list = await env.short_link_kv.list(); // 获取键列表
	for (const key of list.keys) {
		await env.short_link_kv.delete(key.name);
	}
	return '全部删除';
}

export async function getKey(env, code) {
	if (code) {
		const json = await env.short_link_kv.get(code);
		if (!json) {
			return '没找到链接';
		}
		return JSON.stringify({
			status: true,
			key: code,
			data: JSON.parse(json),
		});
	}
	const keyList = await env.short_link_kv.list();
	return JSON.stringify(keyList);
}
