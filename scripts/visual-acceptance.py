# -*- coding: utf-8 -*-
"""Пиксельная приёмка: эталоны дизайн-кита против реализованных экранов."""
import json, os
from PIL import Image
import numpy as np

BASE = r"C:\Users\Pavel\Desktop\agencyai"
REF = os.path.join(BASE, "docs", "screenshots", "redesign-baseline")
APP = os.path.join(BASE, "docs", "screenshots", "redesign-stage-5")
OUT = os.path.join(BASE, "docs", "screenshots", "acceptance")
os.makedirs(OUT, exist_ok=True)

PAIRS = [("dashboard", "overview"), ("incidents", "incidents"), ("incident", "incident-detail"),
         ("timeline-gantt", "timeline-gantt"),
         ("chat", "chat"), ("model", "model")]
WIDTHS = ["1440", "390"]
ACCENTS = {"primary": (37, 99, 235), "ink": (23, 32, 51)}

def palette(im, n=6):
    small = im.convert("RGB").resize((160, 120))
    arr = np.array(small).reshape(-1, 3)
    q = (arr // 16).astype(np.int32)
    keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    uniq, counts = np.unique(keys, return_counts=True)
    order = np.argsort(-counts)[:n]
    total = keys.size
    res = []
    for i in order:
        k = int(uniq[i]); c = int(counts[i])
        r = (k // 10000) * 16 + 8; g = ((k // 100) % 100) * 16 + 8; b = (k % 100) * 16 + 8
        res.append({"hex": "#%02x%02x%02x" % (r, g, b), "share": round(c / total * 100, 1)})
    return res

def accent_share(im, rgb, tol=40):
    a = np.asarray(im.convert("RGB"), dtype=np.int16)
    d = np.abs(a - np.array(rgb, dtype=np.int16)).max(axis=2)
    return round(float((d <= tol).mean() * 100), 2)

rows = []
for app, ref in PAIRS:
    for w in WIDTHS:
        rp = os.path.join(REF, "ref-%s-%s.png" % (ref, w))
        ap = os.path.join(APP, "app-%s-%s.png" % (app, w))
        if not (os.path.exists(rp) and os.path.exists(ap)):
            rows.append({"screen": app, "width": w, "error": "no file"}); continue
        ri = Image.open(rp).convert("RGB"); ai = Image.open(ap).convert("RGB")
        side = Image.new("RGB", (ri.width + ai.width, max(ri.height, ai.height)), (255, 255, 255))
        side.paste(ri, (0, 0)); side.paste(ai, (ri.width, 0))
        side.save(os.path.join(OUT, "%s-%s-side.png" % (app, w)))
        cw, ch = min(ri.width, ai.width), min(ri.height, ai.height)
        ra = np.asarray(ri.crop((0, 0, cw, ch)), dtype=np.int16)
        aa = np.asarray(ai.crop((0, 0, cw, ch)), dtype=np.int16)
        d = np.abs(ra - aa)
        Image.fromarray(np.clip(d.max(axis=2) * 3, 0, 255).astype(np.uint8)).save(
            os.path.join(OUT, "%s-%s-diff.png" % (app, w)))
        rp_pal = palette(ri); ap_pal = palette(ai)
        rset = {p["hex"] for p in rp_pal}
        rows.append({
            "screen": app, "width": w,
            "ref_size": "%dx%d" % (ri.width, ri.height), "app_size": "%dx%d" % (ai.width, ai.height),
            "mae": round(float(d.mean()), 1), "pct_diff": round(float((d.max(axis=2) > 24).mean() * 100), 1),
            "primary_ref": accent_share(ri, ACCENTS["primary"]), "primary_app": accent_share(ai, ACCENTS["primary"]),
            "ink_ref": accent_share(ri, ACCENTS["ink"], 60), "ink_app": accent_share(ai, ACCENTS["ink"], 60),
            "pal_ref": rp_pal[:5], "pal_app": ap_pal[:5],
            "shared": sorted(rset & {p["hex"] for p in ap_pal}),
        })

with open(os.path.join(OUT, "metrics.json"), "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=1)

lines = []
lines.append("| Экран | Ширина | Эталон, px | Реализация, px | MAE | Пиксели с отличием | #2563eb эталон/реализация | Общие цвета палитры |")
lines.append("|---|---|---|---|---|---|---|---|")
for r in rows:
    if "error" in r:
        lines.append("| %s | %s | нет файла | | | | | |" % (r["screen"], r["width"])); continue
    lines.append("| %s | %s | %s | %s | %s | %s%% | %s%% / %s%% | %s |" % (
        r["screen"], r["width"], r["ref_size"], r["app_size"], r["mae"], r["pct_diff"],
        r["primary_ref"], r["primary_app"], ", ".join(r["shared"]) or "-"))
lines.append("")
lines.append("Топ-палитра эталона / реализации (первые 5):")
for r in rows:
    if "error" in r: continue
    rp = ", ".join("%s %s%%" % (p["hex"], p["share"]) for p in r["pal_ref"])
    ap = ", ".join("%s %s%%" % (p["hex"], p["share"]) for p in r["pal_app"])
    lines.append("- **%s / %s** — эталон: %s; реализация: %s" % (r["screen"], r["width"], rp, ap))
open(os.path.join(OUT, "report.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("rows:", len(rows))
print("report: docs/screenshots/acceptance/report.md")
for r in rows:
    if "error" not in r:
        print("%-15s %5s mae=%-5s diff=%-5s primary=%-5s/%s" % (r["screen"], r["width"], r["mae"], r["pct_diff"], r["primary_ref"], r["primary_app"]))
