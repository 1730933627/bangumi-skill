---
name: bangumi
description: Bangumi 动画查询技能。查询动画、漫画、游戏信息，支持搜索、详情、新番表、评分、收藏管理、角色搜索、相似推荐等全功能。
metadata: {"openclaw":{"emoji":"📺"}}
---

# Bangumi 动画查询技能

## 描述
查询 Bangumi（番组计划）上的动画、漫画、游戏信息，包括搜索、详情（含扩展查询）、新番表、评分、封面图、用户收藏、角色信息、声优信息、关联作品、吐槽箱（用户评论）、标签搜索、相似推荐、剧集进度追踪等全功能。

**API 文档:** https://bangumi.github.io/api/

---

## 触发条件
当用户请求以下操作时使用此技能：
- 查询动画/漫画/游戏信息（如"查一下《XXX》"）
- 查看新番放送表（如"这季度有什么新番"）
- 查看作品评分（如"XXX 评分怎么样"）
- 获取封面图片（如"给我 XXX 的封面图"）
- 查看剧集信息（如"XXX 有多少集"）
- 推荐相似作品（如"推荐类似 XXX 的番剧"）
- 查看角色/声优信息
- 查看用户评论/吐槽箱（如"XXX 的吐槽箱"）
- 查看用户收藏/观看历史（需要 Access Token）
- 标记观看状态/剧集进度（需要 Access Token）

## 不触发
- 非 ACG 相关内容（电影、小说等）

---

## 命令参考

### 基础查询（无需认证）

| 命令 | 说明 | 参数 |
|------|------|------|
| `search <关键词>` | 搜索动画/漫画/游戏 | 关键词 |
| `subject <ID> [选项]` | 获取条目详情（支持扩展查询） | 条目 ID、扩展选项 |
| `calendar` | 查看新番放送表 | - |
| `today [数量]` | 查看今日更新的番剧 | 显示数量（默认 20） |
| `seasonal [数量] [--min 评分]` | 查看本季热门番剧 | 数量、最低评分（默认 7.0） |
| `image <ID> [尺寸]` | 获取封面图 | 条目 ID、尺寸（large/medium/small） |
| `episodes <ID> [--status]` | 获取剧集列表（可显示观看状态） | 条目 ID |
| `rating <ID>` | 获取评分详情 | 条目 ID |
| `comments <ID> [-l 数量]` | 获取吐槽箱（用户评论） | 条目 ID、数量（默认 10） |
| `tags <ID> [--all]` | 获取作品标签列表 | 条目 ID、--all 显示全部标签 |
| `recommend <ID/名称> [数量] [--sort]` | 推荐相似作品 | ID 或名称、数量、排序方式 |
| `cat [选项]` | 分类查询/排行榜 | 见下方分类查询选项 |
| `ts <标签 1> [标签 2] [...] [选项]` | 标签搜索（多标签且关系） | 标签、见下方标签搜索选项 |
| `char <角色 ID> [选项]` | 查询角色详情（通过角色 ID） | 角色 ID、见下方角色搜索选项 |
| `char-search <角色名> [选项]` | 使用 API 搜索角色（POST /v0/search/characters） | 角色名、见下方角色搜索选项 |
| `csearch <角色名> [选项]` | char-search 的简写 | 角色名、见下方角色搜索选项 |

### 用户相关（无需认证）

| 命令 | 说明 | 参数 |
|------|------|------|
| `user <用户名>` | 查看用户信息 | 用户名 |
| `collections <用户名> [类型] [数量]` | 查看用户收藏 | 用户名、类型、数量 |

### 个人管理（需要 Access Token）

| 命令 | 说明 | 参数 |
|------|------|------|
| `myinfo` | 查看我的信息 | - |
| `mycollections [类型] [数量] [--sort] [--page]` | 查看我的收藏 | 类型、数量、排序、页码 |
| `mytoday [数量]` | 我追更的番剧今日更新 | 显示数量 |
| `setstatus <ID> <状态> [-r 评分]` | 标记观看状态 | 条目 ID、状态、评分（可选） |
| `seteps <ID> [选项]` | 标记剧集观看进度 | 条目 ID、剧集 ID 或选项 |

**状态映射：**
| 状态 | 命令 |
|------|------|
| 想看 | `wish` |
| 看过 | `collect` / `done` |
| 在看 | `do` / `doing` |
| 搁置 | `on_hold` |
| 抛弃 | `dropped` |

**剧集进度选项：**
| 选项 | 说明 |
|------|------|
| `<剧集 ID> [...]` | 标记指定剧集为已观看 |
| `--eps 1,2,3` | 批量标记指定剧集 |
| `--all` | 全部看完（标记所有剧集） |

### Token 管理

| 命令 | 说明 |
|------|------|
| `token status` | 查看 Token 状态 |
| `token set <token>` | 设置 Access Token |
| `token clear` | 清除 Token |

---

## 条目详情扩展查询（subject 命令选项）

| 选项 | 简写 | 说明 | API 接口 |
|------|------|------|----------|
| `--detail` | `-d` | 详细模式（启用所有扩展查询） | 全部 |
| `--persons` | `-p` | 查询声优/制作人员 | `/v0/subjects/{id}/persons` |
| `--characters` | `-c` | 查询角色列表 | `/v0/subjects/{id}/characters` |
| `--subjects` | `-s` | 查询关联作品 | `/v0/subjects/{id}/subjects` |
| `--image` | `-i` | 获取高清原图 | `/v0/subjects/{id}/image` |
| `--collections` | | 查询收藏统计 | （从详情直接获取） |
| `--comments` | | 查询吐槽箱（用户评论，显示 5 条） | （网页抓取） |

---

## 选项参考

### 分类查询选项（cat / rank）

| 选项 | 简写 | 说明 | 示例值 |
|------|------|------|--------|
| `--type` | `-t` | 主题类型 | 1=书籍，2=动画，3=音乐，4=游戏，5=三次元 |
| `--sort` | `-s` | 排序方式 | rank/hot/collect/date/name |
| `--category` | `-c` | 分类 | TV/WEB/OVA/剧场版 |
| `--source` | `-o` | 来源 | 原创/漫画改/游戏改/小说改 |
| `--region` | `-r` | 地区 | 日本/中国/美国 |
| `--audience` | `-a` | 受众 | 少年向/少女向/青年向 |
| `--year` | `-y` | 年份 | 2026 |
| `--limit` | `-l` | 每页数量 | 20/30/50 |
| `--page` | `-p` | 页码 | 1/2/3 |

### 标签搜索选项（ts）

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--type` | `-t` | 主题类型 | 2（动画） |
| `--sort` | `-s` | 排序方式 | rank |
| `--limit` | `-l` | 每页数量 | 50 |
| `--page` | `-p` | 页码 | 1 |

### 角色搜索选项（char）

| 选项 | 简写 | 说明 |
|------|------|------|
| `--subjects` | `-s` | 显示出演作品 |
| `--persons` | `-p` | 显示配音演员 |
| `--image` | `-i` | 获取高清原图（small/grid/large/medium，默认 large） |

### 角色 API 搜索选项（char-search / csearch）

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--nsfw` | | 是否包含 R18 角色 | true |

### 角色 API 搜索选项（char-search / csearch）

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--nsfw` | | 是否包含 R18 角色 | true |

### 我的收藏选项（mycollections）

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sort` | `-s` | 排序方式 | time（time/hot/score） |
| `--limit` | `-l` | 每页数量 | 20 |
| `--page` | `-p` | 页码 | 1 |

### 推荐相似作品选项（recommend）

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sort` | `-s` | 排序方式 | hot（hot/score/time/match） |
| `--limit` | `-l` | 推荐数量 | 10 |

---

## Access Token 配置

### 获取 Token
1. 访问 https://next.bgm.tv/demo/access-token
2. 登录你的 Bangumi 账号
3. 创建 Access Token
4. 复制 Token

### 设置 Token
```bash
bangumi token set <your_token>
```

### Token 存储位置
- **Linux/macOS:** `~/.openclaw/workspace/config/bangumi/config.json`
- **Windows:** `%USERPROFILE%\.openclaw\workspace\config\bangumi\config.json`

---

## 配置

- **基础功能：** 无需配置
- **个人管理功能：** 需要配置 Access Token

---

## 依赖

- Node.js v14+
- 无外部依赖（使用原生 https 模块）

---

## 示例

### 基础查询

```bash
# 搜索作品
bangumi search 葬送的芙莉莲

# 查看详情（基础）
bangumi subject 400602

# 查看详情（详细模式）
bangumi subject 548818 --detail

# 查看收藏统计
bangumi subject 548818 --collections

# 查看角色列表
bangumi subject 548818 --characters

# 查看声优信息
bangumi subject 548818 --persons

# 查看吐槽箱
bangumi subject 548818 --comments
bangumi comments 548818 -l 10

# 查看新番表
bangumi calendar

# 查看今日更新（显示 15 部）
bangumi today 15

# 查看本季热门（评分≥7.5，显示 20 部）
bangumi seasonal 20 --min 7.5
bangumi hot 10 --min 7.5

# 获取封面图
bangumi image 400602 large

# 查看剧集列表
bangumi episodes 548818
bangumi episodes 548818 --status  # 显示观看状态

# 获取评分详情
bangumi rating 311

# 获取作品标签
bangumi tags 311                  # 显示热门标签
bangumi tags 311 --all            # 显示全部标签
bangumi tags 400602 -a            # 简写形式

# 推荐相似作品
bangumi recommend 400602          # 推荐 10 部（默认）
bangumi recommend 400602 15       # 推荐 15 部
bangumi recommend 葬送的芙莉莲     # 通过名称推荐
bangumi rec 进击的巨人 10         # 简写

# 按不同方式排序推荐
bangumi recommend 400602 --sort score   # 按评分
bangumi recommend 400602 --sort time    # 按时间
bangumi recommend 400602 --sort match   # 仅匹配度
bangumi rec 葬送的芙莉莲 15 -s hot      # 按热度（简写）
```

### 分类查询

```bash
# 基础查询
bangumi category                          # 动画分类，按排名，20 部
bangumi cat                               # 简写

# 按类型查询
bangumi cat -t 2 -l 30                    # 动画，30 部/页
bangumi cat -t 1                          # 书籍
bangumi cat -t 3                          # 音乐
bangumi cat -t 4                          # 游戏
bangumi cat -t 5                          # 三次元

# 按排序方式
bangumi cat -s rank                       # 按排名（默认）
bangumi cat -s hot                        # 按热度
bangumi cat -s collect                    # 按收藏数
bangumi cat -s date                       # 按日期
bangumi cat -s name                       # 按名称

# 筛选条件
bangumi cat -c TV                         # 只看 TV 动画
bangumi cat -c 剧场版                      # 只看剧场版
bangumi cat -o 漫画改                      # 漫画改编
bangumi cat -o 原创                       # 原创动画
bangumi cat -r 日本                       # 日本动画
bangumi cat -y 2026                       # 2026 年新番
bangumi cat -a 少年向                     # 少年向

# 分页
bangumi cat -p 2 -l 20                    # 第 2 页，20 部/页
bangumi cat -p 3 -l 50                    # 第 3 页，50 部/页

# 组合查询
bangumi cat -c TV -o 漫画改 -y 2026 -l 30    # 2026 年 TV 漫画改，30 部
bangumi cat -r 日本 -a 少年向 -p 2           # 日本少年向，第 2 页
```

### 标签搜索

```bash
# 多标签筛选（且关系）
bangumi ts 科幻 战斗                      # 包含"科幻"且"战斗"
bangumi ts 转生 史莱姆                    # 转生史莱姆系列
bangumi ts 百合 校园 -l 30                # 百合 + 校园，显示 30 部
bangumi ts 异世界 奇幻 -s hot             # 异世界 + 奇幻，按热度排序
bangumi ts 机战 -t 2 -p 2 -l 20           # 机战类动画，第 2 页
```

### 角色搜索

```bash
# 通过作品查找角色（从作品详情获取角色列表）
bangumi subject 604826 --characters     # 查看《超时空辉夜姬！》角色列表

# 通过角色 ID 查询详情
bangumi char 189814                     # 查询酒寄彩葉
bangumi char 189814 -s                  # 显示出演作品
bangumi char 189814 -p                  # 显示配音演员
bangumi char 189814 -s -p               # 显示作品和声优
bangumi char 189814 -i                  # 获取高清原图（默认 large）
bangumi char 189814 -i large            # 获取大图
bangumi char 189814 -i medium           # 获取中图
bangumi char 189814 -i small            # 获取小图
bangumi char 189814 -i grid             # 获取网格图

# API 搜索角色（POST /v0/search/characters）
bangumi char-search 酒寄彩葉            # 搜索角色
bangumi char-search 洛琪希 --nsfw false  # 不包含 R18 内容
bangumi csearch 初音未来                # 简写
```

### 用户相关

```bash
# 查看用户信息
bangumi user your_username

# 查看用户收藏
bangumi collections your_username
bangumi collections your_username anime 20    # 只看动画，20 部
```

### 个人管理（需要 Token）

```bash
# 查看我的信息
bangumi myinfo

# 查看我的收藏
bangumi mycollections                 # 默认：全部类型，20 部，按时间排序
bangumi mycollections anime 15        # 动画类，15 部
bangumi mycol -s hot -l 20            # 按热度排序，20 部
bangumi mycollections anime 10 -s score  # 动画类，按评分排序
bangumi mycol anime 10 -p 2           # 动画类，第 2 页，10 部/页
bangumi mycol anime -l 15 -p 3        # 动画类，第 3 页，15 部/页

# 查看我追更的番剧今日更新
bangumi mytoday
bangumi mytoday 10                    # 显示 10 部

# 标记观看状态
bangumi setstatus 512361 wish         # 标记为想看
bangumi setstatus 512361 do           # 标记为在看
bangumi setstatus 512361 collect      # 标记为看过
bangumi setstatus 512361 on_hold      # 标记为搁置
bangumi setstatus 512361 dropped      # 标记为抛弃

# 标记并评分
bangumi setstatus 400602 collect -r 9    # 标记为看过，评分 9 分
bangumi setstatus 400602 collect --rate 8  # 完整形式
bangumi setstatus 400602 collect 8       # 兼容旧用法

# 标记剧集进度
bangumi seteps 548818 1602096 1602097    # 标记指定剧集
bangumi seteps 548818 --eps 1,2,3        # 批量标记
bangumi seteps 548818 --all              # 全部看完
```

### Token 管理

```bash
# 查看 Token 状态
bangumi token status

# 设置 Access Token
bangumi token set YOUR_ACCESS_TOKEN

# 清除 Token
bangumi token clear
```

---

## 性能优化

| 优化项 | 说明 | 效果 |
|--------|------|------|
| HTTP 连接池 | keepAlive 复用连接 | 减少 TCP 握手 |
| 超时控制 | 10 秒超时 | 防止请求卡死 |
| 多级缓存 | 作品/剧集/标签/收藏缓存 | 重复查询提速 95%+ |
| 并发请求 | 扩展查询并行执行 | 总耗时≈最慢请求 |

### 缓存时间
| 缓存类型 | 时间 |
|---------|------|
| 作品详情 | 30 分钟 |
| 剧集列表 | 30 分钟 |
| 标签列表 | 30 分钟 |
| 新番表 | 10 分钟 |
| 收藏状态 | 2 分钟（变化频繁） |

---

## API 限制

- **公开接口：** 无严格限制，建议 < 10 次/秒
- **认证接口：** 遵循 OAuth 速率限制
- **图片：** 直接链接到 Bangumi CDN，无限制

---

## 相关链接

| 名称 | 链接 |
|------|------|
| API 文档 | https://bangumi.github.io/api/ |
| 获取 Token | https://next.bgm.tv/demo/access-token |
| Bangumi 主页 | https://bgm.tv/ |

---

## 注意事项

| 限制 | 说明 |
|------|------|
| 删除收藏 | 暂不支持（Bangumi API 限制） |
| 直接设置进度 | 不支持（只能通过标记剧集更新） |
| 吐槽箱 | 通过网页抓取获取，非 API |
| 图片链接 | 直接指向 Bangumi CDN |
