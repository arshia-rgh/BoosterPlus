import { loadHome } from "../site/loaders.server";
import { HomePage } from "../home/page";

export function meta() {
  return [
    { title: "PLAYORA — Game boosting & accounts" },
    {
      name: "description",
      content:
        "Your next level starts here. Explore Mobile Legends boosting, custom rank journeys and fixed packages with PLAYORA. Track your order and talk to our team in one place.",
    },
  ];
}
export function loader() {
  return loadHome();
}
export default HomePage;
