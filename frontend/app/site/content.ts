import type { HomeContent } from "./model";
export const defaultHome: HomeContent = {
  headline: "Your next level.",
  accent: "Closer than ever.",
  description:
    "Boost your progress. Find your next account.\nDiscover more of the games you love.",
  notice:
    "Review the scope and terms of each published offering before checkout.",
  start_rank: "Warrior",
  end_rank: "Mythical Glory",
  scene_description:
    "Every climb starts somewhere. Choose where yours goes next—with a boost shaped around your goals.",
  artwork: "ascension",
  show_scene: true,
  show_pathways: true,
  show_steps: true,
  contact_email: "",
  support_hours: "",
  featured: [],
  faqs: [
    {
      question: "How does custom boosting work?",
      answer:
        "Choose a published game and tell us your starting rank, target and preferred options. The form provides an estimate; an admin reviews the request and sends a final quote for you to accept before payment.",
    },
    {
      question: "Can I play alongside my booster?",
      answer:
        "Both playing together and playing on your account are supported. Available modes and requirements are shown on each published service or package.",
    },
    {
      question: "What is different about fixed packages?",
      answer:
        "Published fixed packages have a defined scope and price. They do not need a separate admin quote. Payment is required before fulfillment.",
    },
    {
      question: "How will I follow my order?",
      answer:
        "Your account brings together order history, private conversations, agreed scope, status updates, scheduling and shared photo proof.",
    },
    {
      question: "Can I sell a game account?",
      answer:
        "Submit your account privately for review. A sale requires your acceptance of an explicit offer with its price, timing, fees and ownership terms.",
    },
  ],
};
