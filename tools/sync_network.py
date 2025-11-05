#!/usr/bin/env python3
import os, json, sys, re, subprocess
ROOT = os.path.dirname(os.path.dirname(__file__))
CFG = json.load(open(os.path.join(ROOT, "config", "sites.json")))

def write_network(site_dir, links):
    assets = os.path.join(site_dir, "assets")
    os.makedirs(assets, exist_ok=True)
    with open(os.path.join(assets, "network.json"), "w") as f:
        json.dump(links, f, indent=2)

def patch_sitemap_robots(site_dir, domain):
    sm = os.path.join(site_dir, "sitemap.xml")
    rb = os.path.join(site_dir, "robots.txt")
    if os.path.isfile(sm):
        txt = open(sm, encoding="utf-8").read()
        txt = re.sub(r"https://example\.com", domain.rstrip("/"), txt)
        open(sm, "w", encoding="utf-8").write(txt)
    if os.path.isfile(rb):
        lines = []
        for line in open(rb, encoding="utf-8"):
            if line.lower().startswith("sitemap: "):
                lines.append(f"Sitemap: {domain.rstrip('/')}/sitemap.xml\n")
            else:
                lines.append(line)
        open(rb, "w", encoding="utf-8").write("".join(lines))

def find_sites():
    sites_root = os.path.join(ROOT, "sites")
    for name in os.listdir(sites_root):
        p = os.path.join(sites_root, name)
        if os.path.isdir(p):
            yield name, p

links = [{"name": s["name"], "url": s["domain"]} for s in CFG["sites"]]

for slug, path in find_sites():
    write_network(path, links)
    domain = next((s["domain"] for s in CFG["sites"] if s["slug"] == slug), "https://example.com")
    patch_sitemap_robots(path, domain)

print("Synced network.json and sitemap/robots.")
