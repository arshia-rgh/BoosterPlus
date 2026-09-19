import SceneCharacter from "./scene-character";
import { scenes } from "./scene-catalog";

export default function MiyaArt({ enabled }: { enabled: boolean }) {
  return <SceneCharacter scene={scenes[0]} enabled={enabled} />;
}
