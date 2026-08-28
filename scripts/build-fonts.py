#!/usr/bin/env python3
"""SUIT Variable 웹폰트를 2단으로 서브셋한다.

  core : 사이트가 실제로 쓰는 글자만 (첫 화면 전용, preload 대상)
  full : KS X 1001 상용 한글 2350자 (관리자가 새 문구를 넣었을 때만 내려받음)

CSS 의 font-family 는 "SUIT Core", "SUIT Full" 순서로 두므로,
core 에 없는 글자가 나오면 브라우저가 그때만 full 을 받아온다.

    pip install fonttools brotli
    python3 scripts/build-fonts.py
"""
import json
import glob, html, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "font-source/SUIT-Variable.woff2")
LATIN = [chr(c) for c in range(0x20, 0x7F)]
PUNCT = list("·--…‘’“”※→←↑↓↗↘✓✕◷●○■□★☆₩€$¥°±×÷≠　")


def site_characters():
    """화면에 나올 수 있는 모든 글자를 모은다.

    HTML 본문뿐 아니라 CSS 의 content: 값과 app.js 안의 문자열(복사 완료 등
    실행 중 DOM 에 삽입되는 문구)까지 포함해야 core 만으로 첫 화면이 완결된다.
    """
    chars = set()
    for path in glob.glob(os.path.join(ROOT, "dist/**/*.html"), recursive=True):
        text = open(path, encoding="utf-8").read()
        # 태그를 걷어내면 placeholder / aria-label / title 같은 속성 문구가 빠진다.
        # 이 값들도 화면에 노출되므로 파일 전체 문자를 그대로 포함한다.
        chars |= set(html.unescape(text))

    css = open(os.path.join(ROOT, "src/styles.css"), encoding="utf-8").read()
    for value in re.findall(r"content:\s*([\'\"])(.*?)\1", css):
        chars |= set(value[1])

    js = open(os.path.join(ROOT, "src/app.js"), encoding="utf-8").read()
    for value in re.findall(r"([\'\"`])((?:[^\\]|\\.)*?)\1", js):
        chars |= set(value[1])

    chars |= set(open(os.path.join(ROOT, "data/site.json"), encoding="utf-8").read())
    return {c for c in chars if ord(c) >= 0x20}


def ks_x_1001():
    out = []
    for code in range(0xAC00, 0xD7A4):
        ch = chr(code)
        try:
            ch.encode("iso2022_kr")
            out.append(ch)
        except Exception:
            pass
    return out


def write_subset(text, target):
    font = TTFont(SRC)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(target)
    return os.path.getsize(target)


if not os.path.exists(SRC):
    sys.exit(f"원본 폰트가 없습니다: {SRC}")

jamo = [chr(c) for c in range(0x3131, 0x3164)]
core_text = "".join(sorted(site_characters() | set(LATIN) | set(PUNCT)))
full_text = "".join(sorted(set(ks_x_1001()) | set(jamo) | set(LATIN) | set(PUNCT)))

core = write_subset(core_text, os.path.join(ROOT, "src/assets/SUIT-core.woff2"))

# core 가 실제로 담은 글자를 기록해 둔다.
# SUIT 에 없는 글자(em dash, en dash 등)를 화면에 쓰면 브라우저가 그 한 글자
# 때문에 508KB 전체 폰트를 받아 버린다. 실제로 두 번 겪었고 눈에 보이지 않아서
# 알아채기 어렵다. audit-links.mjs 가 이 목록으로 매 빌드마다 검사한다.
from fontTools.ttLib import TTFont as _TTF
_covered = set()
for _tbl in _TTF(os.path.join(ROOT, "src/assets/SUIT-core.woff2"))["cmap"].tables:
    _covered |= set(_tbl.cmap.keys())
with open(os.path.join(ROOT, "scripts/font-coverage.json"), "w", encoding="utf8") as _fh:
    json.dump(sorted(_covered), _fh)
full = write_subset(full_text, os.path.join(ROOT, "src/assets/SUIT-full.woff2"))
print(f"core {core/1024:.0f}KB / full {full/1024:.0f}KB (원본 {os.path.getsize(SRC)/1024:.0f}KB)")
