#!/usr/bin/env python3
"""
Bangumi 番剧信息 PDF 生成器

根据 HTML 模板和数据生成 PDF 文件
"""

import sys
import json
from pathlib import Path
from datetime import datetime


def load_template():
    """加载 HTML 模板"""
    template_path = Path(__file__).parent.parent / 'templates' / 'Anime_Details.html'
    try:
        template = template_path.read_text(encoding='utf-8')
        # 替换 body 的 font-family 添加中文字体（使用双重大括号转义 CSS）
        template = template.replace(
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;',
            "font-family: 'Noto Sans SC', 'Microsoft YaHei', 'SimHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;"
        )
        return template
    except FileNotFoundError:
        print(f"⚠️ 模板文件不存在：{template_path}", file=sys.stderr)
        return get_fallback_template()


def get_fallback_template():
    """返回备用模板"""
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{alt_text}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 10px 0 0; opacity: 0.9; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .section {{ margin-bottom: 25px; }}
        .section-title {{ font-size: 18px; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-bottom: 15px; }}
        .rating {{ font-size: 32px; color: #f59e0b; font-weight: bold; }}
        .stats {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }}
        .stat-card {{ background: white; padding: 15px; border-radius: 8px; text-align: center; }}
        .stat-value {{ font-size: 20px; font-weight: bold; color: #667eea; }}
        .stat-label {{ font-size: 12px; color: #666; margin-top: 5px; }}
        .va-list {{ list-style: none; padding: 0; }}
        .va-item {{ padding: 10px; background: white; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid #667eea; }}
        .tags {{ display: flex; flex-wrap: wrap; gap: 8px; }}
        .tag {{ background: #667eea; color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px; }}
        .synopsis {{ line-height: 1.8; color: #444; }}
        .footer {{ text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{header_title}</h1>
        <p>{header_subtitle}</p>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-title">⭐ 评分信息</div>
            <div class="rating">{rating_score}/10</div>
            <p>{rating_label}</p>
            <p>好评率：{positive_rate}%</p>
        </div>
        
        <div class="section">
            <div class="section-title">📊 收藏统计</div>
            <div class="stats">
                <div class="stat-card"><div class="stat-value">{stat_wish_num}</div><div class="stat-label">想看</div></div>
                <div class="stat-card"><div class="stat-value">{stat_doing_num}</div><div class="stat-label">在看</div></div>
                <div class="stat-card"><div class="stat-value">{stat_done_num}</div><div class="stat-label">看过</div></div>
            </div>
            <p style="text-align: center; margin-top: 15px;">总计：{stat_total}人</p>
        </div>
        
        <div class="section">
            <div class="section-title">🎙️ 主要声优</div>
            <ul class="va-list">
                {va_list_html}
            </ul>
        </div>
        
        <div class="section">
            <div class="section-title">🏷️ 标签</div>
            <div class="tags">{tags_html}</div>
        </div>
        
        <div class="section">
            <div class="section-title">📝 剧情简介</div>
            <div class="synopsis">{synopsis_html}</div>
        </div>
        
        <div class="section" style="text-align: center;">
            <a href="{link_url}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">{link_text}</a>
        </div>
    </div>
    <div class="footer">
        <p>{signature}</p>
        <p>生成时间：{date}</p>
    </div>
</body>
</html>"""


def render_template(template: str, data: dict) -> str:
    """渲染 HTML 模板"""
    # 生成声优列表 HTML
    va1_role = data.get('va1_role', '')
    va1_name = data.get('va1_name', '')
    va2_role = data.get('va2_role', '')
    va2_name = data.get('va2_name', '')
    va3_role = data.get('va3_role', '')
    va3_name = data.get('va3_name', '')
    va4_role = data.get('va4_role', '')
    va4_name = data.get('va4_name', '')
    
    # 生成标签 HTML
    tags = data.get('tags', [])
    tags_html = ''.join(f'<span class="tag">{tag}</span>' for tag in tags)
    
    # 生成剧情简介 HTML
    synopsis = data.get('synopsis', [])
    if isinstance(synopsis, list):
        synopsis_html = ''.join(f'<p>{para.strip()}</p>' for para in synopsis if para.strip())
    else:
        synopsis_html = f'<p>{synopsis}</p>'
    
    # 生成用户评价 HTML（从数据中获取）
    quotes_html = data.get('quotes_html', '')
    
    # 渲染模板
    html = template.format(
        alt_text=data.get('alt_text', '未知作品'),
        header_title=data.get('header_title', '📺 未知作品'),
        header_subtitle=data.get('header_subtitle', ''),
        rating_score=data.get('rating_score', 'N/A'),
        rating_label=data.get('rating_label', ''),
        rank=data.get('rank', 'N/A'),
        votes=data.get('votes', '0'),
        favorites=data.get('favorites', '0'),
        positive_rate=data.get('positive_rate', '0'),
        stat_wish_num=data.get('stat_wish_num', '0'),
        stat_doing_num=data.get('stat_doing_num', '0'),
        stat_done_num=data.get('stat_done_num', '0'),
        stat_total=data.get('stat_total', '0'),
        va1_role=va1_role,
        va1_name=va1_name,
        va2_role=va2_role,
        va2_name=va2_name,
        va3_role=va3_role,
        va3_name=va3_name,
        va4_role=va4_role,
        va4_name=va4_name,
        tags_html=tags_html,
        synopsis_html=synopsis_html,
        quotes_html=quotes_html,
        link_url=data.get('link_url', ''),
        link_text=data.get('link_text', '查看 Bangumi 条目 →'),
        signature=data.get('signature', 'OpenClaw 智慧之王 💙 Raphael'),
        date=data.get('date', datetime.now().isoformat().split('T')[0]),
        cover_url=data.get('cover_url', '')
    )
    
    return html


def save_html(html: str, output_path: str, cover_url: str = ''):
    """保存 HTML 文件"""
    path = Path(output_path)
    if not str(path).endswith('.html'):
        path = Path(str(path).replace('.pdf', '.html').replace('.txt', '.html'))
    
    # 替换 cid:cover_image 为实际图片 URL 或移除
    if cover_url:
        html = html.replace('src="cid:cover_image"', f'src="{cover_url}"')
    else:
        # 移除图片标签
        html = html.replace('<img src="cid:cover_image" alt="{alt_text}">', '<div style="background:linear-gradient(135deg,#667eea,#764ba2);height:300px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;">封面图</div>')
    
    path.write_text(html, encoding='utf-8')
    print(f"✅ HTML 已保存到：{path}")
    return str(path)


def html_to_pdf(html_path: str, pdf_path: str, zoom: float = 1.0) -> bool:
    """
    将 HTML 转换为 PDF
    
    参数：
        zoom: 缩放比例（1.0=100%，0.8=80%，1.2=120%）
    
    尝试多种方法：
    1. 使用 wkhtmltopdf 命令行工具
    2. 使用 pdfkit (wkhtmltopdf Python 封装)
    3. 使用 weasyprint
    4. 提示用户手动转换
    """
    import subprocess
    
    # 方法 1: 直接使用 wkhtmltopdf 命令行（支持缩放）
    try:
        cmd = [
            'wkhtmltopdf',
            '--quiet',
            '--encoding', 'UTF-8',
            '--enable-local-file-access',
            '--zoom', str(zoom),
            html_path, pdf_path
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            print(f"✅ PDF 已生成：{pdf_path}")
            print(f"   缩放比例：{zoom*100:.0f}%")
            return True
        else:
            print(f"⚠️ wkhtmltopdf 失败：{result.stderr}")
    except FileNotFoundError:
        pass
    except subprocess.TimeoutExpired:
        print("⚠️ wkhtmltopdf 超时")
    except Exception as e:
        print(f"⚠️ wkhtmltopdf 失败：{e}")
    
    # 方法 2: 尝试 pdfkit
    try:
        import pdfkit
        pdfkit.from_file(html_path, pdf_path)
        print(f"✅ PDF 已生成：{pdf_path}")
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"⚠️ pdfkit 失败：{e}")
    
    # 方法 3: 尝试 weasyprint
    try:
        from weasyprint import HTML
        HTML(filename=html_path).write_pdf(pdf_path)
        print(f"✅ PDF 已生成：{pdf_path}")
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"⚠️ weasyprint 失败：{e}")
    
    # 无法自动转换
    print(f"\n💡 提示：系统未安装 PDF 转换工具，已生成 HTML 文件")
    print(f"   可以使用以下方法转换为 PDF:")
    print(f"   1. 用浏览器打开 HTML 文件，然后打印为 PDF")
    print(f"   2. 安装 wkhtmltopdf: sudo apt-get install wkhtmltopdf")
    print(f"   3. 安装 Python 库：pip install pdfkit 或 pip install weasyprint")
    print(f"   4. 使用在线转换工具")
    return False


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法：python generate_pdf.py <条目 ID> [输出文件.pdf] [--zoom 缩放比例]")
        print("示例：python generate_pdf.py 400602 芙莉莲.pdf")
        print("       python generate_pdf.py 400602 芙莉莲.pdf --zoom 0.9")
        print("缩放比例：1.0=100%（默认），0.8=80%，1.2=120%")
        sys.exit(1)
    
    subject_id = sys.argv[1]
    
    # 解析参数
    output_path = None
    zoom = 1.0  # 默认 100% 缩放
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--zoom' and i + 1 < len(sys.argv):
            zoom = float(sys.argv[i + 1])
            i += 2
        else:
            output_path = sys.argv[i]
            i += 1
    
    # 设置缓存目录
    cache_dir = Path(__file__).parent.parent / 'cache'
    cache_dir.mkdir(exist_ok=True)
    
    # 输出文件保存到缓存目录
    if output_path:
        output_path = cache_dir / output_path
    else:
        output_path = cache_dir / f"bangumi_{subject_id}.pdf"
    
    # 从 stdin 读取 JSON 数据
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败：{e}", file=sys.stderr)
        sys.exit(1)
    
    if 'error' in data:
        print(f"❌ {data['error']}", file=sys.stderr)
        sys.exit(1)
    
    print(f"正在生成：{data.get('alt_text', '未知作品')}")
    
    # 加载并渲染模板
    template = load_template()
    html = render_template(template, data)
    
    # 保存 HTML
    cover_url = data.get('cover_url', '')
    html_path = save_html(html, output_path, cover_url)
    
    # 尝试转换为 PDF
    if str(output_path).endswith('.pdf'):
        pdf_path = output_path
        if not html_to_pdf(html_path, pdf_path, zoom):
            # 转换失败，保留 HTML 文件
            print(f"\n✅ 最终文件：{html_path}")
    
    print(f"\n✅ 生成完成！")


if __name__ == "__main__":
    main()
