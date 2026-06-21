#!/usr/bin/env python3
"""Fetch real Chrono24 listing images via FlareSolverr and update the JSON snapshot."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from typing import Any

import requests

from chrono24_timex import extract_images, fetch_html

PLACEHOLDER_RE = re.compile(r"picsum\.photos|sample-", re.I)


def needs_enrichment(listing: dict[str, Any]) -> bool:
    image_url = listing.get("image_url") or ""
    if not image_url:
        return True
    if PLACEHOLDER_RE.search(image_url):
        return True
    return "chrono24.com" not in image_url


def fetch_listing_html(url: str, session: requests.Session, use_flaresolverr: bool) -> str:
    return fetch_html(url, session, use_flaresolverr)


def enrich_listing(
    listing: dict[str, Any],
    session: requests.Session,
    use_flaresolverr: bool,
) -> dict[str, Any]:
    if not needs_enrichment(listing):
        return listing

    url = listing.get("url")
    if not url:
        return listing

    try:
        html = fetch_listing_html(url, session, use_flaresolverr)
    except Exception as exc:
        print(f"  {listing.get('listing_id')}: fetch failed — {exc}", file=sys.stderr)
        return listing

    images = extract_images(html)
    if not images:
        print(f"  {listing.get('listing_id')}: no images found in page", file=sys.stderr)
        return listing

    listing["image_url"] = images[0]
    listing["image_urls"] = images
    print(f"  {listing.get('listing_id')}: {len(images)} image(s)")
    return listing


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich Chrono24 JSON with real listing images")
    parser.add_argument(
        "--in",
        dest="input_path",
        default="../../data/chrono24/vintage_timex.json",
        help="Input JSON snapshot",
    )
    parser.add_argument(
        "--out",
        dest="output_path",
        default=None,
        help="Output path (defaults to --in)",
    )
    parser.add_argument(
        "--no-flaresolverr",
        action="store_true",
        help="Fetch directly without FlareSolverr (usually blocked by Cloudflare)",
    )
    args = parser.parse_args()

    input_path = os.path.abspath(os.path.join(os.path.dirname(__file__), args.input_path))
    output_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), args.output_path or args.input_path)
    )

    if not os.path.exists(input_path):
        print(f"Missing {input_path}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, encoding="utf-8") as f:
        data = json.load(f)

    listings: list[dict[str, Any]] = data.get("listings", [])
    to_enrich = [l for l in listings if needs_enrichment(l)]
    if not to_enrich:
        print("All listings already have Chrono24 images.")
        return

    use_flaresolverr = not args.no_flaresolverr and bool(
        os.environ.get("FLARESOLVERR_URL", "http://localhost:8191/v1")
    )
    if not use_flaresolverr:
        print(
            "Warning: FlareSolverr not configured — direct requests are usually blocked.",
            file=sys.stderr,
        )

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (compatible; GoodFindsScraper/1.0)",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    print(f"Enriching {len(to_enrich)} listing(s)…")
    enriched_count = 0
    for listing in listings:
        if not needs_enrichment(listing):
            continue
        before = listing.get("image_url")
        enrich_listing(listing, session, use_flaresolverr)
        if listing.get("image_url") != before and not needs_enrichment(listing):
            enriched_count += 1
        time.sleep(1.5)

    data["listings"] = listings
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Updated {enriched_count} listing(s) → {output_path}")


if __name__ == "__main__":
    main()
