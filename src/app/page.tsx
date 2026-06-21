import { FeedView } from "@/components/feed-view";
import { hasEbayCredentials, hasEbaySnapshot } from "@/lib/ebay/client";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:max-w-7xl">
      <FeedView ebayEnabled={hasEbayCredentials() || hasEbaySnapshot()} />
    </main>
  );
}
