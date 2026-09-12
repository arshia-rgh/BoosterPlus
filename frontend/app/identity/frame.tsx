import { createContext, type ComponentType, type ReactNode } from "react";
import type { Session } from "./api";
export interface FrameProps {
  session: Session | null;
  title: string;
  children: ReactNode;
}
export const IdentityFrame = createContext<ComponentType<FrameProps>>(
  ({ children }) => <>{children}</>,
);

export const AuthorizedIdentity = createContext<{
  session: Session;
  refresh: () => Promise<void>;
} | null>(null);
