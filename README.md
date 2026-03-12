# Bangumi 技能

OpenClaw 的 Bangumi（番组计划）技能，提供动画、漫画、游戏信息查询和邮件推荐功能。

## 功能特性

- 🔍 **番剧查询** - 搜索和查看 Bangumi 条目详情
- 📊 **评分统计** - 查看评分、排名、收藏统计
- 🎙️ **声优信息** - 查看主要声优和制作人员
- 🏷️ **标签系统** - 查看作品标签
- 📧 **邮件推荐** - 发送精美的番剧推荐邮件

## 目录结构

```
bangumi/
├── scripts/
│   ├── bangumi.js          # Bangumi CLI 工具
│   └── send_mail.py        # 邮件发送脚本
├── templates/
│   └── Anime_Details.html  # 邮件 HTML 模板
├── .gitignore
└── README.md
```

## 使用方法

### 查询番剧信息

```bash
# 通过条目 ID 查询
node bangumi.js info 493016

# 搜索番剧
node bangumi.js search "异国日记"

# 查看新番表
node bangumi.js calendar

# 查看本季热门
node bangumi.js seasonal
```

### 发送邮件

```bash
# 发送推荐邮件
python3 send_mail.py 493016

# 自定义邮件主题
python3 send_mail.py 493016 "本季最佳：异国日记"
```

### 更多命令

```bash
# 查看帮助
node bangumi.js --help

# 查看特定命令帮助
node bangumi.js search --help
```

## 配置

### Bangumi API Token（可选）

创建配置文件 `~/.openclaw/workspace/.config/bangumi/config.json`：

```json
{
  "accessToken": "your_access_token_here"
}
```

获取 Token：https://next.bgm.tv/demo/access-token

### 邮件配置

创建配置文件 `~/.openclaw/workspace/.config/email/config.json`：

```json
{
  "smtp": {
    "server": "smtp.163.com",
    "port": 465,
    "use_ssl": true
  },
  "sender": {
    "email": "your_email@163.com",
    "password": "your_password_or_auth_code",
    "name": "智慧之王 Raphael"
  },
  "recipient": {
    "email": "recipient@qq.com",
    "name": "主人"
  },
  "image": {
    "referer": "https://bangumi.tv/",
    "user_agent": "Mozilla/5.0",
    "timeout": 10
  },
  "defaults": {
    "subject_prefix": "📺",
    "sender_signature": "OpenClaw 智慧之王 💙 Raphael"
  }
}
```

## 依赖

- **Node.js** >= 14.0.0
- **Python** >= 3.8

## 示例

### 查询 2025 年热门番剧

```bash
node bangumi.js rank --year 2025 --sort rank -l 5
```

### 发送 2025 年最热门番剧邮件

```bash
# 先查询 ID
node bangumi.js rank --year 2025 --sort rank -l 1

# 发送邮件（假设 ID 是 470660）
python3 send_mail.py 470660 "🏆 2025 年最热门番剧 TOP1"
```

## 开发

### 添加新功能

1. 在 `bangumi.js` 中添加新的 case 分支
2. 实现对应的 async 函数
3. 在 help 中添加说明

### 修改邮件模板

编辑 `templates/Anime_Details.html`，使用 Python 的 `str.format()` 语法：

```html
<div class="rating-score">{rating_score}</div>
```

## 许可证

MIT License

## 致谢

- [Bangumi API](https://bangumi.github.io/api/)
- [OpenClaw](https://github.com/openclaw/openclaw)
