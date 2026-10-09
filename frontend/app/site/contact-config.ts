export const contactEmail = "support@playoragames.com";

export type SocialChannel = "discord" | "whatsapp" | "instagram";
export type ContactLinks = Readonly<Record<SocialChannel, string | null>>;

// Only owner-confirmed public destinations belong here. A missing destination
// remains visibly unavailable and never becomes a guessed profile or invite.
export const contactLinks: ContactLinks = {
  discord: "https://discord.com/users/1553760636821962832",
  whatsapp:
    "https://wa.me/447415078674?text=Hey%20Playora%2C%20i%20need%20help%20%21",
  instagram: "https://www.instagram.com/playora_service/",
};
