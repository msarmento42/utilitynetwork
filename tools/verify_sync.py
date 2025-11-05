#!/usr/bin/env python3
import os, json, sys, difflib

ROOT = os.path.dirname(os.path.dirname(__file__))
CFG_PATH = os.path.join(ROOT, "config", "sites.json")
with open(CFG_PATH, encoding="utf-8") as f:
    cfg = json.load(f)

expected_links = [{"name": s["name"], "url": s["domain"]} for s in cfg["sites"]]

def normalize(lst):
    return sorted([{ "name": x["name"], "url": x["url"] } for x in lst], key=lambda d:(d["name"], d["url"]))

def read_network(site_dir):
    p = os.path.join(site_dir, "assets", "network.json")
    if not os.path.isfile(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)

sites_root = os.path.join(ROOT, "sites")
errors = []
for slug in sorted(os.listdir(sites_root)):
    site_dir = os.path.join(sites_root, slug)
    if not os.path.isdir(site_dir):
        continue
    actual = read_network(site_dir)
    if actual is None:
        errors.append(f"[{slug}] missing assets/network.json")
        continue
    exp_norm = json.dumps(normalize(expected_links), indent=2, sort_keys=True)
    act_norm = json.dumps(normalize(actual), indent=2, sort_keys=True)
    if exp_norm != act_norm:
        diff = "\n".join(difflib.unified_diff(exp_norm.splitlines(), act_norm.splitlines(), fromfile="expected", tofile="actual", lineterm=""))
        errors.append(f"[{slug}] network.json does not match config/sites.json\n{diff}")

if errors:
    print("❌ Network sync verification FAILED:\n")
    print("\n\n".join(errors))
    sys.exit(1)

print("✅ Network sync verification PASSED.")
