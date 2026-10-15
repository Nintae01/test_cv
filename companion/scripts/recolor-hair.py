#!/usr/bin/env python3
"""
Recolor regions of a Live2D texture atlas while keeping the original shading.

Live2D textures are atlases: every body part sits somewhere in a big PNG. This takes
rectangles of the atlas (the hair pieces, typically), replaces their hue and saturation,
and keeps brightness, so highlights and shadows survive. Everything else is copied as is.

    python3 scripts/recolor-hair.py SRC_MODEL_DIR OUT_MODEL_DIR --hue 352 --sat 215 \
        --region texture_00.png:735,25,1155,420 --region texture_01.png:1690,1560,2048,2048

Regions are x0,y0,x1,y1 in pixels of the original texture. Find them by opening the
texture PNGs under <model>/<Name>.2048/ and boxing the hair parts. A box selects whole
atlas pieces (connected blobs of non-transparent pixels), and only pieces that lie at
least 90% inside the box, so a neighbouring part that pokes into the box is left alone.

Haru (Cubism SDK sample) hair regions, for reference:
    texture_00.png: 735,25,1155,420   (bangs)
    texture_00.png: 650,400,1210,1060 (back of the head)
    texture_00.png: 650,1000,835,1345 (left side lock)
    texture_00.png: 1040,1000,1205,1335 (right side lock)
    texture_01.png: 1690,1560,2048,2048 (tail)

Check the license of the model you recolor. Live2D's sample models are free for
personal use but have their own terms for redistribution.
"""
import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def label_pieces(opaque: np.ndarray, scale: int = 4) -> np.ndarray:
    """Connected-component labels of the non-transparent pixels, computed at 1/scale resolution."""
    h, w = opaque.shape
    hs, ws = h // scale, w // scale
    small = opaque[: hs * scale, : ws * scale].reshape(hs, scale, ws, scale).any(axis=(1, 3))
    labels = np.zeros((hs, ws), dtype=np.int32)
    current = 0
    for sy in range(hs):
        for sx in range(ws):
            if not small[sy, sx] or labels[sy, sx]:
                continue
            current += 1
            stack = [(sy, sx)]
            labels[sy, sx] = current
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < hs and 0 <= nx < ws and small[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = current
                        stack.append((ny, nx))
    full = np.repeat(np.repeat(labels, scale, axis=0), scale, axis=1)
    out = np.zeros((h, w), dtype=np.int32)
    out[: full.shape[0], : full.shape[1]] = full
    return out


def select_pieces(opaque: np.ndarray, boxes, min_inside: float = 0.9) -> np.ndarray:
    """Mask of the atlas pieces that lie (almost) entirely inside one of the boxes."""
    labels = label_pieces(opaque)
    totals = np.bincount(labels.ravel())
    chosen: set[int] = set()
    for x0, y0, x1, y1 in boxes:
        inside = np.bincount(labels[y0:y1, x0:x1].ravel(), minlength=len(totals))
        for piece in np.nonzero(inside)[0]:
            if piece and inside[piece] / totals[piece] >= min_inside:
                chosen.add(int(piece))
    return np.isin(labels, list(chosen)) & opaque


def recolor(img: Image.Image, boxes, hue_deg: float, sat: int, value_gain: float, dark_sat: int) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    rgb = Image.fromarray(rgba[:, :, :3], "RGB")
    hsv = np.array(rgb.convert("HSV")).astype(np.int32)
    alpha = rgba[:, :, 3]

    mask = select_pieces(alpha > 0, boxes)

    h = hsv[:, :, 0]
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]
    hue = int(round(hue_deg / 360 * 255))
    h[mask] = hue
    # Dark outlines stay nearly black; everything else gets the full colour.
    s[mask] = np.where(v[mask] < 60, dark_sat, sat)
    v[mask] = np.clip(v[mask] * value_gain, 0, 255)

    out = Image.fromarray(np.clip(hsv, 0, 255).astype(np.uint8), "HSV").convert("RGB")
    result = np.dstack([np.array(out), alpha])
    return Image.fromarray(result, "RGBA")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--hue", type=float, default=352, help="target hue in degrees (352 = scarlet)")
    ap.add_argument("--sat", type=int, default=215, help="saturation 0-255 for lit pixels")
    ap.add_argument("--dark-sat", type=int, default=110, help="saturation for near-black outline pixels")
    ap.add_argument("--value-gain", type=float, default=1.06, help="brightness multiplier")
    ap.add_argument("--region", action="append", default=[], help="texture.png:x0,y0,x1,y1 (repeatable)")
    args = ap.parse_args()

    if not args.region:
        ap.error("at least one --region is required")

    regions: dict[str, list[tuple[int, int, int, int]]] = {}
    for spec in args.region:
        name, _, coords = spec.partition(":")
        x0, y0, x1, y1 = (int(c) for c in coords.split(","))
        regions.setdefault(name, []).append((x0, y0, x1, y1))

    if args.out.exists():
        shutil.rmtree(args.out)
    shutil.copytree(args.src, args.out)

    textures = {p.name: p for p in args.out.rglob("*.png")}
    for name, boxes in regions.items():
        if name not in textures:
            print(f"no texture named {name} under {args.src}", file=sys.stderr)
            return 1
        path = textures[name]
        img = recolor(Image.open(path), boxes, args.hue, args.sat, args.value_gain, args.dark_sat)
        img.save(path)
        print(f"recolored {path.relative_to(args.out)} in {len(boxes)} region(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
