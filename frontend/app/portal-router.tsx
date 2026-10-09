import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  forwardRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
  useNavigation as useRouterNavigation,
  type LinkProps,
  type NavLinkProps,
  type NavigateProps,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router";
import {
  canonicalPath,
  externalDestination,
  portalDestination,
  type PortalRouting,
} from "./portal/routing";

export * from "react-router";
const RoutingContext = createContext<PortalRouting | null>(null);
export function PortalRoutingProvider({
  routing,
  children,
}: {
  routing: PortalRouting | null;
  children: ReactNode;
}) {
  return <RoutingContext value={routing}>{children}</RoutingContext>;
}
export function usePortalDestination() {
  const routing = useContext(RoutingContext);
  return useCallback((to: To) => portalDestination(to, routing), [routing]);
}
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function PortalLink({ to, ...props }, ref) {
    const destination = usePortalDestination()(to);
    return (
      <RouterLink
        {...props}
        ref={ref}
        to={destination}
        {...(externalDestination(destination) ? { reloadDocument: true } : {})}
      />
    );
  },
);
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function PortalNavLink({ to, ...props }, ref) {
    const destination = usePortalDestination()(to);
    return (
      <RouterNavLink
        {...props}
        ref={ref}
        to={destination}
        {...(externalDestination(destination) ? { reloadDocument: true } : {})}
      />
    );
  },
);
/** Ordinary anchors keep download/new-tab semantics, with the same explicit host mapping. */
export const Anchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement>
>(function PortalAnchor({ href, children, ...props }, ref) {
  const destination = usePortalDestination()(href ?? "");
  return (
    <a
      {...props}
      ref={ref}
      href={typeof destination === "string" ? destination : undefined}
    >
      {children}
    </a>
  );
});
export function useLocation() {
  const location = useRouterLocation();
  const routing = useContext(RoutingContext);
  return { ...location, pathname: canonicalPath(location.pathname, routing) };
}
export function useNavigation() {
  const navigation = useRouterNavigation();
  const routing = useContext(RoutingContext);
  return navigation.location
    ? {
        ...navigation,
        location: {
          ...navigation.location,
          pathname: canonicalPath(navigation.location.pathname, routing),
        },
      }
    : navigation;
}
export function useNavigate(): NavigateFunction {
  const navigate = useRouterNavigate();
  const destination = usePortalDestination();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") return navigate(to);
      const target = destination(to);
      if (externalDestination(target)) {
        if (options?.replace) window.location.replace(target);
        else window.location.assign(target);
        return;
      }
      return navigate(target, options);
    },
    [destination, navigate],
  );
}
export function Navigate({ to, ...props }: NavigateProps) {
  const destination = usePortalDestination()(to);
  const external = externalDestination(destination);
  useEffect(() => {
    if (!external) return;
    if (props.replace) window.location.replace(destination);
    else window.location.assign(destination);
  }, [destination, external, props.replace]);
  return external ? null : <RouterNavigate {...props} to={destination} />;
}
