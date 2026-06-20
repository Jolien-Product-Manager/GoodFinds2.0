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

        # Minimal HTML parsing — article blocks with data-article-id
        article_ids = re.findall(r'data-article-id="(\d+)"', html)
        if not article_ids:
            break

        titles = re.findall(r'class="text-bold[^"]*"[^>]*>([^<]+)</', html)
        prices = re.findall(r'class="text-bold[^"]*"[^>]*>\s*\$?([\d,]+(?:\.\d{2})?)', html)
        links = re.findall(r'href="(/[^"]*--id\d+\.htm)"', html)
        images = re.findall(r'data-src="(https://[^"]+chrono24[^"]+)"', html)

        new_on_page = 0
        for i, lid in enumerate(article_ids):
            if len(listings) >= max_listings:
                break
            title = titles[i] if i < len(titles) else f"Timex listing {lid}"
            price_str = prices[i].replace(",", "") if i < len(prices) else None
            price_value = float(price_str) if price_str else None
            path = links[i] if i < len(links) else f"/timex--id{lid}.htm"
            full_url = f"https://www.chrono24.com{path}" if path.startswith("/") else path
            image = images[i] if i < len(images) else None
            year = parse_year(title)
            vintage = is_vintage_listing(title, year)
            listings.append(
                {
                    "listing_id": lid,
                    "title": title.strip(),
                    "price_value": price_value,
                    "price_currency": "USD" if price_value else None,
                    "url": full_url,
                    "image_url": image,
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
