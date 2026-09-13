import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
export default function AccountRouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current !== pathname) {
      previous.current = pathname;
      document.querySelector<HTMLHeadingElement>("main h1")?.focus();
    }
  }, [pathname]);
  return null;
}
