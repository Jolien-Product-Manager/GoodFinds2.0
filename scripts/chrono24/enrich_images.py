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

from chrono24_timex import extract_gender_label, extract_images, fetch_html

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


def needs_gender_enrichment(listing: dict[str, Any]) -> bool:
    return not listing.get("gender_label")


def enrich_listing(
    listing: dict[str, Any],
    session: requests.Session,
    use_flaresolverr: bool,
    *,
    fetch_gender: bool = True,
) -> dict[str, Any]:
    needs_images = needs_enrichment(listing)
    needs_gender = fetch_gender and needs_gender_enrichment(listing)
    if not needs_images and not needs_gender:
        return listing

    url = listing.get("url")
    if not url:
        return listing

    try:
        html = fetch_listing_html(url, session, use_flaresolverr)
    except Exception as exc:
        print(f"  {listing.get('listing_id')}: fetch failed — {exc}", file=sys.stderr)
        return listing

    if needs_gender:
        gender_label = extract_gender_label(html)
        if gender_label:
            listing["gender_label"] = gender_label
            print(f"  {listing.get('listing_id')}: gender={gender_label!r}")

    if not needs_images:
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
    parser.add_argument(
        "--gender-only",
        action="store_true",
        help="Fetch Chrono24 gender labels for listings missing gender_label",
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
    if args.gender_only:
        to_enrich = [l for l in listings if needs_gender_enrichment(l)]
        if not to_enrich:
            print("All listings already have gender_label.")
            return
    else:
        to_enrich = [
            l
            for l in listings
            if needs_enrichment(l) or needs_gender_enrichment(l)
        ]
        if not to_enrich:
            print("All listings already have Chrono24 images and gender labels.")
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
        if listing not in to_enrich:
            continue
        before_image = listing.get("image_url")
        before_gender = listing.get("gender_label")
        enrich_listing(
            listing,
            session,
            use_flaresolverr,
            fetch_gender=not args.gender_only or needs_gender_enrichment(listing),
        )
        if (
            listing.get("image_url") != before_image
            or listing.get("gender_label") != before_gender
        ):
            enriched_count += 1
        time.sleep(1.5)

    data["listings"] = listings
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Updated {enriched_count} listing(s) → {output_path}")


if __name__ == "__main__":
    main()
