import hashlib
import json
import os
import feedparser
import aiohttp
from datetime import datetime

SEEN_DOCS_PATH = os.path.join(os.path.dirname(__file__), "../data/seen_documents.json")

def load_seen():
    with open(SEEN_DOCS_PATH, "r") as f:
        return json.load(f)

def save_seen(seen):
    with open(SEEN_DOCS_PATH, "w") as f:
        json.dump(seen, f)

def make_hash(url, date):
    return hashlib.md5(f"{url}{date}".encode()).hexdigest()

RSS_FEEDS = [
    {
        "url": "https://www.federalregister.gov/documents/current.rss",
        "jurisdiction": "US",
        "topic": "federal"
    },
    {
        "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&dateb=&owner=include&count=10&search_text=&output=atom",
        "jurisdiction": "US",
        "topic": "securities"
    },
    {
        "url": "https://eur-lex.europa.eu/RSSCOMPONENT/index.html?locale=en&type=LEGAL_ACT",
        "jurisdiction": "EU",
        "topic": "eu_legislation"
    },
    {
        "url": "https://www.legislation.gov.uk/new/data.feed",
        "jurisdiction": "UK",
        "topic": "uk_legislation"
    }
]

async def run_monitor():
    print("🔍 Agent 1: Monitor starting...")
    seen = load_seen()
    new_documents = []

    for feed_info in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries[:5]:
                url = entry.get("link", "")
                date = entry.get("published", str(datetime.now()))
                doc_hash = make_hash(url, date)

                if doc_hash not in seen:
                    doc = {
                        "hash": doc_hash,
                        "url": url,
                        "title": entry.get("title", ""),
                        "date": date,
                        "jurisdiction": feed_info["jurisdiction"],
                        "topic": feed_info["topic"],
                        "summary": entry.get("summary", "")
                    }
                    new_documents.append(doc)
                    seen.append(doc_hash)
                    print(f"✅ New document found: {doc['title'][:60]}")

        except Exception as e:
            print(f"❌ Error reading feed {feed_info['url']}: {e}")

    save_seen(seen)
    print(f"📦 Monitor done. {len(new_documents)} new documents found.")
    return new_documents