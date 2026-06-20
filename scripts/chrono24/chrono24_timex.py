#!/usr/bin/env python3
"""Chrono24 Timex scraper — offline snapshot for Sleeper."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
from dataclasses import asdict, dataclass
from typing import Any

import requests

VINTAGE_QUERIES = [
    "vintage Timex",
    "Timex Marlin",
    "Timex Viscount",
    "Timex Mercury",
    "Timex Sprite",
    "Timex Electric",
    "Timex Automatic",
    "Timex mechanical",
    "Timex 1970s",
    "Timex 1960s",
]

DEFAULT_QUERY = "Timex"
YEAR_RE = re.compile(r"\b(19[2-9]\d|20[0-2]\d)\b")
ARTICLE_BLOCK_RE = re.compile(
    r'data-article-id="(\d+)"(.*?)(?=data-article-id="|$)',
    re.DOTALL,
)
LISTING_LINK_RE = re.compile(r'href="(/[^"]*--id(\d+)\.htm)"')
TITLE_RE = re.compile(r'class="text-bold[^"]*"[^>]*>([^<]+)</')
PRICE_RE = re.compile(r'class="text-bold[^"]*"[^>]*>\s*\$?([\d,]+(?:\.\d{2})?)')
IMAGE_RE = re.compile(r'data-src="(https://[^"]+chrono24[^"]+)"')


def canonicalize_chrono24_url(listing_id: str, url: str | None = None) -> str:
    lid = listing_id.strip()
    if url:
        match = re.search(r"--id(\d+)\.htm", url)
        if match and match.group(1) == lid:
            path = url if url.startswith("/") else re.sub(r"^https?://[^/]+", "", url)
            return f"https://www.chrono24.com{path.split('?', 1)[0]}"
    return f"https://www.chrono24.com/timex/timex--id{lid}.htm"


def parse_article_block(block: str, listing_id: str) -> dict[str, Any]:
    title_match = TITLE_RE.search(block)
    price_match = PRICE_RE.search(block)
    image_match = IMAGE_RE.search(block)
    image_urls = list(dict.fromkeys(IMAGE_RE.findall(block)))[:3]

    url = None
    for link_match in LISTING_LINK_RE.finditer(block):
        path, link_id = link_match.group(1), link_match.group(2)
        if link_id == listing_id:
            url = path
            break

    title = title_match.group(1).strip() if title_match else f"Timex listing {listing_id}"
    price_value = None
    if price_match:
        price_value = float(price_match.group(1).replace(",", ""))

    return {
        "listing_id": listing_id,
        "title": title,
        "price_value": price_value,
        "price_currency": "USD" if price_value else None,
        "url": canonicalize_chrono24_url(listing_id, url),
        "image_url": image_urls[0] if image_urls else (image_match.group(1) if image_match else None),
        "image_urls": image_urls or ([image_match.group(1)] if image_match else []),
    }


@dataclass
class Listing:
    listing_id: str
    title: str
    price_value: float | None
    price_currency: str | None
    url: str
    image_url: str | None
    year: int | None
    is_vintage: bool
    source: str = "chrono24"


def parse_year(title: str) -> int | None:
    match = YEAR_RE.search(title)
    if match:
        return int(match.group(1))
    return None


def is_vintage_listing(title: str, year: int | None) -> bool:
    if "vintage" in title.lower():
        return True
    return year is not None and year <= 2000


def flaresolverr_get(url: str, session: requests.Session) -> str:
    flaresolverr_url = os.environ.get("FLARESOLVERR_URL", "http://localhost:8191/v1")
    payload = {"cmd": "request.get", "url": url, "maxTimeout": 60000}
    resp = session.post(flaresolverr_url, json=payload, timeout=90)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "ok":
        raise RuntimeError(f"FlareSolverr error: {data.get('message', data)}")
    return data["solution"]["response"]


def fetch_query(
    query: str,
    session: requests.Session,
    max_listings: int,
    use_flaresolverr: bool,
) -> list[dict[str, Any]]:
    encoded = urllib.parse.quote(query)
    base_url = (
        f"https://www.chrono24.com/search/index.htm?dosearch=true&query={encoded}&sortorder=5"
    )
    listings: list[dict[str, Any]] = []
    page = 1
    while len(listings) < max_listings:
        if page == 1:
            url = base_url
        else:
            url = base_url.replace("index.htm", f"index-{page}.htm")
        try:
            if use_flaresolverr:
                html = flaresolverr_get(url, session)
            else:
                r = session.get(url, timeout=30)
                r.raise_for_status()
                html = r.text
        except Exception as exc:
            print(f"  fetch failed page {page}: {exc}", file=sys.stderr)
            break

        article_blocks = list(ARTICLE_BLOCK_RE.finditer(html))
        if not article_blocks:
            break

        new_on_page = 0
        for match in article_blocks:
            if len(listings) >= max_listings:
                break
            lid = match.group(1)
            block = match.group(2)
            parsed = parse_article_block(block, lid)
            year = parse_year(parsed["title"])
            vintage = is_vintage_listing(parsed["title"], year)
            listings.append(
                {
                    **parsed,
                    "year": year,
                    "is_vintage": vintage,
                    "source": "chrono24",
                }
            )
            new_on_page += 1

        if new_on_page == 0:
            break
        page += 1
        time.sleep(1.5)

    return listings


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Chrono24 Timex listings")
    parser.add_argument("--vintage", action="store_true", help="Use 10 vintage query terms")
    parser.add_argument("--vintage-only", action="store_true", help="Filter to vintage listings")
    parser.add_argument("--max", type=int, default=100, help="Max listings per query")
    parser.add_argument("--out", default="vintage_timex.json", help="Output JSON file")
    parser.add_argument(
        "--no-flaresolverr",
        action="store_true",
        help="Fetch directly without FlareSolverr (may fail on Cloudflare)",
    )
    args = parser.parse_args()

    queries = VINTAGE_QUERIES if args.vintage else [DEFAULT_QUERY]
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (compatible; SleeperScraper/1.0)",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    merged: dict[str, dict[str, Any]] = {}
    use_flaresolverr = not args.no_flaresolverr and bool(
        os.environ.get("FLARESOLVERR_URL", "http://localhost:8191/v1")
    )

    for q in queries:
        print(f"Query: {q}")
        try:
            batch = fetch_query(q, session, args.max, use_flaresolverr)
        except Exception as exc:
            print(f"  skipped: {exc}", file=sys.stderr)
            continue
        for item in batch:
            key = item.get("listing_id") or item.get("url")
            if key:
                merged[str(key)] = item
        print(f"  got {len(batch)} (total unique: {len(merged)})")

    results = list(merged.values())
    if args.vintage_only:
        results = [r for r in results if r.get("is_vintage")]

    output = {
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query_count": len(queries),
        "listing_count": len(results),
        "listings": results,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(results)} listings to {args.out}")


if __name__ == "__main__":
    main()
