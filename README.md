# 短链接 API 文档

## 1. 基本说明

该服务提供短链接生成、删除、查询、重定向与简单代理功能。

- 需要绑定 `short_link_kv` KV 命名空间
- 可配置环境变量 `SECRET`（默认值 `admin`）
- 静态资源由 `env.ASSETS` 提供

---

## 2. 接口列表

1. `GET /`
2. `GET /ip`
3. `POST /short`
4. `DELETE /short`
5. `GET /short?code=...`
6. `GET /<shortCode>`
7. `GET /http://...` 或 `GET /https://...`

---

## 3. 接口详细说明

### 3.1 `GET /`

- 功能：重定向到 `/index`
- 响应：302 重定向

---

### 3.2 `GET /ip`

- 功能：返回当前 Worker 的出口 IP
- 响应内容：纯文本 IP 地址
- 示例：
  - `GET /ip`
  - 返回：`123.45.67.89`

---

### 3.3 `POST /short`

- 功能：生成短链接
- 请求方式：`POST`
- 请求体：`form-data` 或 `application/x-www-form-urlencoded`
- 参数：
  - `url`：必须，目标长链接
  - `expire`：可选，过期时间，格式如 `YYYY-MM-DDTHH:mm`
    - 如果未提供，默认使用 `9999-12-31T23:59`
- 处理逻辑：
  - 生成随机短码（6 位字符）
  - 将 `{url, expired, visits: 0}` 存入 `short_link_kv`
- 返回示例：
  ```json
  {
  	"status": 200,
  	"shortCode": "abc123",
  	"url": "https://example.com",
  	"exp": "2026-12-31T23:59"
  }
  ```
- 错误：若请求体解析失败或 URL 无效，则返回错误信息

---

### 3.4 `DELETE /short`

- 功能：删除短链接
- 请求方式：`DELETE`
- 请求头：
  - `secret`：必须，和 `env.SECRET` 对比
- 请求体：`form-data`
  - `code`：可选，要删除的短码
- 处理逻辑：
  - 如果 `code` 存在，删除指定短码
  - 如果 `code` 不存在，删除所有键
- 返回示例：
  - 删除指定项：`已删除`
  - 删除全部：`全部删除`
  - 授权失败：`Authorization error`
- 注意：当前实现会将返回值和 `code` 拼接返回

---

### 3.5 `GET /short?code=...`

- 功能：查询短链接信息
- 请求方式：`GET`
- 参数：
  - `code`：短码
- 处理逻辑：
  - 成功返回短码对应的数据
  - 如果未找到，返回 `没找到链接`
- 返回示例：
  ```json
  {
  	"status": true,
  	"key": "abc123",
  	"data": {
  		"url": "https://example.com",
  		"expired": 1750000000000,
  		"visits": 0
  	}
  }
  ```
- 如果不传 `code`：
  - 返回 KV 中的键列表 JSON

---

### 3.6 `GET /<shortCode>`

- 功能：短码重定向
- 请求方式：`GET`
- 路径参数：
  - `<shortCode>`：短码
- 处理逻辑：
  - 从 `short_link_kv` 读取对应值
  - 若不存在或已过期，返回 `null` / 继续尝试静态资源
  - 若有效，则将 `visits` +1 并重定向到原始 URL
- 响应：
  - 有效短链接：302 跳转到原始 URL
  - 失效或不存在：继续返回静态资源页，若找不到则返回首页

---

### 3.7 `GET /http://...` 或 `GET /https://...`

- 功能：简单代理请求
- 说明：
  - 当路径前缀以 `/http://` 或 `/https://` 开头时，服务会将其视为代理目标
  - 例如：`GET /https://example.com/path`
- 处理逻辑：
  - 直接转发请求到目标 URL
  - 返回目标响应体
- 注意：
  - 仅支持通过路径携带完整 URL 的情况
  - 请求头与方法会被转发

---

## 4. 返回值说明

- 生成短链：JSON 字符串
- 删除短链：文本信息
- 查询短链：JSON 字符串或提示文本
- 重定向：HTTP 302
- 代理：目标响应体

---

## 5. 环境配置

- `env.short_link_kv`
  - 存储短链接数据
- `env.SECRET`
  - DELETE 请求授权密钥
  - 默认值：`admin`
- `env.ASSETS`
  - 静态资源挂载

---

## 6. 示例

#### 生成短链接

```bash
curl -X POST https://your-domain/short \
  -d "url=https://example.com" \
  -d "expire=2026-12-31T23:59"
```

#### 查询短链接

```bash
curl "https://your-domain/short?code=abc123"
```

#### 删除短链接

```bash
curl -X DELETE https://your-domain/short \
  -H "secret: admin" \
  -d "code=abc123"
```

#### 短码跳转

```bash
curl -I https://your-domain/abc123
```

#### 代理请求

```bash
curl "https://your-domain/https://example.com"
```

---

## 7. 备注

- `shortCode` 由 `Math.random().toString(36).substring(2, 8)` 生成，长度为 6。
- 过期判断使用 `Date.now()`，因此必须保证 `expire` 可被 `Date.parse()` 识别。
- 删除全部键时会遍历 KV 列表逐一删除。
