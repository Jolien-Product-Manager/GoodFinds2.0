import { FeedView } from "@/components/feed-view";
import { loadAllListings } from "@/lib/listings/load-all-listings";

export default async function HomePage() {
  const { listings, ebayEnabled } = await loadAllListings();

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 lg:max-w-7xl">
        <FeedView listings={listings} ebayEnabled={ebayEnabled} />
      </main>
    </>
  );
}
