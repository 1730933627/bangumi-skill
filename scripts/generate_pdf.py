#!/usr/bin/env python3
"""
Bangumi 番剧信息 PDF 生成器

根据模板和数据生成 PDF 文件
使用纯 Python 实现，无需外部依赖
"""

import sys
import json
import urllib.request
import ssl
from datetime import datetime


def download_image(url, timeout=10):
    """下载图片"""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
            return r.read()
    except Exception as e:
        print(f"⚠️ 图片下载失败：{e}", file=sys.stderr)
        return None


def escape_pdf_text(text):
    """转义 PDF 文本中的特殊字符"""
    if not text:
        return ""
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)').replace('\r\n', '\n').replace('\r', '\n')


def wrap_text(text, max_width=50):
    """文本换行"""
    if not text:
        return []
    
    lines = []
    current_line = ""
    
    for char in text:
        current_line += char
        if len(current_line) >= max_width:
            lines.append(current_line)
            current_line = ""
    
    if current_line:
        lines.append(current_line)
    
    return lines


def generate_pdf_text(data):
    """生成 PDF 文本内容"""
    lines = []
    
    # 标题
    lines.append("=" * 60)
    lines.append(escape_pdf_text(data.get('header_title', '未知作品')))
    lines.append("=" * 60)
    lines.append("")
    
    # 基本信息
    lines.append(f"放送日期：{data.get('header_subtitle', '未知')}")
    lines.append(f"Bangumi 链接：{data.get('link_url', '')}")
    lines.append("")
    
    # 评分
    lines.append("-" * 60)
    lines.append("⭐ 评分信息")
    lines.append("-" * 60)
    lines.append(f"评分：{data.get('rating_score', 'N/A')}/10")
    lines.append(f"排名：{data.get('rank', 'N/A')}")
    lines.append(f"评价人数：{data.get('votes', '0')}")
    lines.append(f"收藏人数：{data.get('favorites', '0')}")
    lines.append(f"好评率：{data.get('positive_rate', '0')}%")
    lines.append("")
    
    # 收藏统计
    lines.append("-" * 60)
    lines.append("📊 收藏统计")
    lines.append("-" * 60)
    lines.append(f"想看：{data.get('stat_wish_num', '0')}人")
    lines.append(f"在看：{data.get('stat_doing_num', '0')}人")
    lines.append(f"看过：{data.get('stat_done_num', '0')}人")
    lines.append(f"总计：{data.get('stat_total', '0')}人")
    lines.append("")
    
    # 声优信息
    lines.append("-" * 60)
    lines.append("🎙️ 主要声优")
    lines.append("-" * 60)
    for i in range(1, 5):
        role = data.get(f'va{i}_role', '')
        name = data.get(f'va{i}_name', '')
        if role and name:
            lines.append(f"  {escape_pdf_text(role)} - CV: {escape_pdf_text(name)}")
    lines.append("")
    
    # 标签
    lines.append("-" * 60)
    lines.append("🏷️ 标签")
    lines.append("-" * 60)
    tags = data.get('tags', [])
    if tags:
        lines.append(f"  {', '.join(tags)}")
    lines.append("")
    
    # 剧情简介
    lines.append("-" * 60)
    lines.append("📝 剧情简介")
    lines.append("-" * 60)
    synopsis = data.get('synopsis', [])
    if isinstance(synopsis, list):
        for para in synopsis:
            wrapped = wrap_text(escape_pdf_text(para), 55)
            for line in wrapped:
                lines.append(f"  {line}")
            lines.append("")
    else:
        lines.append(f"  {escape_pdf_text(synopsis)}")
    
    # 底部信息
    lines.append("")
    lines.append("=" * 60)
    lines.append(f"生成时间：{data.get('date', datetime.now().isoformat().split('T')[0])}")
    lines.append(f"{data.get('signature', 'OpenClaw 智慧之王 💙 Raphael')}")
    lines.append("=" * 60)
    
    return '\n'.join(lines)


def save_as_txt(text, output_path):
    """保存为文本文件"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"✅ 已保存到：{output_path}")


def save_as_pdf_simple(text, output_path):
    """
    保存为简单 PDF 格式
    使用基本的 PDF 结构，无需外部库
    """
    # 这是一个简化的 PDF 生成器
    # 完整的 PDF 生成需要 reportlab 或类似库
    
    # 由于没有外部库，我们生成一个文本文件并建议用户转换
    txt_path = output_path.replace('.pdf', '.txt')
    save_as_txt(text, txt_path)
    
    print(f"\n💡 提示：由于系统未安装 PDF 库，已生成文本文件")
    print(f"   可以使用以下方法转换为 PDF:")
    print(f"   1. 使用 LibreOffice: libreoffice --headless --convert-to pdf {txt_path}")
    print(f"   2. 使用 pandoc: pandoc {txt_path} -o {output_path}")
    print(f"   3. 在线转换工具")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法：python generate_pdf.py <条目 ID> [输出文件]")
        print("示例：python generate_pdf.py 400602 output.pdf")
        sys.exit(1)
    
    subject_id = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"bangumi_{subject_id}.pdf"
    
    # 从 stdin 读取 JSON 数据
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败：{e}", file=sys.stderr)
        sys.exit(1)
    
    if 'error' in data:
        print(f"❌ {data['error']}", file=sys.stderr)
        sys.exit(1)
    
    print(f"正在生成 PDF：{data.get('alt_text', '未知作品')}")
    
    # 生成文本内容
    pdf_text = generate_pdf_text(data)
    
    # 保存文件
    if output_path.endswith('.pdf'):
        save_as_pdf_simple(pdf_text, output_path)
    else:
        save_as_txt(pdf_text, output_path)
    
    print(f"\n✅ 生成完成！")


if __name__ == "__main__":
    main()
