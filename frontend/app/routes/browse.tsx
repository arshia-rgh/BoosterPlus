import { Outlet } from "react-router";
import Surface from "../experience/surface";
import "../experience/experience.css";
export default function Browse() {
  return (
    <Surface kind="browse">
      <Outlet />
    </Surface>
  );
}
