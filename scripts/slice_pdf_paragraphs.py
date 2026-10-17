#!/usr/bin/env python3
"""
PDF 双语段落切片生成工具 (PDF Bilingual Paragraph Slicer)
基于原版英文 PDF 与 pdf2zh 翻译的中文单语 PDF，按段落起始坐标对齐并裁切为成对的高清切片。
"""

import os
import sys
import json
import argparse
import fitz  # PyMuPDF


def slice_page_paragraphs(page_en, page_zh, page_num, out_dir, dpi=150):
    """
    对单页进行双语段落识别与切片
    返回该页段落元数据列表
    """
    w = page_zh.rect.width
    h = page_zh.rect.height

    # 提取中文单语版文本块（过滤页眉页脚）
    raw_zh = page_zh.get_text("blocks")
    body_zh = [b for b in raw_zh if b[4].strip() and 42 < b[1] < h - 35]
    body_zh.sort(key=lambda b: b[1])

    if not body_zh:
        return []

    # 提取英文文本坐标
    raw_en = page_en.get_text("blocks")
    body_en = [b for b in raw_en if b[4].strip() and 42 < b[1] < h - 35]
    body_en.sort(key=lambda b: b[1])

    pairs = []
    pad_y = 5

    for idx, zb in enumerate(body_zh):
        zh_y0 = zb[1]
        zh_y1 = zb[3]
        next_y0 = body_zh[idx + 1][1] if idx + 1 < len(body_zh) else h - 35

        # 在英文页对应纵向区间内寻找文本
        en_rect = fitz.Rect(35, max(40, zh_y0 - 8), w - 35, next_y0 - 3)
        en_words = page_en.get_text("words", clip=en_rect)
        if en_words:
            en_y0 = min(wd[1] for wd in en_words)
            en_y1 = max(wd[3] for wd in en_words)
        else:
            en_y0 = zh_y0
            en_y1 = zh_y1

        # 段落开始位置严格对齐
        aligned_y0 = min(zh_y0, en_y0)

        # 裁切英文切片（从 aligned_y0 到 en_y1）
        clip_en = fitz.Rect(35, max(0, aligned_y0 - pad_y), w - 35, min(h, en_y1 + pad_y))
        pix_en = page_en.get_pixmap(clip=clip_en, dpi=dpi)
        en_filename = f"p{page_num}_s{idx + 1}_en.png"
        pix_en.save(os.path.join(out_dir, en_filename))

        # 裁切中文切片（从 aligned_y0 到 zh_y1）
        clip_zh = fitz.Rect(35, max(0, aligned_y0 - pad_y), w - 35, min(h, zh_y1 + pad_y))
        pix_zh = page_zh.get_pixmap(clip=clip_zh, dpi=dpi)
        zh_filename = f"p{page_num}_s{idx + 1}_zh.png"
        pix_zh.save(os.path.join(out_dir, zh_filename))

        pairs.append({
            "page": page_num,
            "section": idx + 1,
            "startY": round(aligned_y0, 1),
            "en": {
                "file": en_filename,
                "endY": round(en_y1, 1),
                "height": pix_en.height,
                "width": pix_en.width,
                "text": " ".join(wd[4] for wd in en_words[:12]) if en_words else ""
            },
            "zh": {
                "file": zh_filename,
                "endY": round(zh_y1, 1),
                "height": pix_zh.height,
                "width": pix_zh.width,
                "text": zb[4].strip().replace("\n", " ")[:30]
            }
        })

    return pairs


def main():
    parser = argparse.ArgumentParser(description="PDF 双语段落切片工具")
    parser.add_argument("--en", required=True, help="英文原版 PDF 路径")
    parser.add_argument("--zh", required=True, help="中文单语翻译版 PDF 路径")
    parser.add_argument("--out", default="output_slices", help="切片输出目录")
    parser.add_argument("--start", type=int, default=1, help="起始页码（1-based）")
    parser.add_argument("--end", type=int, default=5, help="结束页码（1-based）")
    parser.add_argument("--dpi", type=int, default=150, help="输出分辨率（DPI）")

    args = parser.parse_args()

    if not os.path.exists(args.en) or not os.path.exists(args.zh):
        print(f"错误: 找不到输入 PDF 文件: {args.en} 或 {args.zh}")
        sys.exit(1)

    os.makedirs(args.out, exist_ok=True)

    doc_en = fitz.open(args.en)
    doc_zh = fitz.open(args.zh)

    all_pairs = []
    print(f"开始处理第 {args.start} 到 {args.end} 页...")

    for p in range(args.start - 1, min(args.end, len(doc_en), len(doc_zh))):
        page_num = p + 1
        pairs = slice_page_paragraphs(doc_en[p], doc_zh[p], page_num, args.out, dpi=args.dpi)
        all_pairs.extend(pairs)
        print(f"  第 {page_num} 页: 成功切出 {len(pairs)} 个中英段落对")

    manifest_path = os.path.join(args.out, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(all_pairs, f, ensure_ascii=False, indent=2)

    print(f"处理完成，共生成 {len(all_pairs)} 个中英对照段落对。清单已保存至: {manifest_path}")


if __name__ == "__main__":
    main()
