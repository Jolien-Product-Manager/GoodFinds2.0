import type { PurchasedWatch } from "./types";

/** Owner seed data — merged into empty or incomplete purchased-watch lists on load. */
export const DEFAULT_PURCHASED_WATCHES: PurchasedWatch[] = [
  {
    id: "757003ee-1d09-4324-9674-0b0175b66d8f",
    url: "https://www.etsy.com/ca/listing/4469739360",
    parsing: false,
    features: { model: "Marlin" },
    imageUrl:
      "https://i.etsystatic.com/28052433/r/il/288786/7790629598/il_fullxfull.7790629598_q99c.jpg",
    title: "Vintage Timex Watch, Marlin series",
    description: null,
  },
  {
    id: "c143734b-d53c-420a-9c43-2cd084584fa5",
    url: "https://www.ebay.ca/itm/117111976291",
    parsing: false,
    features: { collab: "Breyers" },
    imageUrl: "https://i.ebayimg.com/images/g/4KwAAOSwoyVk68S-/s-l1600.jpg",
    title: "“Breyers” Ice Cream Watch Genuine Leather Timex La Cell",
    description: null,
  },
  {
    id: "9392d25e-80e8-47d7-bba6-0b2df14de0a1",
    url: "https://www.ebay.ca/itm/377073705816",
    parsing: false,
    features: { model: "Easy Reader", mvmt: "Quartz", running: "Running" },
    imageUrl: "https://i.ebayimg.com/images/g/r6QAAeSwSqlpypD3/s-l1600.jpg",
    title: "Timex Men's Easy Reader Logo Quartz WR Watch Works Great #989.",
    description: null,
  },
];
