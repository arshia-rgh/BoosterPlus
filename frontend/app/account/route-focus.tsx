import { useEffect, useRef } from "react";
import {
  NavigationType,
  useLocation,
  useNavigationType,
} from "../portal-router";
export default function AccountRouteFocus() {
  const { pathname } = useLocation();
  const navigation = useNavigationType();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const changed =
      previous.current === null
        ? navigation !== NavigationType.Pop
        : previous.current !== pathname;
    previous.current = pathname;
    if (!changed) return;
    // Client entry can mount before its destination heading is ready.
    // Initial document loads keep the browser's normal focus behavior.
    const focus = () => {
      const heading = document.querySelector<HTMLHeadingElement>("main h1");
      if (!heading) return false;
      heading.focus();
      return true;
    };
    if (focus()) return;
    const observer = new MutationObserver(() => {
      if (focus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [pathname, navigation]);
  return null;
}
