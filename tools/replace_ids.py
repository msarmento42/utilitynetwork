#!/usr/bin/env python3
import os, sys, argparse, re
parser = argparse.ArgumentParser()
parser.add_argument("--ga4", required=True)
parser.add_argument("--adsense", required=True)  # e.g., ca-pub-XXXX
args = parser.parse_args()
ROOT = os.path.dirname(os.path.dirname(__file__))

def update_html(path):
    html = open(path, encoding="utf-8").read()
    html = re.sub(r"(gtag\('config',\s*')[A-Z0-9-]+('\)\);)", rf"\1{args.ga4}\2", html)
    html = re.sub(r'(<meta name="google-adsense-account" content=")ca-pub-[0-9]+(")', rf"\1{args.adsense}\2", html)
    html = re.sub(r'(pagead\/js\?client=)ca-pub-[0-9]+', rf"\1{args.adsense}", html)
    open(path, "w", encoding="utf-8").write(html)

for root, _, files in os.walk(ROOT):
    for fn in files:
        if fn.endswith(".html"):
            update_html(os.path.join(root, fn))

print("Replaced GA4 and AdSense IDs.")
