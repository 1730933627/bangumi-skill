/**
 * Bangumi API 客户端
 * 查询动画、漫画、游戏信息
 * 
 * API 文档：https://bangumi.github.io/api/
 * Access Token: https://next.bgm.tv/demo/access-token
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// HTTP 连接池复用（提升速度）
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

const BASE_URL = 'https://api.bgm.tv';

// 配置文件路径 - 默认保存到工作区 config/bangumi/config.json
const WORKSPACE_DIR = path.join(os.homedir(), '.openclaw', 'workspace');
const CONFIG_DIR = path.join(WORKSPACE_DIR, '.config', 'bangumi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');



// 日志输出（无颜色）
function log(prefix, message) {
  console.log(`${prefix} ${message}`);
}

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config;
    }
  } catch (e) {
    // 忽略错误
  }
  return {};
}

// 保存配置
function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    log('[OK]', '配置已保存');
    log('[INFO]', `配置路径：${CONFIG_FILE}`);
  } catch (e) {
    log('[ERROR]', `保存配置失败：${e.message}`);
  }
}

// API 请求封装（优化版：连接复用 + 超时控制）
function apiRequest(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    let url = `${BASE_URL}${apiPath}`;
    const config = loadConfig();
    
    const headers = {
      'User-Agent': 'OpenClaw-Bangumi-Skill/1.0',
      ...options.headers,
    };
    
    // 添加 Access Token
    if (config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }
    
    const reqOptions = {
      method: options.method || 'GET',
      headers,
      agent,  // 使用连接池
      timeout: 10000,  // 10 秒超时
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // 204 No Content 无需解析
        if (res.statusCode === 204) {
          resolve({});
          return;
        }
        
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`API 错误 (${res.statusCode}): ${data}`));
          } else {
            resolve(data ? JSON.parse(data) : {});
          }
        } catch (e) {
          reject(new Error(`JSON 解析失败：${e.message}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`API 请求失败：${e.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API 请求超时 (10 秒)'));
    });
    
    if (options.body) {
      const bodyData = JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      req.write(bodyData);
    }
    
    req.end();
  });
}

// 设置 Access Token
async function setToken(token) {
  const config = loadConfig();
  config.accessToken = token;
  saveConfig(config);
  
  // 测试 Token
  try {
    const user = await apiRequest('/v0/me');
    log('[OK]', 'Token 设置成功！');
    log('[INFO]', `当前用户：${user.username} (${user.nickname})`);
  } catch (e) {
    log('[WARN]', `Token 已保存，但验证失败：${e.message}`);
    log('[WARN]', '请检查 Token 是否有效');
  }
}

// 清除 Token
function clearToken() {
  const config = loadConfig();
  delete config.accessToken;
  saveConfig(config);
  log('[OK]', 'Token 已清除');
}

// 查看 Token 状态
function tokenStatus() {
  const config = loadConfig();
  if (config.accessToken) {
    const masked = config.accessToken.substring(0, 8) + '...' + config.accessToken.substring(config.accessToken.length - 8);
    log('[OK]', '已配置 Access Token');
    console.log(`Token: ${masked}`);
    console.log(`配置路径：${CONFIG_FILE}`);
  } else {
    log('[INFO]', '未配置 Access Token');
    console.log('\n获取 Token: https://next.bgm.tv/demo/access-token');
    console.log(`设置命令：bangumi token set <your_token>`);
  }
}

// 搜索条目（带缓存）
async function search(query, type = 2) {
  const now = Date.now();
  const cacheKey = `search_${type}_${query}`;
  const cache = _subjectCache.get(cacheKey);
  
  if (cache && (now - cache.time) < SUBJECT_CACHE_MS) {
    const result = cache.data;
    // 使用缓存
  } else {
    const encodedQuery = encodeURIComponent(query);
    const result = await apiRequest(`/search/subject/${encodedQuery}?type=${type}`);
    _subjectCache.set(cacheKey, { data: result, time: now });
  }
  
  const result = cache?.data || await apiRequest(`/search/subject/${encodeURIComponent(query)}?type=${type}`);
  if (!cache) _subjectCache.set(cacheKey, { data: result, time: Date.now() });
  
  if (!result.list || result.list.length === 0) {
    log('[WARN]', `未找到相关结果：${query}`);
    return null;
  }
  
  log('[OK]', `找到 ${result.results} 条结果：`);
  console.log('');
  
  result.list.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const type = item.type_name || '未知';
    
    log('[INFO]', `${index + 1}. ${name}`);
    console.log(`   ID: ${item.id} | 评分：${score} | 类型：${type}`);
    console.log(`   链接：${item.url}`);
    console.log('');
  });
  
  return result;
}

// 获取条目详情（带缓存，支持扩展查询）
async function getSubject(id, opts = {}) {
  const { persons = false, characters = false, subjects = false, image = false, collections = false, comments = false } = opts;
  const now = Date.now();
  
  // 检查缓存（带选项的缓存 key）
  const cacheKey = `subject_${id}_${persons}_${characters}_${subjects}_${image}`;
  const cache = _subjectCache.get(cacheKey);
  let subject;
  
  if (cache && (now - cache.time) < SUBJECT_CACHE_MS) {
    subject = cache.data;
  } else {
    subject = await apiRequest(`/v0/subjects/${id}`);
    _subjectCache.set(cacheKey, { data: subject, time: now });
  }
  
  log('[INFO]', `=== ${subject.name_cn || subject.name} ===`);
  console.log('');
  
  // 基本信息
  console.log(`🆔 ID: ${subject.id}`);
  console.log(`📺 类型：${subject.type_name || '动画'}`);
  console.log(`📅 放送时间：${subject.date || '未知'}`);
  console.log(`📺 话数：${subject.eps || subject.total_episodes || '未知'}`);
  if (subject.platform) console.log(`🏷️ 放送平台：${subject.platform}`);
  if (subject.summary) {
    const summary = subject.summary.length > 300 
      ? subject.summary.substring(0, 300) + '...' 
      : subject.summary;
    console.log(`📝 简介：${summary.replace(/\n/g, ' ')}`);
  }
  console.log('');
  
  // 评分详情
  if (subject.rating) {
    console.log(`⭐ 评分：${subject.rating.score}/10 (第${subject.rating.rank}名)`);
    console.log(`👥 评价人数：${subject.rating.total?.toLocaleString() || '未知'}`);
    
    // 评分分布（如果有）
    if (subject.rating.count) {
      const counts = subject.rating.count;
      const highScore = (parseInt(counts['8']||0) + parseInt(counts['9']||0) + parseInt(counts['10']||0));
      const lowScore = (parseInt(counts['1']||0) + parseInt(counts['2']||0) + parseInt(counts['3']||0));
      const total = subject.rating.total || 1;
      console.log(`👍 好评率：${Math.round((highScore / total) * 100)}% (8-10 分)`);
      console.log(`👎 差评率：${Math.round((lowScore / total) * 100)}% (1-3 分)`);
    }
    console.log('');
  }
  
  // 标签（显示更多）
  if (subject.tags && subject.tags.length > 0) {
    const allTags = subject.tags.map(t => t.name).join(', ');
    console.log(`🏷️ 标签 (${subject.tags.length}个):`);
    console.log(`   ${allTags}`);
    console.log('');
  }
  
  // 图片
  if (subject.images || image) {
    log('[INFO]', '🖼️ 封面图:');
    if (subject.images) {
      console.log(`   大图：${subject.images.large}`);
      console.log(`   中图：${subject.images.medium}`);
      console.log(`   小图：${subject.images.small}`);
    }
    if (image) {
      try {
        const imgResult = await apiRequest(`/v0/subjects/${id}/image`);
        if (imgResult?.large) console.log(`   原图：${imgResult.large}`);
      } catch (e) {
        // 忽略错误
      }
    }
    console.log('');
  }
  
  // 扩展查询（并发请求）
  const extendedQueries = [];
  
  if (persons) {
    extendedQueries.push(
      apiRequest(`/v0/subjects/${id}/persons`)
        .then(data => ({ type: 'persons', data }))
        .catch(e => ({ type: 'persons', error: e.message }))
    );
  }
  
  if (characters) {
    extendedQueries.push(
      apiRequest(`/v0/subjects/${id}/characters`)
        .then(data => ({ type: 'characters', data }))
        .catch(e => ({ type: 'characters', error: e.message }))
    );
  }
  
  if (subjects) {
    extendedQueries.push(
      apiRequest(`/v0/subjects/${id}/subjects`)
        .then(data => ({ type: 'subjects', data }))
        .catch(e => ({ type: 'subjects', error: e.message }))
    );
  }
  
  // 收藏统计（从作品详情直接获取，无需额外请求）
  if (collections && subject.collection) {
    const col = subject.collection;
    const wishCount = col.wish || 0;
    const doneCount = col.collect || 0;
    const doingCount = col.doing || 0;
    const onHoldCount = col.on_hold || 0;
    const droppedCount = col.dropped || 0;
    const total = wishCount + doneCount + doingCount + onHoldCount + droppedCount;
    
    console.log('');
    console.log(`📊 收藏统计 (${total.toLocaleString()}人):`);
    console.log(`  ❤️ 想看：${wishCount.toLocaleString()}人`);
    console.log(`  ✅ 看过：${doneCount.toLocaleString()}人`);
    console.log(`  📺 在看：${doingCount.toLocaleString()}人`);
    console.log(`  ⏸️ 搁置：${onHoldCount.toLocaleString()}人`);
    console.log(`  ❌ 抛弃：${droppedCount.toLocaleString()}人`);
    console.log('');
  }
  
  // 并发执行扩展查询
  if (extendedQueries.length > 0) {
    console.log('');
    log('[INFO]', '=== 扩展信息 ===');
    console.log('');
    
    const results = await Promise.all(extendedQueries);
    
    results.forEach(result => {
      if (result.type === 'persons' && result.data) {
        const persons = result.data;
        if (persons.length > 0) {
          console.log(`🎙️ 声优/制作人员 (${persons.length}人):`);
          persons.slice(0, 20).forEach(p => {
            const name = p.name_cn || p.name || '?';
            const relation = p.relation || '?';
            console.log(`  • ${name} - ${relation}`);
          });
          if (persons.length > 20) console.log(`  ... 还有 ${persons.length - 20} 人`);
          console.log('');
        }
      }
      
      if (result.type === 'characters' && result.data) {
        const chars = result.data;
        if (chars.length > 0) {
          console.log(`🎭 角色列表 (${chars.length}人):`);
          chars.slice(0, 20).forEach(c => {
            const name = c.name_cn || c.name || '?';
            const relation = c.relation || '?';
            const actors = c.actors?.map(a => a.name_cn || a.name).join(', ') || '未知';
            console.log(`  • ${name} - ${relation} (CV: ${actors})`);
          });
          if (chars.length > 20) console.log(`  ... 还有 ${chars.length - 20} 人`);
          console.log('');
        }
      }
      
      if (result.type === 'subjects' && result.data) {
        const related = result.data;
        if (related.length > 0) {
          console.log(`🔗 关联作品 (${related.length}部):`);
          related.slice(0, 10).forEach(s => {
            const name = s.name_cn || s.name || '?';
            const relation = s.relation || '?';
            const type = s.type_name || '未知';
            console.log(`  • ${name} - ${type} (${relation})`);
          });
          if (related.length > 10) console.log(`  ... 还有 ${related.length - 10} 部`);
          console.log('');
        }
      }
      
      if (result.type === 'collections' && result.data) {
        const cols = result.data;
        // 统计各状态人数
        const wishCount = cols.filter(c => c.type === 1).length;
        const doneCount = cols.filter(c => c.type === 2).length;
        const doingCount = cols.filter(c => c.type === 3).length;
        const onHoldCount = cols.filter(c => c.type === 4).length;
        const droppedCount = cols.filter(c => c.type === 5).length;
        const total = wishCount + doneCount + doingCount + onHoldCount + droppedCount;
        
        console.log(`📊 收藏统计 (${total}人):`);
        console.log(`  ❤️ 想看：${wishCount.toLocaleString()}人`);
        console.log(`  ✅ 看过：${doneCount.toLocaleString()}人`);
        console.log(`  📺 在看：${doingCount.toLocaleString()}人`);
        console.log(`  ⏸️ 搁置：${onHoldCount.toLocaleString()}人`);
        console.log(`  ❌ 抛弃：${droppedCount.toLocaleString()}人`);
        console.log('');
      }
    });
  }
  
  // 吐槽箱（用户评论）（网页抓取，独立函数）- 放在最底部
  if (comments) {
    console.log('');
    await getComments(id, 5);  // 默认显示 5 条评论
  }
  
  return subject;
}

// 获取条目的完整标签列表（优化版）
async function getTags(id, showAll = true, limit = 30) {
  const now = Date.now();
  const cacheKey = `tags_${id}_${showAll}`;
  const cache = _tagsCache.get(cacheKey);
  
  // 检查缓存
  if (cache && (now - cache.time) < TAGS_CACHE_MS) {
    console.log(cache.output);
    return cache.tags;
  }
  
  const subject = await apiRequest(`/v0/subjects/${id}`);
  
  if (!subject.tags || subject.tags.length === 0) {
    log('[WARN]', '该作品没有标签');
    return null;
  }
  
  const name = subject.name_cn || subject.name;
  const lines = [];
  lines.push(`\n=== ${name} - 完整标签列表（共${subject.tags.length}个）===`);
  lines.push('');
  
  // 分组显示标签
  const hotTags = subject.tags.filter(t => t.count >= 1000);
  const commonTags = subject.tags.filter(t => t.count >= 100 && t.count < 1000);
  const otherTags = subject.tags.filter(t => t.count < 100);
  
  if (hotTags.length > 0) {
    lines.push(`🔥 热门标签（使用次数 ≥ 1000）：`);
    hotTags.slice(0, limit).forEach((tag, i) => {
      lines.push(`  ${i+1}. ${tag.name} (${tag.count.toLocaleString()}次)`);
    });
    lines.push('');
  }
  
  if (commonTags.length > 0) {
    lines.push(`📌 常用标签（100-999 次）：`);
    commonTags.slice(0, limit).forEach((tag, i) => {
      lines.push(`  ${i+1}. ${tag.name} (${tag.count}次)`);
    });
    lines.push('');
  }
  
  if (otherTags.length > 0 && showAll) {
    lines.push(`🏷️ 其他标签（< 100 次）：`);
    otherTags.slice(0, limit).forEach((tag, i) => {
      lines.push(`  ${i+1}. ${tag.name} (${tag.count}次)`);
    });
    lines.push('');
  }
  
  if (subject.meta_tags && subject.meta_tags.length > 0) {
    lines.push(`元标签（官方分类）：${subject.meta_tags.join(', ')}`);
    lines.push('');
  }
  
  if (!showAll && (commonTags.length > 0 || otherTags.length > 0)) {
    lines.push(`💡 提示：使用 "bangumi tags ${id} --all" 显示全部${subject.tags.length}个标签`);
  }
  
  const output = lines.join('\n');
  console.log(output);
  
  // 缓存结果
  _tagsCache.set(cacheKey, { output, tags: subject.tags, time: now });
  
  return subject.tags;
}

// ============================================================================
// 标签搜索 - 根据标签筛选动漫（使用 POST /v0/search/subjects）
// 支持多标签筛选（且关系）、类型筛选、排序、分页
// ============================================================================
async function searchByTags(tags, opts = {}) {
  const {
    type = 2,           // SubjectType: 1=书籍，2=动画，3=音乐，4=游戏，6=三次元
    sort = 'rank',      // 排序：rank=排名，hot=热度，collect=收藏，date=日期，name=名称
    limit = 50,         // 每页数量
    offset = 0,         // 分页偏移
  } = opts;
  
  if (!tags || tags.length === 0) {
    log('[ERROR]', '错误：请提供至少一个标签');
    return null;
  }
  
  log('[INFO]', `正在搜索标签：${tags.join(', ')} ...`);
  
  // 构建 POST 请求体
  const requestBody = {
    keyword: '',  // 空关键词，只使用标签筛选
    sort: sort,
    filter: {
      type: [type],
      tag: tags,  // 标签筛选（且关系，必须包含所有标签）
    },
  };
  
  // 使用 POST 请求
  const result = await apiRequest('/v0/search/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
  });
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '未找到符合条件的作品');
    return null;
  }
  
  const total = result.total || result.data.length;
  
  log('[INFO]', `\n=== 标签搜索：${tags.join(' + ')}（共${total}部，显示前${result.data.length}部）===`);
  console.log('');
  
  result.data.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const rank = item.rating?.rank || 'N/A';
    const typeLabel = item.type_name || '未知';
    const date = item.date || '未知';
    const itemTags = item.tags?.slice(0, 5).map(t => t.name).join(', ') || '无标签';
    
    console.log(`${offset + index + 1}. ${name}`);
    console.log(`   评分：${score} | 排名：${rank} | 类型：${typeLabel} | 放送：${date}`);
    console.log(`   标签：${itemTags}`);
  });
  
  if (result.data.length < total) {
    log('[INFO]', `\n💡 提示：共${total}部作品，当前显示${result.data.length}部`);
    log('[INFO]', `📄 下一页：bangumi ts ${tags.join(' ')} -l ${limit} -p ${Math.floor(offset / limit) + 2}`);
  }
  
  return { list: result.data, total };
}



// ============================================================================
// 缓存系统（优化版）
// ============================================================================
let _calendarCache = null;
let _calendarCacheTime = 0;
const CALENDAR_CACHE_MS = 10 * 60 * 1000; // 10 分钟缓存

// 标签缓存（不同作品 ID）
const _tagsCache = new Map();
const TAGS_CACHE_MS = 30 * 60 * 1000; // 30 分钟缓存

// 作品详情缓存
const _subjectCache = new Map();
const SUBJECT_CACHE_MS = 30 * 60 * 1000; // 30 分钟缓存

// 剧集列表缓存
const _episodesCache = new Map();
const EPISODES_CACHE_MS = 30 * 60 * 1000; // 30 分钟缓存

// 收藏状态缓存
const _collectionCache = new Map();
const COLLECTION_CACHE_MS = 2 * 60 * 1000; // 2 分钟缓存（变化频繁）

async function getCalendarData() {
  const now = Date.now();
  if (_calendarCache && (now - _calendarCacheTime) < CALENDAR_CACHE_MS) {
    return _calendarCache;
  }
  _calendarCache = await apiRequest('/calendar');
  _calendarCacheTime = now;
  return _calendarCache;
}

async function getCalendar() {
  const calendar = await getCalendarData();
  
  log('[INFO]', '=== 新番放送表 ===');
  console.log('');
  
  const weekdayMap = {
    Mon: '周一',
    Tue: '周二',
    Wed: '周三',
    Thu: '周四',
    Fri: '周五',
    Sat: '周六',
    Sun: '周日',
  };
  
  calendar.forEach((day) => {
    if (day.items && day.items.length > 0) {
      log('[INFO]', `\n${weekdayMap[day.weekday.en]} (${day.weekday.ja}):`);
      console.log('─'.repeat(50));
      
      day.items.slice(0, 10).forEach((item) => {
        const name = item.name_cn || item.name;
        const score = item.rating?.score || 'N/A';
        const time = item.air_date || '未知';
        
        console.log(`  • ${name}`);
        console.log(`    播出：${time} | 评分：${score}`);
      });
      
      if (day.items.length > 10) {
        log('[WARN]', `  ... 还有 ${day.items.length - 10} 部`);
      }
    }
  });
  
  return calendar;
}

// 获取本季热门番剧（按评分排序）
async function getSeasonalHot(limit = 15, minScore = 7.0) {
  const calendar = await getCalendarData();
  
  // 收集所有番剧
  const allShows = [];
  calendar.forEach((day) => {
    if (day.items) {
      allShows.push(...day.items);
    }
  });
  
  // 过滤：只显示 2026 年 1 月后的新番（本季），且有评分
  const currentSeason = allShows.filter(item => {
    const date = item.air_date;
    if (!date) return false;
    const score = item.rating?.score;
    if (!score || score < minScore) return false;
    // 2026 年 1 月及之后
    return date >= '2026-01-01';
  });
  
  // 按评分排序
  const hotShows = currentSeason
    .sort((a, b) => (b.rating?.score || 0) - (a.rating?.score || 0))
    .slice(0, limit);
  
  log('[INFO]', `=== 本季热门番剧 TOP ${hotShows.length} ===`);
  console.log('');
  log('[INFO]', `筛选条件：评分 ≥ ${minScore} | 2026 年 1 月新番`);
  console.log('');
  
  hotShows.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const rank = item.rating?.rank || 'N/A';
    const date = item.air_date || '未知';
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()];
    
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    
    log('[INFO]', `${medal} TOP ${index + 1}. ${name}`);
    console.log(`    评分：${score} (排名：${rank}) | 放送：${date} (${weekday})`);
  });
  
  console.log('');
  log('[INFO]', `共筛选 ${currentSeason.length} 部，显示前 ${hotShows.length} 部`);
  
  return hotShows;
}

// 获取今日更新的番剧（使用缓存）
async function getTodayCalendar(limit = 20) {
  const calendar = await getCalendarData();
  
  // 获取今天是周几（UTC）
  const now = new Date();
  const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getUTCDay()];
  const weekdayCn = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getUTCDay()];
  const dateStr = now.toISOString().split('T')[0];
  
  // 找到今天的数据
  const todayData = calendar.find(day => day.weekday.en === weekdayEn);
  
  if (!todayData || !todayData.items || todayData.items.length === 0) {
    log('[INFO]', `今日（${weekdayCn}）没有更新的番剧`);
    return null;
  }
  
  log('[INFO]', `=== 今日更新番剧（${dateStr} ${weekdayCn}）===`);
  console.log('');
  log('[INFO]', `共 ${todayData.items.length} 部番剧更新：`);
  console.log('');
  
  todayData.items.slice(0, limit).forEach((item) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const time = item.air_date || '未知';
    
    console.log(`  • ${name}`);
    console.log(`    播出：${time} | 评分：${score}`);
  });
  
  if (todayData.items.length > limit) {
    log('[WARN]', `  ... 还有 ${todayData.items.length - limit} 部`);
  }
  
  return todayData.items;
}

// 获取我追更的番剧中今日更新的部分（需要 Token，使用缓存优化）
async function getMyTodayUpdates(limit = 20) {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    console.log('请先设置 Token: bangumi token set <your_token>');
    return null;
  }
  
  // 获取今天是周几
  const now = new Date();
  const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getUTCDay()];
  const weekdayCn = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getUTCDay()];
  const dateStr = now.toISOString().split('T')[0];
  
  // 并行请求：用户信息 + 收藏列表，日历使用缓存
  const [me, collections, calendar] = await Promise.all([
    apiRequest('/v0/me').catch(e => null),
    apiRequest('/v0/me/collections?subject_type=2&limit=100').catch(e => null),
    getCalendarData().catch(e => null),
  ]);
  
  if (!me) {
    log('[ERROR]', '获取用户信息失败');
    return null;
  }
  
  const username = me.username;
  
  // 如果 /v0/me/collections 失败，尝试用用户名 API
  let colsData = collections?.data;
  if (!colsData || colsData.length === 0) {
    try {
      const userCols = await apiRequest(`/v0/users/${username}/collections?subject_type=2&limit=100`);
      colsData = userCols?.data;
    } catch (e) {
      // 忽略
    }
  }
  
  if (!colsData || colsData.length === 0) {
    log('[INFO]', '没有正在追的番剧');
    return null;
  }
  
  const todayData = calendar?.find(day => day.weekday.en === weekdayEn);
  
  if (!todayData || !todayData.items || todayData.items.length === 0) {
    log('[INFO]', `今日（${weekdayCn}）没有番剧更新`);
    return null;
  }
  
  // 构建今日更新番剧的 ID 集合
  const todayIds = new Set(todayData.items.map(item => item.id));
  
  // 筛选出我追更且今日更新的番剧
  const myUpdates = colsData
    .filter(col => todayIds.has(col.subject.id))
    .map(col => col.subject);
  
  if (myUpdates.length === 0) {
    log('[INFO]', `今日（${weekdayCn}）没有你追更的番剧更新`);
    return null;
  }
  
  log('[INFO]', `=== 我追更的番剧今日更新（${dateStr} ${weekdayCn}）===`);
  console.log('');
  log('[INFO]', `共 ${myUpdates.length} 部番剧更新：`);
  console.log('');
  
  myUpdates.slice(0, limit).forEach((item) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const time = item.air_date || '未知';
    const eps = item.eps || item.total_episodes || '?';
    
    console.log(`  • ${name}`);
    console.log(`    播出：${time} | 评分：${score} | 话数：${eps}`);
  });
  
  if (myUpdates.length > limit) {
    log('[WARN]', `  ... 还有 ${myUpdates.length - limit} 部`);
  }
  
  return myUpdates;
}

// 获取剧集列表（带观看状态）（需要 Token，带缓存）
async function getEpisodes(subjectId, withStatus = false) {
  const config = loadConfig();
  const now = Date.now();
  
  // 检查剧集缓存
  const cacheKey = `episodes_${subjectId}`;
  const cache = _episodesCache.get(cacheKey);
  let result;
  
  if (cache && (now - cache.time) < EPISODES_CACHE_MS) {
    result = cache.data;
  } else {
    result = await apiRequest(`/v0/episodes?subject_id=${subjectId}`);
    _episodesCache.set(cacheKey, { data: result, time: now });
  }
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '未找到剧集信息');
    return null;
  }
  
  let collection = null;
  let epStatus = 0;
  
  // 如果有 Token，获取观看状态
  if (withStatus && config.accessToken) {
    try {
      const colCacheKey = `collection_${subjectId}`;
      const colCache = _collectionCache.get(colCacheKey);
      
      if (colCache && (now - colCache.time) < COLLECTION_CACHE_MS) {
        collection = colCache.data;
      } else {
        collection = await apiRequest(`/collection/${subjectId}`);
        _collectionCache.set(colCacheKey, { data: collection, time: now });
      }
      
      epStatus = collection.ep_status || 0;
    } catch (e) {
      // 忽略错误
    }
  }
  
  const totalEps = result.total;
  
  log('[INFO]', `\n=== 剧集列表 (共 ${totalEps} 集，已观看 ${epStatus} 集) ===`);
  console.log('');
  
  result.data.slice(0, 50).forEach((ep, index) => {
    const name = ep.name || ep.name_cn || `第${ep.sort}话`;
    const airDate = ep.airdate || '未知';
    const type = ep.type === 1 ? '正片' : ep.type === 2 ? 'SP' : ep.type === 3 ? 'OP' : ep.type === 4 ? 'ED' : '其他';
    const isWatched = index < epStatus;
    const status = isWatched ? '✅' : '⬜';
    
    console.log(`  ${status} ${ep.sort}. ${name} (${type})`);
    console.log(`     播出：${airDate} | ID: ${ep.id}`);
  });
  
  if (result.total > 50) {
    log('[WARN]', `\n... 还有 ${result.total - 50} 集`);
  }
  
  if (epStatus > 0) {
    console.log('');
    log('[INFO]', `进度：${epStatus} / ${totalEps} 集 (${Math.round((epStatus / totalEps) * 100)}%)`);
  }
  
  return result;
}

// 获取评分详情
async function getRating(id) {
  const subject = await apiRequest(`/v0/subjects/${id}`);
  
  if (!subject.rating) {
    log('[WARN]', '未找到评分信息');
    return null;
  }
  
  const rating = subject.rating;
  
  log('[INFO]', `\n=== 评分详情 ===`);
  console.log('');
  console.log(`总分：${rating.score}`);
  console.log(`排名：${rating.rank}`);
  console.log(`评价人数：${rating.total}`);
  console.log('');
  console.log('评分分布:');
  
  const stars = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];
  stars.forEach((star) => {
    const count = rating.count[star] || 0;
    const bar = '█'.repeat(Math.floor(count / 100));
    console.log(`  ${star}分：${bar} ${count}`);
  });
  
  return rating;
}

// 获取吐槽箱（用户评论）（网页抓取）
async function getComments(subjectId, limit = 10) {
  try {
    const html = await fetchWebPage(`https://bangumi.tv/subject/${subjectId}/comments`);
    
    // 提取评论项
    const itemRegex = /<div class="item clearit"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    const comments = [];
    let match;
    
    while ((match = itemRegex.exec(html)) !== null && comments.length < limit) {
      const itemHtml = match[1];
      
      // 提取用户名
      const userMatch = itemHtml.match(/data-item-user="([^"]+)"/);
      const userId = userMatch ? userMatch[1] : null;
      
      // 提取用户名（从链接）
      const nameMatch = itemHtml.match(/class="l">([^<]+)<\/a>/);
      const username = nameMatch ? nameMatch[1].trim() : (userId || '未知用户');
      
      // 提取评分
      const rateMatch = itemHtml.match(/class="stars[^"]*stars([0-9]+)"/);
      const rating = rateMatch ? parseInt(rateMatch[1]) : null;
      
      // 提取评论内容
      const contentMatch = itemHtml.match(/<p class="comment">([^<]+)<\/p>/);
      const content = contentMatch ? contentMatch[1].trim() : '';
      
      // 提取时间
      const timeMatch = itemHtml.match(/<small[^>]*>([^<]+)<\/small>/);
      const time = timeMatch ? timeMatch[1].trim() : '';
      
      if (username && content) {
        comments.push({ username, rating, content, time });
      }
    }
    
    if (comments.length === 0) {
      log('[WARN]', '未找到评论');
      return null;
    }
    
    log('[INFO]', `\n=== 吐槽箱 (共${comments.length}条) ===`);
    console.log('');
    
    comments.forEach((c, i) => {
      const stars = c.rating ? '⭐'.repeat(c.rating) : '';
      const status = c.time ? `🕐${c.time}` : '';
      console.log(`${i + 1}. ${c.username} ${status} ${stars}`);
      console.log(`   ${c.content.substring(0, 150)}${c.content.length > 150 ? '...' : ''}`);
      console.log('');
    });
    
    return comments;
  } catch (e) {
    log('[ERROR]', `获取评论失败：${e.message}`);
    return null;
  }
}

// 获取用户信息
async function getUserInfo(username) {
  const user = await apiRequest(`/v0/users/${username}`);
  
  log('[INFO]', `\n=== ${user.username} ===`);
  console.log('');
  console.log(`昵称：${user.nickname}`);
  console.log(`签名：${user.sign || '无'}`);
  console.log(`加入时间：${new Date(user.joinedAt * 1000).toLocaleDateString('zh-CN')}`);
  console.log(`用户组：${user.userGroup}`);
  console.log('');
  
  if (user.avatar) {
    console.log(`头像：${user.avatar.large}`);
  }
  
  return user;
}

// 获取用户收藏
async function getUserCollections(username, type = 'all', limit = 20) {
  const result = await apiRequest(`/v0/users/${username}/collections?subject_type=${type}&limit=${limit}`);
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '未找到收藏');
    return null;
  }
  
  log('[INFO]', `\n=== ${username} 的收藏 ===`);
  console.log('');
  
  result.data.forEach((item) => {
    const subject = item.subject;
    const name = subject.name_cn || subject.name;
    const rate = item.rate || '未评分';
    const type = item.type === 1 ? '想看' : item.type === 2 ? '看过' : item.type === 3 ? '在看' : '搁置';
    
    console.log(`  • ${name}`);
    console.log(`    状态：${type} | 评分：${rate}`);
  });
  
  return result;
}

// 获取我的收藏（需要 Token，支持排序和分页，优化版）
async function getMyCollections(type = 'all', limit = 20, sortBy = 'time', page = 1) {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    console.log('请先设置 Token: bangumi token set <your_token>');
    return null;
  }
  
  const subjectTypeMap = {
    'all': '',
    'anime': '2',
    'manga': '1',
    'music': '3',
    'game': '4',
    'book': '1',
  };
  const st = subjectTypeMap[type] || '';
  
  let username;
  try {
    const me = await apiRequest('/v0/me');
    username = me.username;
  } catch (e) {
    log('[ERROR]', '获取用户信息失败：' + e.message);
    return null;
  }
  
  const offset = (page - 1) * limit;
  
  // 先获取精确总数
  const countQuery = st ? `?subject_type=${st}&limit=1` : '?limit=1';
  const countResult = await apiRequest(`/v0/users/${username}/collections${countQuery}`);
  const total = countResult.total || 0;
  
  if (total === 0) {
    log('[WARN]', '未找到收藏');
    return null;
  }
  
  // 计算总页数
  const totalPages = Math.ceil(total / limit);
  
  // 验证页码
  if (page > totalPages) {
    log('[WARN]', `页码超出范围，共${totalPages}页`);
    return null;
  }
  
  // 获取当前页数据
  const query = st ? `?subject_type=${st}&limit=${limit}&offset=${offset}` : `?limit=${limit}&offset=${offset}`;
  const result = await apiRequest(`/v0/users/${username}/collections${query}`);
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '该页没有数据');
    return null;
  }
  
  const displayData = result.data;
  const hasMore = page < totalPages;
  
  const sortOptions = {
    'time': '更新时间',
    'hot': '热度（排名）',
    'score': '评分',
  };
  const sortMethod = sortOptions[sortBy] ? sortBy : 'time';
  
  // 排序处理
  let sortedData = [...displayData];
  if (sortMethod === 'time') {
    sortedData.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  } else if (sortMethod === 'hot') {
    sortedData.sort((a, b) => (a.subject.rating?.rank || 999999) - (b.subject.rating?.rank || 999999));
  } else if (sortMethod === 'score') {
    sortedData.sort((a, b) => (b.subject.rating?.score || 0) - (a.subject.rating?.score || 0));
  }
  
  // sortedData 已排序
  
  const typeNames = { all: '全部', anime: '动画', manga: '漫画', music: '音乐', game: '游戏', book: '书籍' };
  const typeName = typeNames[type] || '全部';
  
  
  log('[INFO]', `
=== 我的收藏 - ${typeName}（第${page}/${totalPages}页，共${total}部，按${sortOptions[sortMethod]}排序）===`);
  console.log('');
  
  displayData.forEach((item, index) => {
    const subject = item.subject;
    const name = subject.name_cn || subject.name;
    const rate = item.rate || '未评分';
    const score = subject.rating?.score || 'N/A';
    const typeLabel = item.type === 1 ? '想看' : item.type === 2 ? '看过' : item.type === 3 ? '在看' : '搁置';
    const updated = item.updated_at ? new Date(item.updated_at).toLocaleDateString('zh-CN') : '未知';
    
    console.log(`${index + 1}. ${name}`);
    console.log(`   状态：${typeLabel} | 个人评分：${rate} | 作品评分：${score}`);
    console.log(`   更新：${updated}`);
  });
  
  if (hasMore) {
    log('[INFO]', `
📄 下一页：bangumi mycol ${type} -l ${limit} -p ${page + 1}`);
  }
  log('[INFO]', `📊 页码：${page} / ${totalPages}  |  每页：${limit} 部  |  总数：${total}部`);
  
  return { ...result, data: displayData, total, page, totalPages };
}


// 分类查询 - 获取排行榜/分类筛选（使用 GET /v0/subjects）
async function getRanking(opts = {}) {
  const config = loadConfig();
  
  const {
    type = '2',           // 1=书籍，2=动画，3=音乐，4=游戏，5=三次元
    sort = 'rank',        // rank=排名，hot=热度，collect=收藏，date=日期，name=名称
    category = '',        // 分类：TV/WEB/OVA/剧场版等
    source = '',          // 来源：原创/漫画改/游戏改等
    region = '',          // 地区
    audience = '',        // 受众
    year = '',            // 年份
    letter = '',          // 拼音首字母
    limit = 20,           // 每页数量
    page = 1,             // 页码
  } = opts;
  
  const offset = (page - 1) * limit;
  
  // 构建查询参数
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('sort', sort);
  params.set('limit', limit);
  params.set('offset', offset);
  
  if (category) params.set('category', category);
  if (source) params.set('source', source);
  if (region) params.set('region', region);
  if (audience) params.set('audience', audience);
  if (year) params.set('year', year);
  if (letter) params.set('letter', letter.toUpperCase());
  
  const query = params.toString();
  const result = await apiRequest(`/v0/subjects?${query}`);
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '未找到符合条件的作品');
    return null;
  }
  
  // 标签筛选时 API 返回的 total 不准确，使用估算值
  const total = result.total || result.data.length;
  const totalPages = Math.ceil(total / limit);
  
  // 显示筛选条件
  const filterInfo = [];
  if (category) filterInfo.push(`分类:${category}`);
  if (source) filterInfo.push(`来源:${source}`);
  if (region) filterInfo.push(`地区:${region}`);
  if (year) filterInfo.push(`年份:${year}`);
  
  
  const sortNames = { rank: '排名', hot: '热度', collect: '收藏', date: '日期', name: '名称' };
  const typeNames = { '1': '书籍', '2': '动画', '3': '音乐', '4': '游戏', '5': '三次元' };
  
  log('[INFO]', `\n=== ${typeNames[type] || '全部'}分类查询（第${page}/${totalPages}页，共${total}部）===`);
  if (filterInfo.length > 0) {
    log('[INFO]', `筛选条件：${filterInfo.join(' | ')} | 排序：${sortNames[sort] || '排名'}`);
  }
  console.log('');
  
  result.data.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const rank = item.rating?.rank || 'N/A';
    const platform = item.platform || '未知';
    const date = item.date || '未知';
    
    console.log(`${index + 1}. ${name}`);
    console.log(`   评分：${score} | 排名：${rank} | 类型：${platform} | 放送：${date}`);
  });
  
  if (page < totalPages) {
    log('[INFO]', `\n📄 下一页：bangumi rank -t ${type} -p ${page + 1} -l ${limit}`);
  }
  log('[INFO]', `📊 页码：${page} / ${totalPages}  |  每页：${limit} 部  |  总数：${total}部`);
  
  return result;
}

// 获取收藏总数（快速）
async function getMyCollectionsTotal(type = 'all') {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    return null;
  }
  
  let username;
  try {
    const me = await apiRequest('/v0/me');
    username = me.username;
  } catch (e) {
    log('[ERROR]', '获取用户信息失败：' + e.message);
    return null;
  }
  
  const subjectTypeMap = {
    'all': '',
    'anime': '2',
    'manga': '1',
    'music': '3',
    'game': '4',
    'book': '1',
  };
  const st = subjectTypeMap[type] || '';
  const query = st ? `?subject_type=${st}&limit=1` : '?limit=1';
  
  const result = await apiRequest(`/v0/users/${username}/collections${query}`);
  
  const typeNames = { all: '全部', anime: '动画', manga: '漫画', music: '音乐', game: '游戏', book: '书籍' };
  const typeName = typeNames[type] || '全部';
  const total = result.total || result.data?.length || 0;
  
  log('[OK]', `收藏总数 - ${typeName}: ${total} 部`);
  return { type, total };
}



// 获取我的信息（需要 Token）
async function getMyInfo() {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    console.log('请先设置 Token: bangumi token set <your_token>');
    return null;
  }
  
  const user = await apiRequest('/v0/me');
  
  log('[INFO]', `\n=== 我的信息 ===`);
  console.log('');
  console.log(`用户名：${user.username}`);
  console.log(`昵称：${user.nickname}`);
  console.log(`签名：${user.sign || '无'}`);
  console.log(`加入时间：${new Date(user.joinedAt * 1000).toLocaleDateString('zh-CN')}`);
  console.log('');
  
  return user;
}

// 推荐相似作品（优化版：并行请求）
async function recommend(subjectId, limit = 10, sortBy = 'hot') {
  const now = Date.now();
  
  // 获取目标作品详情（使用缓存）
  const cacheKey = `subject_${subjectId}`;
  const cache = _subjectCache.get(cacheKey);
  let subject;
  
  if (cache && (now - cache.time) < SUBJECT_CACHE_MS) {
    subject = cache.data;
  } else {
    subject = await apiRequest(`/v0/subjects/${subjectId}`);
    _subjectCache.set(cacheKey, { data: subject, time: now });
  }
  
  if (!subject.tags || subject.tags.length === 0) {
    log('[WARN]', '该作品没有标签，无法推荐');
    return null;
  }
  
  const mainTags = subject.tags.slice(0, 5).map(t => t.name);
  const targetType = subject.type || 2;
  const targetScore = subject.rating?.score || 0;
  
  const sortOptions = { 'hot': '热度', 'score': '评分', 'time': '时间', 'match': '匹配度' };
  const sortMethod = sortOptions[sortBy] ? sortBy : 'hot';
  
  log('[INFO]', `\n=== 基于《${subject.name_cn || subject.name}》的推荐 ===`);
  console.log('');
  log('[INFO]', `参考标签：${mainTags.join(', ')}`);
  console.log(`参考评分：${targetScore}`);
  console.log(`排序方式：匹配度 → ${sortOptions[sortMethod]}`);
  console.log('');
  
  const allRecommendations = [];
  
  // 并行搜索多个标签
  const searchPromises = mainTags.slice(0, 3).map(async (tag) => {
    try {
      const encodedQuery = encodeURIComponent(tag);
      const searchResult = await apiRequest(`/search/subject/${encodedQuery}?type=${targetType}`);
      return searchResult.list || [];
    } catch (e) {
      return [];
    }
  });
  
  const searchResults = await Promise.all(searchPromises);
  const allItems = searchResults.flat();
  
  // 去重并过滤
  const uniqueItems = new Map();
  for (const item of allItems) {
    if (item.id === subjectId || uniqueItems.has(item.id)) continue;
    if (!item.rating?.score) continue;
    uniqueItems.set(item.id, item);
  }
  
  // 并行获取详细信息
  const detailPromises = Array.from(uniqueItems.values()).slice(0, limit * 2).map(async (item) => {
    try {
      let fullItem = item;
      if (!item.tags) {
        fullItem = await apiRequest(`/v0/subjects/${item.id}`);
      }
      return fullItem;
    } catch (e) {
      return null;
    }
  });
  
  const detailedItems = (await Promise.all(detailPromises)).filter(Boolean);
  
  // 计算匹配度
  for (const fullItem of detailedItems) {
    const itemTags = fullItem.tags?.map(t => t.name) || [];
    const commonTags = mainTags.filter(t => itemTags.includes(t)).length;
    const scoreDiff = Math.abs((fullItem.rating?.score || 0) - targetScore);
    const scoreMatch = scoreDiff <= 1.5 ? 1 : scoreDiff <= 3 ? 0.5 : 0;
    const matchScore = commonTags + scoreMatch;
    
    if (matchScore > 0) {
      allRecommendations.push({ ...fullItem, _matchScore: matchScore, _commonTags: commonTags });
    }
  }
  
  // 去重（按 ID）
  const uniqueMap = new Map();
  allRecommendations.forEach(item => {
    if (!uniqueMap.has(item.id) || uniqueMap.get(item.id)._matchScore < item._matchScore) {
      uniqueMap.set(item.id, item);
    }
  });
  
  // 排序：先按匹配度，再按指定条件（热度/评分/时间）
  const recommendations = Array.from(uniqueMap.values())
    .sort((a, b) => {
      // 第一优先级：匹配度
      if (b._matchScore !== a._matchScore) {
        return b._matchScore - a._matchScore;
      }
      // 第二优先级：按指定条件排序
      if (sortMethod === 'hot') {
        // 热度：排名越小越热门（数字小在前）
        const rankA = a.rating?.rank || 999999;
        const rankB = b.rating?.rank || 999999;
        return rankA - rankB;
      } else if (sortMethod === 'score') {
        // 评分：越高越好
        return (b.rating?.score || 0) - (a.rating?.score || 0);
      } else if (sortMethod === 'time') {
        // 时间：越新越好
        const dateA = a.date || a.air_date || '';
        const dateB = b.date || b.air_date || '';
        return dateB.localeCompare(dateA);
      }
      // 默认：仅匹配度，无第二排序
      return 0;
    })
    .slice(0, limit);
  
  if (recommendations.length === 0) {
    log('[WARN]', '未找到相似作品');
    return null;
  }
  
  log('[INFO]', `推荐 ${recommendations.length} 部相似作品：`);
  console.log('');
  
  recommendations.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const score = item.rating?.score || 'N/A';
    const rank = item.rating?.rank || 'N/A';
    const tags = item.tags?.slice(0, 4).map(t => t.name).join(', ') || '无标签';
    const matchPercent = Math.round((item._commonTags / mainTags.length) * 100);
    const url = item.url || `http://bgm.tv/subject/${item.id}`;
    
    log('[INFO]', `${index + 1}. ${name}`);
    console.log(`   ID: ${item.id} | 评分：${score} (排名：${rank})`);
    console.log(`   标签：${tags}`);
    console.log(`   匹配度：${matchPercent}% (${item._commonTags}个共同标签)`);
    console.log(`   链接：${url}`);
    console.log('');
  });
  
  // 附加：显示目标作品信息
  log('[INFO]', `\n参考作品：《${subject.name_cn || subject.name}》`);
  console.log(`评分：${subject.rating?.score || 'N/A'} | 标签：${mainTags.join(', ')}`);
  
  return recommendations;
}

// 标记观看状态（需要 Token）
// 收藏类型枚举（Bangumi Collection Type）
const CollectionType = {
  WISH: 1,      // 想看 / Wish
  DONE: 2,      // 看过 / Done (collect)
  DOING: 3,     // 在看 / Doing
  ON_HOLD: 4,   // 搁置 / On Hold
  DROPPED: 5,   // 抛弃 / Dropped
};

// 剧集状态枚举
const EpisodeType = {
  NONE: 1,   // 未观看
  DONE: 2,   // 看过
};

// 状态字符串映射到枚举
const typeMap = {
  'wish': CollectionType.WISH,
  'do': CollectionType.DOING,
  'doing': CollectionType.DOING,
  'collect': CollectionType.DONE,
  'done': CollectionType.DONE,
  'on_hold': CollectionType.ON_HOLD,
  'dropped': CollectionType.DROPPED,
};

async function setCollectionStatus(subjectId, type, rate = null) {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    console.log('请先设置 Token: bangumi token set <your_token>');
    return null;
  }
  
  const statusCode = typeMap[type] || CollectionType.DONE;
  const body = { type: statusCode };
  if (rate) body.rate = parseInt(rate);
  
  try {
    // POST 更新状态
    await apiRequest(`/v0/users/-/collections/${subjectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    // 清除缓存
    _collectionCache.delete(`collection_${subjectId}`);
    
    // 查询确认
    const result = await apiRequest(`/collection/${subjectId}`);
    const statusName = result.status?.name || '未知';
    
    log('[OK]', `状态已更新为：${statusName}`);
    console.log(`条目 ID: ${subjectId}`);
    if (rate) console.log(`评分：${rate}`);
    
    return result;
  } catch (e) {
    log('[ERROR]', `更新失败：${e.message}`);
    return null;
  }
}

// 标记剧集观看状态（需要 Token，优化版）
async function setEpisodeStatus(subjectId, episodeIds, type = EpisodeType.DONE, opts = {}) {
  const config = loadConfig();
  if (!config.accessToken) {
    log('[ERROR]', '错误：需要 Access Token');
    console.log('请先设置 Token: bangumi token set <your_token>');
    return null;
  }
  
  const { all = false } = opts;
  const now = Date.now();
  
  try {
    // 并行获取作品信息和收藏状态
    const [subject, collection] = await Promise.all([
      apiRequest(`/v0/subjects/${subjectId}`),
      apiRequest(`/collection/${subjectId}`),
    ]);
    
    const totalEps = subject.eps || subject.total_episodes || null;
    const name = subject.name_cn || subject.name;
    const currentEpStatus = collection.ep_status || 0;
    
    // 处理"全部看完"选项
    if (all) {
      if (!totalEps) {
        log('[ERROR]', '无法获取总集数，无法执行全部看完');
        return null;
      }
      
      // 使用缓存的剧集列表或获取
      const cacheKey = `episodes_${subjectId}`;
      const cache = _episodesCache.get(cacheKey);
      let episodes;
      
      if (cache && (now - cache.time) < EPISODES_CACHE_MS) {
        episodes = cache.data;
      } else {
        episodes = await apiRequest(`/v0/episodes?subject_id=${subjectId}&limit=${totalEps}`);
        _episodesCache.set(cacheKey, { data: episodes, time: now });
      }
      
      const allEpisodeIds = episodes.data?.map(ep => ep.id) || [];
      
      if (allEpisodeIds.length === 0) {
        log('[ERROR]', '未找到剧集信息');
        return null;
      }
      
      // 批量标记为已观看
      await apiRequest(`/v0/users/-/collections/${subjectId}/episodes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: { episode_id: allEpisodeIds, type: EpisodeType.DONE },
      });
      
      // 清除收藏缓存
      _collectionCache.delete(`collection_${subjectId}`);
      
      log('[OK]', `已全部标记为看过`);
      console.log(`作品：${name}`);
      console.log(`总集数：${totalEps}`);
      console.log(`已观看：${allEpisodeIds.length} 集`);
      console.log(`进度：${allEpisodeIds.length} / ${totalEps} 集 (100%)`);
      
      return true;
    }
    
    // 普通模式：标记指定剧集
    const eps = Array.isArray(episodeIds) ? episodeIds : [parseInt(episodeIds)];
    
    // 验证集数
    if (totalEps && eps.length > totalEps) {
      log('[ERROR]', `标记集数 (${eps.length}) 超过总集数 (${totalEps})`);
      return null;
    }
    
    if (totalEps && currentEpStatus + eps.length > totalEps) {
      log('[WARN]', `警告：当前进度 (${currentEpStatus}) + 新增集数 (${eps.length}) 超过总集数 (${totalEps})`);
    }
    
    // 更新剧集状态
    await apiRequest(`/v0/users/-/collections/${subjectId}/episodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { episode_id: eps, type },
    });
    
    // 清除收藏缓存
    _collectionCache.delete(`collection_${subjectId}`);
    
    // 获取最新状态
    const result = await apiRequest(`/collection/${subjectId}`);
    const epStatus = result.ep_status || 0;
    
    log('[OK]', `剧集状态已更新`);
    console.log(`作品：${name}`);
    console.log(`条目 ID: ${subjectId}`);
    console.log(`已更新剧集数：${eps.length}`);
    if (totalEps) {
      const percent = Math.round((epStatus / totalEps) * 100);
      console.log(`当前进度：${epStatus} / ${totalEps} 集 (${percent}%)`);
    } else {
      console.log(`当前进度：${epStatus} 集`);
    }
    
    return result;
  } catch (e) {
    log('[ERROR]', `更新失败：${e.message}`);
    return null;
  }
}

// 显示帮助
function showHelp() {
  console.log(`
Bangumi 动画查询技能
API 文档：https://bangumi.github.io/api/
获取 Token: https://next.bgm.tv/demo/access-token

用法：bangumi <命令> [参数]

基础命令:
  search <关键词>       搜索动画/漫画/游戏
  subject <ID> [选项]   获取条目详情
                        --detail/-d      详细模式（查询所有扩展信息）
                        --persons/-p     查询声优/制作人员
                        --characters/-c  查询角色列表
                        --subjects/-s    查询关联作品
                        --image/-i       获取高清原图
                        --collections    查询收藏统计（想看/看过/在看等人数）
                        --comments       查询吐槽箱（用户评论，显示 5 条）
  calendar              查看新番表
  today [数量]          查看今日更新的番剧
  seasonal [数量] [--min 评分]  查看本季热门番剧（按评分排序）
  rank [选项]           查看分类查询（支持多条件筛选）
  image <ID> [尺寸]     获取封面图 (尺寸：large/medium/small)
  episodes <ID>         获取剧集列表（话数/集数信息）
  rating <ID>           获取评分详情
  comments <ID> [-l 数量]  获取吐槽箱（用户评论）
  tags <ID> [--all]     获取作品标签列表（全部/热门）
  recommend <ID/名称>   推荐相似作品 [数量] [--sort hot|score|time|match]
  ts <标签 1> [标签 2]   标签搜索（多标签筛选）

用户命令:
  user <用户名>         查看用户信息
  collections <用户名>  查看用户收藏
  myinfo                查看我的信息 (需要 Token)
  mycollections [类型] [数量] [--sort time|hot|score]  查看我的收藏 (需要 Token)
  mytoday [数量]        查看我追更的番剧今日更新 (需要 Token)

状态管理 (需要 Token):
  setstatus <ID> <状态> [-r 评分]      标记观看状态
                                      状态：wish(想看)/do(在看)/collect(看过)/on_hold(搁置)/dropped(抛弃)
                                      -r, --rate 可选参数，设置评分 (1-10 分)
  seteps <ID> [选项]                   标记剧集观看状态
                                      <剧集 ID> [...]  标记指定剧集为已观看
                                      --eps 1,2,3      批量标记指定剧集
                                      --all            全部看完（标记所有剧集）

Token 管理:
  token status          查看 Token 状态
  token set <token>     设置 Access Token
  token clear           清除 Token

导出功能:
  pdf <ID>              导出番剧信息为 PDF 数据格式（JSON）

示例:
  bangumi search 葬送的芙莉莲
  bangumi subject 400602
  bangumi calendar
  bangumi image 400602 large
  bangumi episodes 400602
  bangumi user your_username
  bangumi token set YOUR_ACCESS_TOKEN
  bangumi setstatus 400602 collect 9
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  const action = args[0];
  const param = args[1];
  const param2 = args[2];
  const param3 = args[3];
  
  try {
    switch (action) {
      case 'search':
        if (!param) {
          log('[ERROR]', '错误：请提供搜索关键词');
          process.exit(1);
        }
        await search(param);
        break;
        
      case 'subject':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        // 解析扩展查询选项
        const subjectOpts = {
          persons: false,
          characters: false,
          subjects: false,
          image: false,
          collections: false,
          comments: false,
        };
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--detail' || arg === '-d') {
            // 详细模式：启用所有扩展查询
            subjectOpts.persons = true;
            subjectOpts.characters = true;
            subjectOpts.subjects = true;
            subjectOpts.collections = true;
            subjectOpts.comments = true;
          } else if (arg === '--persons' || arg === '-p') {
            subjectOpts.persons = true;
          } else if (arg === '--characters' || arg === '-c') {
            subjectOpts.characters = true;
          } else if (arg === '--subjects' || arg === '-s') {
            subjectOpts.subjects = true;
          } else if (arg === '--collections' || arg === '--stats') {
            subjectOpts.collections = true;
          } else if (arg === '--comments' || arg === '--comment') {
            subjectOpts.comments = true;
          }
        }
        await getSubject(param, subjectOpts);
        break;
        
      case 'calendar':
        await getCalendar();
        break;
        
      case 'today':
        await getTodayCalendar(parseInt(param) || 20);
        break;
        
      case 'mytoday':
        await getMyTodayUpdates(parseInt(param) || 20);
        break;
        
      case 'seasonal':
      case 'hot':
        // 解析参数：支持 --min 或 -m 选项设置最低评分
        let hotLimit = 15;
        let minScore = 7.0;
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--min' || arg === '-m') {
            minScore = parseFloat(args[++i]) || 7.0;
          } else if (arg === '--limit' || arg === '-l') {
            hotLimit = parseInt(args[++i]) || 15;
          } else if (!arg.startsWith('-') && /^\d+$/.test(arg)) {
            hotLimit = parseInt(arg);
          }
        }
        await getSeasonalHot(hotLimit, minScore);
        break;
        
      case 'episodes':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        // 支持 --status 或 -s 选项显示观看状态
        let showStatus = false;
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--status' || args[i] === '-s') {
            showStatus = true;
          }
        }
        await getEpisodes(param, showStatus);
        break;
        
      case 'rating':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        await getRating(param);
        break;
        
      case 'comments':
      case 'comment':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        // 解析 --limit 或 -l 选项
        let commentLimit = 10;
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--limit' || args[i] === '-l') {
            commentLimit = parseInt(args[++i]) || 10;
          } else if (!args[i].startsWith('-') && /^\d+$/.test(args[i])) {
            commentLimit = parseInt(args[i]);
          }
        }
        await getComments(param, commentLimit);
        break;
        
      case 'tags':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        // 解析 --all 或 -a 选项
        let showAll = false;
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--all' || args[i] === '-a') {
            showAll = true;
          }
        }
        await getTags(param, showAll);
        break;
        

        
      case 'tag-search':
      case 'ts':
        // 解析标签和选项
        const searchTags = [];
        const searchOpts = {
          type: 2,
          sort: 'rank',
          limit: 50,
          offset: 0,
        };
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--type' || arg === '-t') {
            searchOpts.type = parseInt(args[++i]) || 2;
          } else if (arg === '--sort' || arg === '-s') {
            searchOpts.sort = args[++i] || 'rank';
          } else if (arg === '--limit' || arg === '-l') {
            searchOpts.limit = parseInt(args[++i]) || 50;
          } else if (arg === '--offset' || arg === '-o') {
            searchOpts.offset = parseInt(args[++i]) || 0;
          } else if (arg === '--page' || arg === '-p') {
            const page = parseInt(args[++i]) || 1;
            searchOpts.offset = (page - 1) * searchOpts.limit;
          } else if (!arg.startsWith('-')) {
            searchTags.push(arg);
          }
        }
        if (searchTags.length === 0) {
          log('[ERROR]', '错误：请提供至少一个标签');
          process.exit(1);
        }
        await searchByTags(searchTags, searchOpts);
        break;
        
      case 'user':
        if (!param) {
          log('[ERROR]', '错误：请提供用户名');
          process.exit(1);
        }
        await getUserInfo(param);
        break;
        
      case 'collections':
        if (!param) {
          log('[ERROR]', '错误：请提供用户名');
          process.exit(1);
        }
        await getUserCollections(param, param2 || 'all', parseInt(param3) || 20);
        break;
        
      case 'myinfo':
        await getMyInfo();
        break;
        
      case 'mycollections':
      case 'mycol':
        // 解析参数：支持 --sort/-s, --limit/-l, --total/-t, --page/-p 选项
        let colType = 'all';
        let colLimit = 20;
        let colSort = 'time';
        let colTotal = false;
        let colPage = 1;
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--sort' || arg === '-s') {
            colSort = args[++i] || 'time';
          } else if (arg === '--limit' || arg === '-l') {
            colLimit = parseInt(args[++i]) || 20;
          } else if (arg === '--total' || arg === '-t') {
            colTotal = true;
          } else if (arg === '--page' || arg === '-p') {
            colPage = parseInt(args[++i]) || 1;
          } else if (!arg.startsWith('-')) {
            if (/^\d+$/.test(arg)) {
              colLimit = parseInt(arg);
            } else {
              colType = arg;
            }
          }
        }
        if (colTotal) {
          await getMyCollectionsTotal(colType);
        } else {
          await getMyCollections(colType, colLimit, colSort, colPage);
        }
        break;
        
      case 'recommend':
      case 'rec':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID 或作品名称');
          process.exit(1);
        }
        // 解析参数：支持 --sort 或 -s 选项
        let targetId = param;
        let limit = 10;
        let sortBy = 'hot'; // 默认按热度
        
        // 解析可选参数
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--sort' || arg === '-s') {
            sortBy = args[++i] || 'hot';
          } else if (arg === '--limit' || arg === '-l') {
            limit = parseInt(args[++i]) || 10;
          } else if (!arg.startsWith('-') && /^\d+$/.test(arg) && targetId === param) {
            // 第二个位置参数当作数量（兼容旧用法）
            limit = parseInt(arg);
          } else if (!arg.startsWith('-') && targetId === param) {
            // 第一个非选项参数当作数量（兼容旧用法：recommend <name> [limit]）
            limit = parseInt(arg) || 10;
          }
        }
        
        // 如果是数字，当作 ID；否则先搜索
        if (/^\d+$/.test(targetId)) {
          await recommend(targetId, limit, sortBy);
        } else {
          // 先搜索获取 ID
          const searchResult = await search(targetId);
          if (searchResult && searchResult.list && searchResult.list.length > 0) {
            await recommend(searchResult.list[0].id, limit, sortBy);
          } else {
            log('[ERROR]', '未找到该作品');
            process.exit(1);
          }
        }
        break;
        
      case 'setstatus':
        if (!param || !param2) {
          log('[ERROR]', '错误：请提供条目 ID 和状态');
          process.exit(1);
        }
        // 解析可选的 --rate 参数
        let rate = null;
        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--rate' || args[i] === '-r') {
            rate = args[++i];
            break;
          }
        }
        // 兼容旧用法：第三个位置参数作为评分
        if (!rate && param3 && !param3.startsWith('-')) {
          rate = param3;
        }
        await setCollectionStatus(param, param2, rate);
        break;
        
      case 'seteps':
      case 'setepisode':
        if (!param) {
          log('[ERROR]', '错误：请提供条目 ID');
          process.exit(1);
        }
        // 解析参数：bangumi seteps <ID> <episode_id1> [episode_id2] [...]
        // 或者：bangumi seteps <ID> --eps 1,2,3
        // 或者：bangumi seteps <ID> --all (全部看完)
        let episodeIds = [];
        let allDone = false;
        
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--eps' || arg === '-e') {
            const epsStr = args[++i];
            episodeIds = epsStr.split(',').map(e => parseInt(e.trim()));
          } else if (arg === '--all') {
            allDone = true;
          } else if (!arg.startsWith('-') && /^\d+$/.test(arg)) {
            episodeIds.push(parseInt(arg));
          }
        }
        
        if (!allDone && episodeIds.length === 0) {
          log('[ERROR]', '错误：请提供至少一个剧集 ID，或使用 --all 选项');
          log('[INFO]', '用法：bangumi seteps <条目 ID> <剧集 ID1> [剧集 ID2] [...]');
          log('[INFO]', '或：bangumi seteps <条目 ID> --eps 1,2,3');
          log('[INFO]', '或：bangumi seteps <条目 ID> --all (全部看完)');
          process.exit(1);
        }
        
        await setEpisodeStatus(param, episodeIds, EpisodeType.DONE, { all: allDone });
        break;
        
      case 'token':
        if (!param) {
          tokenStatus();
        } else if (param === 'set') {
          if (!param2) {
            log('[ERROR]', '错误：请提供 Token');
            process.exit(1);
          }
          await setToken(param2);
        } else if (param === 'clear') {
          clearToken();
        } else if (param === 'status') {
          tokenStatus();
        } else {
          log('[ERROR]', `未知命令：token ${param}`);
          showHelp();
        }
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      case 'category':
      case 'cat':
      case 'rank':
      case 'ranking':
      case 'rank':
        // 解析分类查询参数
        const rankOpts = {
          type: '2',
          sort: 'rank',
          limit: 20,
          page: 1,
          tags: [],
        };
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--sort' || arg === '-s') {
            rankOpts.sort = args[++i] || 'rank';
          } else if (arg === '--type' || arg === '-t') {
            rankOpts.type = args[++i] || '2';
          } else if (arg === '--category' || arg === '-c') {
            rankOpts.category = args[++i] || '';
          } else if (arg === '--source' || arg === '-o') {
            rankOpts.source = args[++i] || '';
          } else if (arg === '--region' || arg === '-r') {
            rankOpts.region = args[++i] || '';
          } else if (arg === '--audience' || arg === '-a') {
            rankOpts.audience = args[++i] || '';
          } else if (arg === '--year' || arg === '-y') {
            rankOpts.year = args[++i] || '';
          } else if (arg === '--letter' || arg === '-l') {
            rankOpts.letter = args[++i] || '';
          } else if (arg === '--limit') {
            rankOpts.limit = parseInt(args[++i]) || 20;
          } else if (arg === '--page' || arg === '-p') {
            rankOpts.page = parseInt(args[++i]) || 1;
          } else if (arg === '--help') {
            showCategoryHelp();
            process.exit(0);
          }
        }
        await getRanking(rankOpts);
        break;
      
      case 'char':
      case 'character':
        // 获取角色详情（通过角色 ID）
        if (!param) {
          log('[ERROR]', '错误：请提供角色 ID');
          log('[INFO]', '用法：bangumi char <角色 ID> [--subjects/-s] [--persons/-p]');
          process.exit(1);
        }
        // 解析选项
        const charOpts = {
          subjects: false,
          persons: false,
        };
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--subjects' || arg === '-s') {
            charOpts.subjects = true;
          } else if (arg === '--persons' || arg === '-p') {
            charOpts.persons = true;
          }
        }
        await getCharacter(param, charOpts);
        break;
        
      case 'char-search':
      case 'csearch':
        // 使用 POST /v0/search/characters 搜索角色
        if (!param) {
          log('[ERROR]', '错误：请提供角色名关键词');
          log('[INFO]', '用法：bangumi char-search <角色名> [--nsfw true|false]');
          process.exit(1);
        }
        // 解析参数
        let searchKeyword = param;
        let searchNsfw = true;
        for (let i = 1; i < args.length; i++) {
          const arg = args[i];
          if (arg === '--nsfw') {
            const nsfwVal = args[++i];
            searchNsfw = nsfwVal === 'true' || nsfwVal === '1' || nsfwVal === 'yes';
          }
        }
        await searchCharacters(searchKeyword, { nsfw: searchNsfw });
        break;
        
      case 'pdf':
        // 导出番剧信息为 PDF 数据格式
        if (!param || !/^\d+$/.test(param)) {
          log('[ERROR]', '错误：请提供条目 ID');
          log('[INFO]', '用法：bangumi pdf <条目 ID>');
          process.exit(1);
        }
        await exportToPDF(parseInt(param));
        break;
        
      default:
        log('[ERROR]', `未知命令：${action}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    log('[ERROR]', `\n错误：${error.message}`);
    process.exit(1);
  }
}

main();
// 网页抓取辅助函数
async function fetchWebPage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 302) resolve(data);
        else reject(new Error('HTTP ' + res.statusCode));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ============================================================================
// 角色搜索 - 使用 POST /v0/search/characters
// 支持关键词搜索和条件筛选（nsfw 等）
// ============================================================================

// 角色搜索专用 API 请求（不使用连接池，不使用 Token，避免 POST 请求问题）
function characterSearchRequest(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    let url = `${BASE_URL}${apiPath}`;
    
    // 角色搜索 API 不使用 Token（使用 Token 会导致返回空结果）
    const headers = {
      'User-Agent': 'OpenClaw-Bangumi-Skill/1.0',
      ...options.headers,
    };
    
    const reqOptions = {
      method: options.method || 'GET',
      headers,
      timeout: 10000,
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({});
          return;
        }
        
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`API 错误 (${res.statusCode}): ${data}`));
          } else {
            resolve(data ? JSON.parse(data) : {});
          }
        } catch (e) {
          reject(new Error(`JSON 解析失败：${e.message}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`API 请求失败：${e.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API 请求超时 (10 秒)'));
    });
    
    if (options.body) {
      const bodyData = JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      req.write(bodyData);
    }
    
    req.end();
  });
}

async function searchCharacters(keyword, opts = {}) {
  return new Promise((resolve, reject) => {
    let url = `${BASE_URL}${apiPath}`;
    
    // 角色搜索 API 不使用 Token（使用 Token 会导致返回空结果）
    const headers = {
      'User-Agent': 'OpenClaw-Bangumi-Skill/1.0',
      ...options.headers,
    };
    
    const reqOptions = {
      method: options.method || 'GET',
      headers,
      timeout: 10000,
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({});
          return;
        }
        
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`API 错误 (${res.statusCode}): ${data}`));
          } else {
            resolve(data ? JSON.parse(data) : {});
          }
        } catch (e) {
          reject(new Error(`JSON 解析失败：${e.message}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`API 请求失败：${e.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API 请求超时 (10 秒)'));
    });
    
    if (options.body) {
      const bodyData = JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      req.write(bodyData);
    }
    
    req.end();
  });
}

async function searchCharacters(keyword, opts = {}) {
  const {
    nsfw = true,  // 是否包含 R18 角色
  } = opts;
  
  if (!keyword) {
    log('[ERROR]', '错误：请提供角色名关键词');
    return null;
  }
  
  log('[INFO]', `正在搜索角色：${keyword} ...`);
  
  // 构建 POST 请求体
  const requestBody = {
    keyword: keyword,
    filter: {
      description: '不同条件之间是 且 的关系',
      nsfw: nsfw,
    },
  };
  
  // 使用 POST 请求（不使用连接池）
  const result = await characterSearchRequest('/v0/search/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
  });
  
  if (!result.data || result.data.length === 0) {
    log('[WARN]', '未找到相关角色');
    return null;
  }
  
  const total = result.total || result.data.length;
  
  log('[INFO]', `\n=== 角色搜索：${keyword}（共${total}条，显示前${result.data.length}条）===`);
  console.log('');
  
  result.data.forEach((item, index) => {
    const name = item.name_cn || item.name;
    const gender = item.gender === 'female' ? '女' : item.gender === 'male' ? '男' : '未知';
    const summary = item.summary ? (item.summary.length > 100 ? item.summary.substring(0, 100) + '...' : item.summary) : '无简介';
    const collects = item.stat?.collects || 0;
    const comments = item.stat?.comments || 0;
    
    console.log(`${index + 1}. ${name}`);
    console.log(`   性别：${gender} | ID: ${item.id}`);
    console.log(`   收藏：${collects}人 | 评论：${comments}条`);
    console.log(`   简介：${summary.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ')}`);
    console.log('');
  });
  
  if (result.data.length < total) {
    log('[INFO]', `\n💡 提示：共${total}条结果，当前显示${result.data.length}条`);
  }
  
  return { list: result.data, total };
}

// ============================================================================
// 获取角色详情（通过角色 ID）
// 支持查询出演作品和配音演员
// ============================================================================
async function getCharacter(id, opts = {}) {
  const {
    subjects = false,  // 显示出演作品
    persons = false,   // 显示配音演员（声优）
  } = opts;
  
  // 获取角色详情
  const character = await apiRequest(`/v0/characters/${id}`);
  
  if (!character || !character.id) {
    log('[WARN]', '未找到该角色');
    return null;
  }
  
  const name = character.name_cn || character.name;
  const gender = character.gender === 'female' ? '女' : character.gender === 'male' ? '男' : '未知';
  const summary = character.summary || '无简介';
  
  log('[INFO]', `\n=== ${name} ===`);
  console.log('');
  console.log(`🆔 ID: ${character.id}`);
  console.log(`♀️ 性别：${gender}`);
  console.log(`📊 收藏：${character.stat?.collects || 0}人 | 评论：${character.stat?.comments || 0}条`);
  console.log('');
  
  // 简介
  console.log(`📝 简介:`);
  console.log(`   ${summary.replace(/\r\n/g, '\n   ').replace(/\r/g, '\n   ').replace(/\n/g, '\n   ')}`);
  console.log('');
  
  // 别名
  if (character.infobox && character.infobox.length > 0) {
    const alias = character.infobox.find(i => i.key === '别名');
    if (alias && alias.value) {
      console.log(`🏷️ 别名:`);
      if (Array.isArray(alias.value)) {
        alias.value.forEach(a => {
          console.log(`   ${a.k}: ${a.v}`);
        });
      } else {
        console.log(`   ${alias.value}`);
      }
      console.log('');
    }
  }
  
  // 出演作品
  if (subjects) {
    try {
      const subjectsData = await apiRequest(`/v0/characters/${id}/subjects`);
      if (subjectsData && subjectsData.length > 0) {
        console.log(`🎬 出演作品 (${subjectsData.length}部):`);
        subjectsData.slice(0, 20).forEach(s => {
          const subjName = s.name_cn || s.name || '未知';
          const relation = s.staff || '未知';
          const type = s.type === 2 ? '动画' : s.type === 1 ? '书籍' : s.type === 3 ? '音乐' : s.type === 4 ? '游戏' : '未知';
          console.log(`   • ${subjName} - ${relation} (${type})`);
        });
        if (subjectsData.length > 20) {
          console.log(`   ... 还有 ${subjectsData.length - 20} 部`);
        }
        console.log('');
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  // 配音演员
  if (persons) {
    try {
      const personsData = await apiRequest(`/v0/characters/${id}/persons`);
      if (personsData && personsData.length > 0) {
        console.log(`🎙️ 配音演员 (${personsData.length}人):`);
        personsData.forEach(p => {
          const personName = p.name || '未知';
          const relation = p.staff || '未知';
          const subjName = p.subject_name_cn || p.subject_name || '';
          console.log(`   • ${personName} - ${relation}（${subjName}）`);
        });
        console.log('');
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  return character;
}

// ============================================================================
// 番剧信息导出 - 生成 PDF 文件
// ============================================================================
async function exportToPDF(subjectId) {
  const subject = await apiRequest(`/v0/subjects/${subjectId}`);
  if (!subject || !subject.id) {
    log('[ERROR]', `未找到条目 ${subjectId}`);
    process.exit(1);
  }
  
  const characters = await apiRequest(`/v0/subjects/${subjectId}/characters`) || [];
  const collection = subject.collection || {};
  
  // 计算好评率
  const ratingCount = subject.rating?.count || {};
  const total = Object.values(ratingCount).reduce((a, b) => a + parseInt(b), 0);
  const positive = [8, 9, 10].reduce((a, i) => a + parseInt(ratingCount[i] || 0), 0);
  const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;
  
  // 分割剧情简介
  const summary = (subject.summary || '暂无简介').replace(/<[^>]+>/g, '');
  const paragraphs = summary.split(/[。！？]/).filter(s => s.trim().length >= 20).slice(0, 4);
  
  // 生成 PDF 内容（纯文本格式，可用于邮件或其他用途）
  const data = {
    alt_text: subject.name_cn || subject.name || '未知作品',
    rating_score: String(subject.rating?.score || 'N/A'),
    rating_label: `Bangumi 评分 · 排名第${subject.rating?.rank || 'N/A'} · ${subject.rating?.total || 0}人评价`,
    rank: `#${subject.rating?.rank || 'N/A'}`,
    votes: String(subject.rating?.total || 0),
    favorites: String(Object.values(collection).reduce((a, b) => a + parseInt(b), 0)),
    positive_rate: String(positiveRate),
    va1_role: characters[0]?.name_cn || characters[0]?.name || '',
    va1_name: characters[0]?.actors?.[0]?.name_cn || characters[0]?.actors?.[0]?.name || '',
    va2_role: characters[1]?.name_cn || characters[1]?.name || '',
    va2_name: characters[1]?.actors?.[0]?.name_cn || characters[1]?.actors?.[0]?.name || '',
    va3_role: characters[2]?.name_cn || characters[2]?.name || '',
    va3_name: characters[2]?.actors?.[0]?.name_cn || characters[2]?.actors?.[0]?.name || '',
    va4_role: characters[3]?.name_cn || characters[3]?.name || '',
    va4_name: characters[3]?.actors?.[0]?.name_cn || characters[3]?.actors?.[0]?.name || '',
    tags: (subject.tags || []).slice(0, 8).map(t => t.name),
    header_title: `📺 ${subject.name_cn || subject.name}`,
    header_subtitle: `${subject.type_name || '动画'} · ${subject.date || '未知日期'}`,
    stat_wish_num: String(collection.wish || 0),
    stat_doing_num: String(collection.doing || 0),
    stat_done_num: String(collection.collect || 0),
    stat_total: String(Object.values(collection).reduce((a, b) => a + parseInt(b), 0)),
    synopsis: paragraphs.length > 0 ? paragraphs : ['暂无简介'],
    link_url: subject.url || `http://bgm.tv/subject/${subjectId}`,
    link_text: '查看 Bangumi 条目 →',
    cover_url: subject.images?.large || subject.images?.common || '',
    signature: 'OpenClaw 智慧之王 💙 Raphael',
    date: new Date().toISOString().split('T')[0]
  };
  
  // 输出 JSON 数据（可被其他脚本用于生成 PDF）
  console.log(JSON.stringify(data, null, 2));
  
  return data;
}

