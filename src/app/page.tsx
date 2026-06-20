import { Masthead } from "@/components/masthead";
import { FeedView } from "@/components/feed-view";
import { loadAllListings } from "@/lib/listings/load-all-listings";

export default async function HomePage() {
  const { listings, ebayEnabled } = await loadAllListings();

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <FeedView listings={listings} ebayEnabled={ebayEnabled} />
      </main>
    </>
  );
}
