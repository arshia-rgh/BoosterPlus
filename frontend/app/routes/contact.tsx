import Contact from "../site/contact";

export function meta() {
  return [
    { title: "Contact us | PLAYORA" },
    {
      name: "description",
      content:
        "Contact the PLAYORA team by email, find our social channels, or open your private support conversations.",
    },
  ];
}

export default function Page() {
  return <Contact />;
}
