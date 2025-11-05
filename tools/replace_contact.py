#!/usr/bin/env python3
import os, sys, re, json, argparse
parser = argparse.ArgumentParser()
parser.add_argument("--domain")
parser.add_argument("--map")
args = parser.parse_args()

ROOT = os.path.dirname(os.path.dirname(__file__))
slug_to_domain = {}

if args.map:
    slug_to_domain = json.load(open(args.map))
elif args.domain:
    for name in os.listdir(os.path.join(ROOT, "sites")):
        slug_to_domain[name] = args.domain
else:
    print("Provide --domain or --map"); sys.exit(1)

EMAIL_RE = re.compile(r"contact@[^\\s<>\"]+")
for slug, domain in slug_to_domain.items():
    base = os.path.join(ROOT, "sites", slug)
    if not os.path.isdir(base): continue
    for root, _, files in os.walk(base):
        for fn in files:
            if fn.endswith(".html"):
                p = os.path.join(root, fn)
                html = open(p, encoding="utf-8").read()
                html = EMAIL_RE.sub(f"contact@{domain}", html)
                open(p, "w", encoding="utf-8").write(html)

print("Updated contact@ emails.")
