#!/usr/bin/env python3
"""
Bangumi 技能 - 邮件发送模块
调用 bangumi.js 获取数据并发送邮件
"""

import sys
import subprocess
import json
import smtplib
import urllib.request
import ssl
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional, List, Dict, Any


# ==================== 邮件发送器 ====================

class EmailSender:
    """邮件发送器"""
    
    def __init__(self, config_path=None):
        """
        初始化邮件发送器
        
        Args:
            config_path: 配置文件路径
        """
        if config_path is None:
            config_path = Path.home() / ".openclaw" / "workspace" / ".config" / "email" / "config.json"
        
        self.config = self._load_config(config_path)
        self.smtp_server = self.config["smtp"]["server"]
        self.smtp_port = self.config["smtp"]["port"]
        self.sender_email = self.config["sender"]["email"]
        self.sender_password = self.config["sender"]["password"]
        self.recipient_email = self.config["recipient"]["email"]
        self.image_config = self.config["image"]
    
    def _load_config(self, config_path):
        """加载配置文件"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"配置文件不存在：{config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"配置文件格式错误：{e}")
    
    def download_image(self, url):
        """
        下载图片
        
        Args:
            url: 图片 URL
            
        Returns:
            bytes: 图片二进制数据
        """
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': self.image_config["user_agent"],
                    'Referer': self.image_config["referer"]
                }
            )
            
            with urllib.request.urlopen(req, context=ctx, timeout=self.image_config["timeout"]) as r:
                return r.read()
        except Exception as e:
            print(f"⚠️ 图片下载失败：{e}")
            return None
    
    def send_email(self, subject, html_body, image_url=None, image_cid='cover_image'):
        """
        发送 HTML 邮件
        
        Args:
            subject: 邮件主题
            html_body: HTML 邮件内容
            image_url: 图片 URL（可选）
            image_cid: 图片 Content-ID
            
        Returns:
            bool: 发送成功返回 True
        """
        msg = MIMEMultipart('related')
        msg['From'] = self.sender_email
        msg['To'] = self.recipient_email
        msg['Subject'] = subject
        
        # 下载并附加图片
        if image_url:
            print(f"正在下载图片：{image_url}")
            image_data = self.download_image(image_url)
            if image_data:
                print(f"✅ 图片下载成功 ({len(image_data)} bytes)")
                img = MIMEImage(image_data)
                img.add_header('Content-ID', f'<{image_cid}>')
                msg.attach(img)
            else:
                print("⚠️ 图片下载失败，继续发送邮件")
        
        # 附加 HTML 内容
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        
        try:
            print(f"正在连接 {self.smtp_server}:{self.smtp_port}...")
            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=30)
            server.set_debuglevel(0)
            
            print(f"正在登录 {self.sender_email}...")
            server.login(self.sender_email, self.sender_password)
            
            print(f"正在发送邮件到 {self.recipient_email}...")
            server.sendmail(self.sender_email, [self.recipient_email], msg.as_string())
            server.quit()
            
            print(f"\n✅ 邮件发送成功！")
            print(f"主题：{subject}")
            print(f"收件人：{self.recipient_email}")
            return True
        except Exception as e:
            print(f"\n❌ 邮件发送失败：{e}")
            return False


# ==================== 模板引擎 ====================

class TemplateEngine:
    """模板引擎"""
    
    def __init__(self, template_dir=None):
        """
        初始化模板引擎
        
        Args:
            template_dir: 模板目录路径
        """
        if template_dir is None:
            template_dir = Path(__file__).parent.parent / "templates"
        self.template_dir = Path(template_dir)
    
    def load_template(self, template_name):
        """
        加载模板文件
        
        Args:
            template_name: 模板文件名
            
        Returns:
            str: 模板内容
        """
        template_path = self.template_dir / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"模板文件不存在：{template_path}")
    
    def render(self, template_name, **kwargs):
        """
        渲染模板
        
        Args:
            template_name: 模板文件名
            **kwargs: 模板变量
            
        Returns:
            str: 渲染后的 HTML
        """
        template = self.load_template(template_name)
        return template.format(**kwargs)


# ==================== 数据获取 ====================

def get_anime_data(subject_id: int) -> Optional[Dict[str, Any]]:
    """
    调用 bangumi.js 获取番剧数据
    
    Args:
        subject_id: Bangumi 条目 ID
        
    Returns:
        dict: 番剧数据字典
    """
    bangumi_js = Path(__file__).parent / "bangumi.js"
    
    try:
        result = subprocess.run(
            ["node", str(bangumi_js), "info", str(subject_id)],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"❌ bangumi.js 执行失败：{result.stderr}")
            return None
        
        # 解析 JSON 输出
        data = json.loads(result.stdout)
        
        if "error" in data:
            print(f"❌ {data['error']}")
            return None
        
        return data
    except subprocess.TimeoutExpired:
        print("❌ 请求超时")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败：{e}")
        return None


# ==================== HTML 生成辅助函数 ====================

def generate_tags_html(tags: List[str]) -> str:
    """生成标签 HTML"""
    return "".join(f'<span class="tag">{tag}</span>' for tag in tags)


def generate_synopsis_html(paragraphs: List[str]) -> str:
    """生成剧情简介 HTML"""
    return "".join(f"<p>{p}</p>" for p in paragraphs)


def generate_quotes_html(quotes: List[Dict[str, str]]) -> str:
    """生成用户评价 HTML"""
    html = ""
    for quote in quotes:
        html += f'''<div class="quote-card">
            <div class="quote-text">"{quote['text']}"</div>
            <div class="quote-author">— {quote['author']}</div>
        </div>'''
    return html


# ==================== 邮件发送主函数 ====================

def send_anime_email(
    data: Dict[str, Any],
    subject: Optional[str] = None,
    cover_url: Optional[str] = None,
    quotes: Optional[List[Dict[str, str]]] = None
) -> bool:
    """
    发送番剧推荐邮件
    
    Args:
        data: 番剧数据字典
        subject: 邮件主题（可选）
        cover_url: 封面图 URL（可选）
        quotes: 用户评价列表（可选）
        
    Returns:
        bool: 发送成功返回 True
    """
    # 初始化
    sender = EmailSender()
    template_engine = TemplateEngine()
    
    # 默认用户评价
    if quotes is None:
        quotes = [
            {"text": "非常不错的作品，推荐观看！", "author": "动漫爱好者"},
            {"text": "制作精良，剧情精彩", "author": "评论家"},
            {"text": "值得一看的好作品", "author": "观众"}
        ]
    
    # 渲染模板
    print("正在渲染模板...")
    html_body = template_engine.render(
        "Anime_Details.html",
        alt_text=data.get("alt_text", "未知作品"),
        rating_score=data.get("rating_score", "N/A"),
        rating_label=data.get("rating_label", ""),
        rank=data.get("rank", "N/A"),
        votes=data.get("votes", "0"),
        favorites=data.get("favorites", "0"),
        positive_rate=data.get("positive_rate", "N/A"),
        va1_role=data.get("va1_role", ""),
        va1_name=data.get("va1_name", ""),
        va2_role=data.get("va2_role", ""),
        va2_name=data.get("va2_name", ""),
        va3_role=data.get("va3_role", ""),
        va3_name=data.get("va3_name", ""),
        va4_role=data.get("va4_role", ""),
        va4_name=data.get("va4_name", ""),
        tags_html=generate_tags_html(data.get("tags", [])),
        header_title=data.get("header_title", ""),
        header_subtitle=data.get("header_subtitle", ""),
        stat_wish_num=data.get("stat_wish_num", "0"),
        stat_doing_num=data.get("stat_doing_num", "0"),
        stat_done_num=data.get("stat_done_num", "0"),
        stat_total=data.get("stat_total", "0"),
        synopsis_html=generate_synopsis_html(data.get("synopsis", ["暂无简介"])),
        quotes_html=generate_quotes_html(quotes),
        link_url=data.get("link_url", ""),
        link_text=data.get("link_text", "查看 Bangumi 条目 →"),
        signature=data.get("signature", "OpenClaw 智慧之王 💙 Raphael"),
        date=data.get("date", "")
    )
    
    # 默认主题和封面
    if subject is None:
        subject = f"{sender.config['defaults']['subject_prefix']} 推荐：{data.get('alt_text', '未知作品')}"
    if cover_url is None:
        cover_url = data.get("cover_url", "")
    
    # 发送邮件
    return sender.send_email(subject, html_body, cover_url if cover_url else None)


# ==================== 主函数 ====================

if __name__ == "__main__":
    print("=" * 50)
    print("Bangumi 邮件发送")
    print("=" * 50)
    print()
    
    # 解析命令行参数
    if len(sys.argv) < 2:
        print("用法：python send_mail.py <subject_id> [邮件主题]")
        print("示例：")
        print("  python send_mail.py 493016")
        print("  python send_mail.py 493016 '本季最佳：异国日记'")
        sys.exit(1)
    
    arg1 = sys.argv[1]
    subject_arg = sys.argv[2] if len(sys.argv) > 2 else None
    
    # 获取数据（调用 bangumi.js）
    if not arg1.isdigit():
        print(f"❌ 请提供条目 ID（数字）：{arg1}")
        sys.exit(1)
    
    subject_id = int(arg1)
    print(f"正在获取条目 {subject_id} 的数据...")
    data = get_anime_data(subject_id)
    
    if not data:
        print("❌ 数据获取失败")
        sys.exit(1)
    
    print(f"作品名称：{data.get('alt_text', '未知')}")
    print(f"评分：{data.get('rating_score', 'N/A')}")
    print(f"封面 URL: {data.get('cover_url', '')}")
    
    # 发送邮件
    success = send_anime_email(data, subject=subject_arg)
    sys.exit(0 if success else 1)
