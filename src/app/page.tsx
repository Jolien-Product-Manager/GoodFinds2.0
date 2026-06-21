import { Masthead } from "@/components/masthead";
import { FeedView } from "@/components/feed-view";
import { loadAllListings } from "@/lib/listings/load-all-listings";

export default async function HomePage() {
  const { listings, ebayEnabled, etsyEnabled } = await loadAllListings();

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:max-w-7xl">
        <FeedView listings={listings} ebayEnabled={ebayEnabled} etsyEnabled={etsyEnabled} />
      </main>
    </>
  );
}
