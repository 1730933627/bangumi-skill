# Bangumi 动画查询技能

OpenClaw 的 Bangumi（番组计划）技能，提供动画、漫画、游戏信息查询的全功能 CLI 工具。

## 📺 功能特性

| 功能 | 说明 | 认证要求 |
|------|------|----------|
| 🔍 **作品搜索** | 搜索动画、漫画、游戏 | 无需 |
| 📋 **条目详情** | 查看详情、评分、收藏统计 | 无需 |
| 📅 **新番表** | 查看季度新番放送表 | 无需 |
| 📊 **评分查询** | 获取评分详情和分布 | 无需 |
| 🎙️ **声优/制作** | 查询声优和制作人员信息 | 无需 |
| 👥 **角色信息** | 查询角色详情和出演作品 | 无需 |
| 💬 **吐槽箱** | 查看用户评论 | 无需 |
| 🏷️ **标签系统** | 查看作品标签、标签搜索 | 无需 |
| 🔗 **相似推荐** | 推荐相似作品 | 无需 |
| 📁 **分类查询** | 按类型、地区、年份筛选 | 无需 |
| 👤 **用户信息** | 查看用户资料和收藏 | 无需 |
| 📝 **观看管理** | 标记观看状态、剧集进度 | 需要 Token |
| 📊 **我的收藏** | 查看个人收藏列表 | 需要 Token |
| 📄 **PDF 导出** | 导出番剧信息为 PDF | 无需 |

## 🚀 快速开始

### 基础查询（无需认证）

```bash
# 搜索作品
bangumi search 葬送的芙莉莲

# 查看详情
bangumi subject 400602
bangumi subject 548818 --detail    # 详细模式（声优 + 角色 + 关联作品）

# 查看新番表
bangumi calendar
bangumi today 15                   # 今日更新（显示 15 部）
bangumi seasonal 20 --min 7.5      # 本季热门（评分≥7.5）

# 获取评分
bangumi rating 311

# 查看吐槽箱（用户评论）
bangumi comments 548818 -l 10

# 查看标签
bangumi tags 311
bangumi tags 311 --all             # 显示全部标签

# 推荐相似作品
bangumi recommend 400602
bangumi recommend 葬送的芙莉莲 15 --sort score

# 分类查询
bangumi cat -t 2 -c TV -y 2026     # 2026 年 TV 动画
bangumi cat -r 日本 -a 少年向       # 日本少年向作品

# 标签搜索
bangumi ts 科幻 战斗               # 包含"科幻"且"战斗"
bangumi ts 百合 校园 -l 30

# 角色搜索
bangumi char 189814                # 通过角色 ID 查询
bangumi char-search 酒寄彩葉        # 搜索角色
bangumi csearch 初音未来           # 简写

# 用户相关
bangumi user your_username
bangumi collections your_username anime 20
```

### 个人管理（需要 Access Token）

```bash
# Token 管理
bangumi token status
bangumi token set YOUR_ACCESS_TOKEN
bangumi token clear

# 查看我的信息
bangumi myinfo

# 查看我的收藏
bangumi mycollections
bangumi mycollections anime 15 -s hot    # 动画类，按热度排序

# 我追更的番剧今日更新
bangumi mytoday
bangumi mytoday 10

# 标记观看状态
bangumi setstatus 512361 wish            # 想看
bangumi setstatus 512361 do              # 在看
bangumi setstatus 512361 collect         # 看过
bangumi setstatus 400602 collect -r 9    # 看过并评分 9 分

# 标记剧集进度
bangumi seteps 548818 --eps 1,2,3        # 批量标记
bangumi seteps 548818 --all              # 全部看完
```

### PDF 导出

```bash
# 生成 PDF（仅当用户明确要求时）
bangumi generate-pdf 400602
bangumi genpdf 400602 芙莉莲.pdf
```

## 📖 完整命令参考

### 基础查询命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `search <关键词>` | 搜索作品 | 关键词 |
| `subject <ID> [选项]` | 条目详情 | ID、`--detail`、`--persons`、`--characters` 等 |
| `calendar` | 新番放送表 | - |
| `today [数量]` | 今日更新 | 显示数量 |
| `seasonal [数量] [--min 评分]` | 本季热门 | 数量、最低评分 |
| `episodes <ID> [--status]` | 剧集列表 | ID、`--status` 显示观看状态 |
| `rating <ID>` | 评分详情 | ID |
| `comments <ID> [-l 数量]` | 吐槽箱 | ID、数量 |
| `tags <ID> [--all]` | 作品标签 | ID、`--all` 显示全部 |
| `recommend <ID/名称> [数量] [--sort]` | 相似推荐 | ID 或名称、数量、排序 |
| `cat [选项]` | 分类查询 | 见下方选项 |
| `ts <标签> [选项]` | 标签搜索 | 标签、选项 |
| `char <ID> [选项]` | 角色详情 | ID、`--subjects`、`--persons` |
| `char-search <名称> [选项]` | 搜索角色 | 名称、`--nsfw` |
| `csearch <名称>` | char-search 简写 | 名称 |

### 用户相关命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `user <用户名>` | 用户信息 | 用户名 |
| `collections <用户名> [类型] [数量]` | 用户收藏 | 用户名、类型、数量 |

### 个人管理命令（需要 Token）

| 命令 | 说明 | 参数 |
|------|------|------|
| `myinfo` | 我的信息 | - |
| `mycollections [类型] [数量] [--sort] [--page]` | 我的收藏 | 类型、数量、排序、页码 |
| `mytoday [数量]` | 我追更的今日更新 | 数量 |
| `setstatus <ID> <状态> [-r 评分]` | 标记状态 | ID、状态、评分 |
| `seteps <ID> [选项]` | 标记剧集 | ID、剧集 ID 或 `--eps`、`--all` |

### Token 管理命令

| 命令 | 说明 |
|------|------|
| `token status` | 查看 Token 状态 |
| `token set <token>` | 设置 Token |
| `token clear` | 清除 Token |

### PDF 命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `generate-pdf <ID> [文件]` | 生成 PDF | ID、文件名 |
| `genpdf <ID>` | generate-pdf 简写 | ID |

## ⚙️ 选项参考

### 分类查询选项（cat）

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

### 角色搜索选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--subjects` | `-s` | 显示出演作品 |
| `--persons` | `-p` | 显示配音演员 |
| `--nsfw` | - | 是否包含 R18（char-search） |

### 推荐相似作品选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sort` | `-s` | 排序方式 | hot（hot/score/time/match） |
| `--limit` | `-l` | 推荐数量 | 10 |

### 我的收藏选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sort` | `-s` | 排序方式 | time（time/hot/score） |
| `--limit` | `-l` | 每页数量 | 20 |
| `--page` | `-p` | 页码 | 1 |

## 🔐 Access Token 配置

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

## 📁 目录结构

```
bangumi/
├── scripts/
│   └── bangumi.js          # Bangumi CLI 工具
├── cache/                  # 缓存目录
├── references/             # 参考资料
├── templates/              # PDF 模板
├── .gitignore
├── package.json
├── README.md
└── SKILL.md               # OpenClaw 技能定义
```

## ⚡ 性能优化

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
| 收藏状态 | 2 分钟 |

## 🛠️ 依赖

- **Node.js** >= 14.0.0
- **无外部依赖**（使用原生 https 模块）

## 📋 状态映射

| 状态 | 命令 |
|------|------|
| 想看 | `wish` |
| 看过 | `collect` / `done` |
| 在看 | `do` / `doing` |
| 搁置 | `on_hold` |
| 抛弃 | `dropped` |

## ⚠️ 注意事项

| 限制 | 说明 |
|------|------|
| 删除收藏 | 暂不支持（Bangumi API 限制） |
| 直接设置进度 | 不支持（只能通过标记剧集更新） |
| 吐槽箱 | 通过网页抓取获取，非 API |
| 图片链接 | 直接指向 Bangumi CDN |

## 🔗 相关链接

| 名称 | 链接 |
|------|------|
| API 文档 | https://bangumi.github.io/api/ |
| 获取 Token | https://next.bgm.tv/demo/access-token |
| Bangumi 主页 | https://bgm.tv/ |
| GitHub 仓库 | https://github.com/1730933627/bangumi-skill |

## 📄 许可证

MIT License

## 🙏 致谢

- [Bangumi API](https://bangumi.github.io/api/)
- [OpenClaw](https://github.com/openclaw/openclaw)
