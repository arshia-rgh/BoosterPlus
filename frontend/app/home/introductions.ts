import type { HomeContent } from "../site/model";
export const introductionKinds = [
  "boost",
  "accounts",
  "shop",
  "payment",
  "news",
] as const;
export type IntroductionKind = (typeof introductionKinds)[number];
export const introductions: Record<
  IntroductionKind,
  {
    label: string;
    title: string;
    description: string;
    caption: string;
    features: readonly (readonly [string, string])[];
  }
> = {
  boost: {
    label: "Boost services",
    title: "A bigger goal. A clearer way there.",
    description:
      "A ready-made package or a plan built around you. Find the right way forward in your game.",
    caption: "Your climb, your choice",
    features: [
      [
        "Fixed packages",
        "A defined scope and a published price, without a separate staff quote.",
      ],
      [
        "Custom boosts",
        "Set your goal and preferences. Accept the final staff quote before paying.",
      ],
      [
        "Limited offers",
        "Available only when published, with real expiry and capacity details.",
      ],
    ],
  },
  accounts: {
    label: "Accounts",
    title: "Your next chapter. Or someone else’s.",
    description:
      "Find an account for your next adventure, or submit yours for staff review. Keep the conversation and handover together.",
    caption: "From discovery to handover",
    features: [
      [
        "Find your fit",
        "Compare details, region and ownership-transfer terms before you buy.",
      ],
      [
        "Agree before you sell",
        "Review the price, arrangement, fees and payout terms in your individual offer.",
      ],
      [
        "Follow every step",
        "Private updates and support stay connected to your purchase or sale.",
      ],
    ],
  },
  shop: {
    label: "In-game shop",
    title: "A little more for your next adventure.",
    description:
      "Explore approved in-game goods when your game’s shop is available. Products, regions and delivery details are shown before checkout.",
    caption: "Know what you’re buying",
    features: [
      [
        "Game-specific goods",
        "Choose only products and options published for your game.",
      ],
      [
        "Clear delivery details",
        "Check the recipient requirements and agreed delivery terms.",
      ],
      [
        "Staff fulfillment",
        "After verified payment, PLAYORA staff handle the approved delivery.",
      ],
    ],
  },
  payment: {
    label: "Crypto payments",
    title: "One clear payment. Every step visible.",
    description:
      "Pay directly for your order with crypto. Follow confirmation in your account, without loading a wallet or managing a balance.",
    caption: "From checkout to confirmation",
    features: [
      [
        "Review the instructions",
        "Check the amount, supported asset and exact network for your invoice.",
      ],
      [
        "Follow verification",
        "Confirmation depends on the provider and network. Your order shows its current status.",
      ],
      [
        "Receive sale proceeds",
        "Seller payouts use crypto under the accepted offer’s terms and timing.",
      ],
    ],
  },
  news: {
    label: "News and guides",
    title: "Stay in the game. Ahead of the changes.",
    description:
      "Catch up on staff-published updates, patches and guides when they are available for your game.",
    caption: "Your game, in the loop",
    features: [
      [
        "Game updates",
        "See the changes that matter, with publication dates and sources.",
      ],
      [
        "Patch notes",
        "Explore the latest published changes for your chosen game.",
      ],
      [
        "Practical guides",
        "Learn at your own pace, from first steps to finer details.",
      ],
    ],
  },
};
export function reviewedIntroduction(
  content: HomeContent,
  kind: IntroductionKind,
) {
  const approved = content.introductions?.find((item) => item.kind === kind);
  // eslint-disable-next-line security/detect-object-injection -- IntroductionKind is the closed list of five authored sections.
  const base = introductions[kind];
  return approved
    ? {
        ...base,
        title: approved.title,
        description: approved.description,
      }
    : base;
}
