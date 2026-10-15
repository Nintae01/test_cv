#!/usr/bin/env python3
"""
Bind VRM 1.0 expression presets to VRoid-style face blendshapes.

Blender's VRM add-on happily exports a model whose expression presets (blink, aa, happy,
...) have no morph-target binds, which means no blinking, no lip sync and no emotions in
any VRM app. If the face mesh still carries VRoid's `Fcl_*` shape keys, the fix is
mechanical: bind each preset to the matching shape key. This script does that on a copy
and leaves every preset that already has binds untouched.

    python3 scripts/vrm-bind-expressions.py in.vrm out.vrm

Edit the MAPPING table for faces with different shape-key names.
"""
import json
import struct
import sys

# VRM 1.0 preset -> VRoid shape key(s) with weights.
MAPPING: dict[str, list[tuple[str, float]]] = {
    "neutral": [("Fcl_ALL_Neutral", 1.0)],
    "happy": [("Fcl_ALL_Joy", 1.0)],
    "angry": [("Fcl_ALL_Angry", 1.0)],
    "sad": [("Fcl_ALL_Sorrow", 1.0)],
    "relaxed": [("Fcl_ALL_Fun", 1.0)],
    "surprised": [("Fcl_ALL_Surprised", 1.0)],
    "aa": [("Fcl_MTH_A", 1.0)],
    "ih": [("Fcl_MTH_I", 1.0)],
    "ou": [("Fcl_MTH_U", 1.0)],
    "ee": [("Fcl_MTH_E", 1.0)],
    "oh": [("Fcl_MTH_O", 1.0)],
    "blink": [("Fcl_EYE_Close", 1.0)],
    "blinkLeft": [("Fcl_EYE_Close_L", 1.0)],
    "blinkRight": [("Fcl_EYE_Close_R", 1.0)],
}
# Emotions should not fight with blinking and lip sync; "blend" lets them coexist.
EMOTIONS = {"happy", "angry", "sad", "relaxed", "surprised"}

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path: str):
    with open(path, "rb") as f:
        magic, version, _ = struct.unpack("<4sII", f.read(12))
        if magic != b"glTF" or version != 2:
            sys.exit(f"{path}: not a glTF 2 binary")
        chunks = []
        while True:
            head = f.read(8)
            if len(head) < 8:
                break
            length, ctype = struct.unpack("<II", head)
            chunks.append((ctype, f.read(length)))
    return chunks


def write_glb(path: str, gltf: dict, chunks) -> None:
    body = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    body += b" " * (-len(body) % 4)
    out = [(JSON_CHUNK, body)] + [(t, d) for t, d in chunks if t != JSON_CHUNK]
    total = 12 + sum(8 + len(d) for _, d in out)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        for ctype, data in out:
            f.write(struct.pack("<II", len(data), ctype))
            f.write(data)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    chunks = read_glb(src)
    gltf = json.loads(next(d for t, d in chunks if t == JSON_CHUNK))

    vrm = gltf.get("extensions", {}).get("VRMC_vrm")
    if not vrm:
        sys.exit("not a VRM 1.0 file (no VRMC_vrm extension); VRM 0.x is not handled")

    # Every (node, mesh) whose mesh has named morph targets.
    targets: dict[str, tuple[int, int]] = {}  # shape key -> (node index, target index)
    for node_index, node in enumerate(gltf.get("nodes", [])):
        if "mesh" not in node:
            continue
        mesh = gltf["meshes"][node["mesh"]]
        names = (mesh.get("extras") or {}).get("targetNames") or []
        for prim in mesh.get("primitives", []):
            names = (prim.get("extras") or {}).get("targetNames") or names
        for target_index, name in enumerate(names):
            targets.setdefault(name, (node_index, target_index))

    presets = vrm.setdefault("expressions", {}).setdefault("preset", {})
    bound, skipped, missing = [], [], []
    for preset, keys in MAPPING.items():
        entry = presets.setdefault(preset, {"isBinary": False, "overrideBlink": "none", "overrideLookAt": "none", "overrideMouth": "none"})
        if entry.get("morphTargetBinds") or entry.get("materialColorBinds") or entry.get("textureTransformBinds"):
            skipped.append(preset)
            continue
        binds = []
        for key, weight in keys:
            if key in targets:
                node_index, target_index = targets[key]
                binds.append({"node": node_index, "index": target_index, "weight": weight})
        if not binds:
            missing.append(preset)
            continue
        entry["morphTargetBinds"] = binds
        entry["isBinary"] = preset.startswith("blink")
        if preset in EMOTIONS:
            entry["overrideBlink"] = "blend"
            entry["overrideMouth"] = "blend"
        bound.append(preset)

    write_glb(dst, gltf, chunks)
    print(f"bound: {', '.join(bound) or 'nothing'}")
    if skipped:
        print(f"already bound, left alone: {', '.join(skipped)}")
    if missing:
        print(f"no matching shape key for: {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
