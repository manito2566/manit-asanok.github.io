"""
generate_cv.py — Build academic CV PDF for Dr. Manit Asanok
from data/profile.json + data/publications.json using reportlab.

Run from anywhere:  python scripts/generate_cv.py
Output:             assets/docs/CV_Manit_Asanok.pdf
"""

import json
import os
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, HRFlowable, PageBreak,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ---------- Paths ----------
ROOT = Path(__file__).resolve().parents[1]   # .../portfolio-website
DATA_DIR = ROOT / "data"
OUT_PATH = ROOT / "assets" / "docs" / "CV_Manit_Asanok.pdf"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)


# ---------- Colors ----------
NAVY = HexColor("#1a3a6e")
NAVY_DARK = HexColor("#0f2547")
GOLD = HexColor("#c9a227")
INK = HexColor("#1f2937")
MUTED = HexColor("#6b7280")
RULE = HexColor("#d1d5db")


# ---------- Register fonts that support Thai + Latin ----------
# Sarabun is the Thai government standard font (great for Thai academic docs).
# Fall back to Tahoma / Leelawadee UI, both of which support Thai on Windows.
def register_fonts():
    candidates = [
        ("Sarabun",      r"C:\Windows\Fonts\Sarabun-Regular.ttf"),
        ("LeelawadeeUI", r"C:\Windows\Fonts\LeelawUI.ttf"),
        ("Tahoma",       r"C:\Windows\Fonts\tahoma.ttf"),
        ("Calibri",      r"C:\Windows\Fonts\calibri.ttf"),
    ]
    candidates_bold = [
        ("Sarabun-Bold",      r"C:\Windows\Fonts\Sarabun-Bold.ttf"),
        ("LeelawadeeUI-Bold", r"C:\Windows\Fonts\LeelaUIb.ttf"),
        ("Tahoma-Bold",       r"C:\Windows\Fonts\tahomabd.ttf"),
        ("Calibri-Bold",      r"C:\Windows\Fonts\calibrib.ttf"),
    ]
    regular = bold = None
    for name, path in candidates:
        if os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                regular = name
                break
            except Exception:
                pass
    for name, path in candidates_bold:
        if os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                bold = name
                break
            except Exception:
                pass

    # Register italic + bold-italic (best-effort) to support <i> tags
    italics = [
        ("Sarabun-Italic",     r"C:\Windows\Fonts\Sarabun-Italic.ttf"),
        ("LeelawadeeUI-Italic", None),  # Leelawadee has no italic, fallback to regular
    ]
    bold_italics = [
        ("Sarabun-BoldItalic", r"C:\Windows\Fonts\Sarabun-BoldItalic.ttf"),
    ]
    italic = None
    bold_italic = None
    for name, path in italics:
        if path and os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                italic = name
                break
            except Exception:
                pass
    for name, path in bold_italics:
        if path and os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                bold_italic = name
                break
            except Exception:
                pass

    # Build a font family so <b>, <i>, <b><i> tags inside Paragraphs work
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    regular = regular or "Helvetica"
    bold = bold or "Helvetica-Bold"
    italic = italic or regular
    bold_italic = bold_italic or bold
    registerFontFamily(
        regular,
        normal=regular,
        bold=bold,
        italic=italic,
        boldItalic=bold_italic,
    )
    return regular, bold


BODY_FONT, BOLD_FONT = register_fonts()


# ---------- Styles ----------
ss = getSampleStyleSheet()

style_name = ParagraphStyle(
    "Name", fontName=BOLD_FONT, fontSize=22, leading=26,
    textColor=NAVY_DARK, spaceAfter=2,
)
style_position = ParagraphStyle(
    "Position", fontName=BODY_FONT, fontSize=11, leading=14,
    textColor=MUTED, spaceAfter=2,
)
style_contact = ParagraphStyle(
    "Contact", fontName=BODY_FONT, fontSize=9, leading=12,
    textColor=INK, spaceAfter=0,
)
style_h1 = ParagraphStyle(
    "H1", fontName=BOLD_FONT, fontSize=12, leading=16,
    textColor=NAVY, spaceBefore=10, spaceAfter=4,
)
style_h2 = ParagraphStyle(
    "H2", fontName=BOLD_FONT, fontSize=10, leading=13,
    textColor=NAVY_DARK, spaceBefore=6, spaceAfter=2,
)
style_body = ParagraphStyle(
    "Body", fontName=BODY_FONT, fontSize=9.5, leading=13,
    textColor=INK, alignment=TA_JUSTIFY, spaceAfter=2,
)
style_item = ParagraphStyle(
    "Item", fontName=BODY_FONT, fontSize=9, leading=12.5,
    textColor=INK, leftIndent=12, firstLineIndent=-12,
    alignment=TA_JUSTIFY, spaceAfter=2,
)
style_meta = ParagraphStyle(
    "Meta", fontName=BODY_FONT, fontSize=8.5, leading=11,
    textColor=MUTED,
)
style_year = ParagraphStyle(
    "Year", fontName=BOLD_FONT, fontSize=9, leading=12,
    textColor=GOLD, alignment=TA_RIGHT,
)


# ---------- Load data ----------
def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


profile = load_json(DATA_DIR / "profile.json")
pubs = load_json(DATA_DIR / "publications.json")


def pick_en(value, fallback=""):
    if value is None:
        return fallback
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("en") or value.get("th") or fallback
    return str(value)


# ---------- Document ----------
def build():
    doc = BaseDocTemplate(
        str(OUT_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Curriculum Vitae — Dr. Manit Asanok",
        author="Manit Asanok",
        subject="Academic CV",
    )
    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        id="main",
    )

    def on_page(canvas, doc):
        canvas.saveState()
        # Footer page number
        canvas.setFont(BODY_FONT, 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(
            A4[0] - 18 * mm, 10 * mm,
            f"Manit Asanok — CV — p. {doc.page}",
        )
        # Top accent rule
        canvas.setFillColor(NAVY)
        canvas.rect(0, A4[1] - 6 * mm, A4[0], 4, fill=1, stroke=0)
        canvas.setFillColor(GOLD)
        canvas.rect(0, A4[1] - 7 * mm, 60 * mm, 1.5, fill=1, stroke=0)
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

    story = []

    # ---------- Header ----------
    story.append(Paragraph(pick_en(profile["name"]), style_name))
    story.append(Paragraph(
        pick_en(profile["position"]) + " · " +
        pick_en(profile["department"]) + ", " +
        pick_en(profile["institution"]),
        style_position,
    ))

    contact_lines = []
    contact_lines.append(pick_en(profile["contact"]["address"]))
    contact_lines.append(f"Tel: {profile['contact']['phone']}")

    ids = profile["identifiers"]
    contact_lines.append(
        f"Scopus Author ID: {ids['scopusId']} &nbsp;·&nbsp; "
        f"ORCID iD: {ids['orcid']} &nbsp;·&nbsp; "
        f"AD Scientific Index: {ids['adScientificIndex']}"
    )

    for line in contact_lines:
        story.append(Paragraph(line, style_contact))

    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.75, color=RULE,
                            spaceBefore=2, spaceAfter=6))

    # ---------- Research Interests ----------
    story.append(Paragraph("RESEARCH INTERESTS", style_h1))
    keywords = " &nbsp;·&nbsp; ".join(profile["keywords"])
    story.append(Paragraph(keywords, style_body))
    story.append(Spacer(1, 2))

    # ---------- Profile / Bio ----------
    story.append(Paragraph("PROFILE", style_h1))
    bio_en = profile["bio"]["en"] if isinstance(profile["bio"], dict) else profile["bio"]
    for para in bio_en:
        story.append(Paragraph(para, style_body))

    # ---------- Education ----------
    story.append(Paragraph("EDUCATION", style_h1))
    edu_rows = []
    for e in profile["education"]:
        year = e.get("yearEn") or e.get("year")
        left = Paragraph(
            f"<b>{e['degree']}</b> — {pick_en(e['major'])}<br/>"
            f"<font color='#6b7280'>{pick_en(e['institution'])}</font>" +
            (f"<br/><i>Thesis: {pick_en(e['thesis'])}</i>" if e.get("thesis") else "") +
            (f"<br/><font color='#c9a227'>★ {pick_en(e['scholarship'])}</font>"
             if e.get("scholarship") else ""),
            style_body,
        )
        right = Paragraph(str(year), style_year)
        edu_rows.append([left, right])

    t = Table(edu_rows, colWidths=[140 * mm, 25 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t)

    # ---------- Academic Positions ----------
    story.append(Paragraph("ACADEMIC POSITIONS & EXPERIENCE", style_h1))
    pos_rows = []
    for p in reversed(profile["positions"]):
        year = p.get("yearEn") or p.get("year")
        left = Paragraph(
            f"<b>{pick_en(p['title'])}</b><br/>"
            f"<font color='#6b7280'>{pick_en(p['org'])}</font>",
            style_body,
        )
        right = Paragraph(str(year), style_year)
        pos_rows.append([left, right])
    t = Table(pos_rows, colWidths=[140 * mm, 25 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t)

    # ---------- Awards ----------
    story.append(Paragraph("AWARDS & SCHOLARSHIPS", style_h1))
    for a in profile["awards"]:
        year = a.get("yearEn") or a.get("year")
        bullet = f"<b>{year}</b> — {pick_en(a['title'])}"
        if a.get("by"):
            bullet += f" <font color='#6b7280'>({pick_en(a['by'])})</font>"
        story.append(Paragraph(bullet, style_item))

    # ---------- Training ----------
    story.append(Paragraph("PROFESSIONAL TRAINING", style_h1))
    for tr in profile["training"]:
        year = tr.get("yearEn") or tr.get("year")
        line = ""
        if year:
            line += f"<b>{year}</b> — "
        line += pick_en(tr["title"])
        if tr.get("by"):
            line += f" <font color='#6b7280'>({pick_en(tr['by'])})</font>"
        story.append(Paragraph(line, style_item))

    # ---------- Publications ----------
    story.append(Paragraph("PUBLICATIONS", style_h1))

    type_order = [
        ("international", "International Journals"),
        ("national",      "National Journals"),
        ("conference",    "Conference Proceedings"),
        ("academic",      "Academic Articles"),
        ("book",          "Books / Textbooks / Teaching Documents"),
    ]

    grouped = {t: [] for t, _ in type_order}
    for p in pubs:
        if p["type"] in grouped:
            grouped[p["type"]].append(p)
    # Sort each group newest first
    for k in grouped:
        grouped[k].sort(key=lambda x: x["year"], reverse=True)

    def apa(p, n):
        import urllib.parse
        authors = ", ".join(p.get("authors", []))
        year = p.get("year", "")
        title = pick_en(p.get("title", ""))
        venue = p.get("venue", "")
        vol = p.get("volume", "")
        iss = p.get("issue", "")
        pages = p.get("pages", "")
        doi = p.get("doi", "")
        url = p.get("url", "")

        cite = f"{n}. {authors} ({year}). {title}. <i>{venue}</i>"
        if vol:
            cite += f", {vol}"
        if iss:
            cite += f"({iss})"
        if pages:
            cite += f", {pages}"
        cite += "."
        if doi:
            cite += f' <link href="https://doi.org/{doi}"><font color="#1a3a6e">https://doi.org/{doi}</font></link>'
        elif url:
            cite += f' <link href="{url}"><font color="#1a3a6e">Link</font></link>'
        else:
            # Google Scholar search fallback
            q = urllib.parse.quote(f"{title} {' '.join(p.get('authors', [])[:2])}")
            cite += f' <link href="https://scholar.google.com/scholar?q={q}"><font color="#6b7280">[search]</font></link>'
        return cite

    for type_key, type_label in type_order:
        items = grouped[type_key]
        if not items:
            continue
        story.append(Paragraph(f"{type_label} ({len(items)})", style_h2))
        for i, p in enumerate(items, 1):
            story.append(Paragraph(apa(p, i), style_item))
        story.append(Spacer(1, 2))

    # ---------- Build ----------
    doc.build(story)
    return OUT_PATH


if __name__ == "__main__":
    out = build()
    size_kb = out.stat().st_size / 1024
    print(f"OK  Generated {out}  ({size_kb:.1f} KB)")
