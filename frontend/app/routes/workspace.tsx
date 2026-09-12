import { Outlet } from "react-router";
import { IdentityFrame } from "../identity/frame";
import CustomerShell from "../experience/customer-shell";
import Surface from "../experience/surface";
import "../experience/experience.css";
export default function Workspace() {
  return (
    <Surface kind="workspace">
      <IdentityFrame value={CustomerShell}>
        <Outlet />
      </IdentityFrame>
    </Surface>
  );
}
