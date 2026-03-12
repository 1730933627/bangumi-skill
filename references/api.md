# Bangumi API 参考

## 基本信息

- **API 地址**: https://api.bgm.tv
- **官方文档**: https://bangumi.github.io/api/
- **认证**: 公开接口无需认证，用户相关功能需要 OAuth Access Token

## 获取 Access Token

1. 访问 https://next.bgm.tv/demo/access-token
2. 登录 Bangumi 账号
3. 创建 Access Token
4. 复制并保存 Token

## 常用端点

### 公开接口（无需认证）

#### 搜索

```
GET /search/subject/{keyword}?type={type}
```

**参数:**
- `type`: 2=动画，1=漫画，4=游戏，6=音乐，3=现实

**示例:**
```bash
curl "https://api.bgm.tv/search/subject/葬送的芙莉莲?type=2"
```

---

#### 条目详情

```
GET /v0/subjects/{id}
```

**返回:**
- 基本信息（名称、日期、话数）
- 评分（score, rank, total）
- 图片（large, medium, small, common, grid）
- 标签
- 简介
- 制作人员

**示例:**
```bash
curl "https://api.bgm.tv/v0/subjects/400602"
```

---

#### 新番表

```
GET /calendar
```

**返回:**
- 按星期分组的新番列表
- 每部作品的评分、播出时间

**示例:**
```bash
curl "https://api.bgm.tv/calendar"
```

---

#### 剧集列表

```
GET /v0/episodes?subject_id={id}
```

**返回:**
- 剧集列表（话数、标题、播出时间、类型）

**示例:**
```bash
curl "https://api.bgm.tv/v0/episodes?subject_id=400602"
```

---

#### 角色列表

```
GET /v0/subjects/{id}/characters
```

**返回:**
- 角色列表（姓名、声优、图片）

---

#### 关联推荐

```
GET /v0/subjects/{id}/subjects
```

**返回:**
- 相似作品推荐

---

#### 用户信息

```
GET /v0/users/{username}
```

**返回:**
- 用户基本信息
- 头像、签名、加入时间

---

#### 用户收藏

```
GET /v0/users/{username}/collections?subject_type={type}&limit={limit}
```

**参数:**
- `type`: all, anime, manga, game, music, book
- `limit`: 返回数量（默认 20）

---

### 认证接口（需要 Access Token）

#### 我的信息

```
GET /v0/me
```

**Headers:**
```
Authorization: Bearer {access_token}
```

---

#### 我的收藏

```
GET /v0/me/collections?subject_type={type}&limit={limit}
```

---

#### 更新收藏状态

```
PUT /v0/me/collections/{subject_id}
```

**Body:**
```json
{
  "type": 2,      // 1=想看，2=在看，3=看过，4=搁置，5=抛弃
  "rate": 9       // 可选，评分 1-10
}
```

---

#### 删除收藏

```
DELETE /v0/me/collections/{subject_id}
```

---

## 速率限制

| 接口类型 | 限制 |
|---------|------|
| 公开接口 | 较宽松，建议 < 10 次/秒 |
| 认证接口 | OAuth 标准限制 |
| 图片 | 无限制（CDN 直链） |

## 图片尺寸

| 尺寸 | 说明 | URL 示例 |
|------|------|---------|
| large | 大图 | `/pic/cover/l/...` |
| medium | 中图 | `/r/800/pic/cover/...` |
| small | 小图 | `/r/200/pic/cover/...` |
| common | 普通 | `/r/400/pic/cover/...` |
| grid | 网格 | `/r/100/pic/cover/...` |

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（需要 Token） |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

## 使用示例

### Node.js

```javascript
const https = require('https');

function apiRequest(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'MyApp/1.0',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    https.get(`https://api.bgm.tv${path}`, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// 使用示例
const subject = await apiRequest('/v0/subjects/400602');
const myInfo = await apiRequest('/v0/me', 'YOUR_TOKEN');
```

### Python

```python
import requests

def api_request(path, token=None):
    headers = {'User-Agent': 'MyApp/1.0'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    response = requests.get(f'https://api.bgm.tv{path}', headers=headers)
    return response.json()

# 使用示例
subject = api_request('/v0/subjects/400602')
my_info = api_request('/v0/me', 'YOUR_TOKEN')
```

### cURL

```bash
# 公开接口
curl "https://api.bgm.tv/v0/subjects/400602"

# 认证接口
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.bgm.tv/v0/me"

# 更新收藏状态
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"type":3,"rate":9}' \
     "https://api.bgm.tv/v0/me/collections/400602"
```

## 技能命令对照

| 技能命令 | API 端点 |
|---------|---------|
| `bangumi search <q>` | `/search/subject/{q}` |
| `bangumi subject <id>` | `/v0/subjects/{id}` |
| `bangumi calendar` | `/calendar` |
| `bangumi image <id>` | `/v0/subjects/{id}` (images 字段) |
| `bangumi episodes <id>` | `/v0/episodes?subject_id={id}` |
| `bangumi rating <id>` | `/v0/subjects/{id}` (rating 字段) |
| `bangumi user <name>` | `/v0/users/{name}` |
| `bangumi collections <name>` | `/v0/users/{name}/collections` |
| `bangumi myinfo` | `/v0/me` |
| `bangumi mycollections` | `/v0/me/collections` |
| `bangumi setstatus <id> <type>` | `PUT /v0/me/collections/{id}` |
