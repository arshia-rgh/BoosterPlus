import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "../portal-router";
import { selectedService, serviceAvailable } from "./public-discovery";
import { ServiceIcon } from "../ui/service-icon";
import type { Release } from "./model";

function revealChoice(container: HTMLElement, choice: HTMLElement) {
  const bounds = container.getBoundingClientRect(),
    target = choice.getBoundingClientRect();
  if (target.top < bounds.top + 8)
    container.scrollTop -= bounds.top + 8 - target.top;
  else if (target.bottom > bounds.bottom - 8)
    container.scrollTop += target.bottom - bounds.bottom + 8;
}

/** A top action stays within the game body, clear of the bottom support panel. */
export default function CustomBoostAction({ release }: { release: Release }) {
  const { pathname } = useLocation(),
    [params] = useSearchParams(),
    [expanded, setExpanded] = useState(false),
    [inFlow, setInFlow] = useState(false),
    chooser = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const services = release.configuration.services;
  const eligible =
    serviceAvailable(release, "boost") &&
    selectedService(pathname, params) === "boost" &&
    !pathname.includes("/services/") &&
    services.length > 0;
  useEffect(() => {
    if (!expanded) return;
    chooser.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    function fit() {
      const node = chooser.current;
      if (node) {
        if (node.closest("[data-choices-flow=true]")) {
          node.style.maxHeight = "none";
          return;
        }
        const available = Math.max(
            0,
            (window.visualViewport?.height ?? window.innerHeight) -
              node.getBoundingClientRect().top -
              16,
          ),
          style = getComputedStyle(node),
          choices = Array.from(node.querySelectorAll<HTMLElement>("a, button")),
          required =
            Math.max(
              0,
              ...choices.map((choice) => choice.getBoundingClientRect().height),
            ) +
            parseFloat(style.paddingTop || "0") +
            parseFloat(style.paddingBottom || "0") +
            16;
        if (available < required) {
          setInFlow(true);
          return;
        }
        node.style.maxHeight = `${String(available)}px`;
        const active = document.activeElement;
        if (active instanceof HTMLElement && node.contains(active))
          revealChoice(node, active);
      }
    }
    fit();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    const header = document.querySelector(".site-header");
    if (header) observer?.observe(header);
    if (chooser.current?.parentElement)
      observer?.observe(chooser.current.parentElement);
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    window.visualViewport?.addEventListener("resize", fit);
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        !(event.target instanceof Node) ||
        !chooser.current?.contains(event.target)
      )
        return;
      event.preventDefault();
      setExpanded(false);
      setInFlow(false);
      trigger.current?.focus();
    }
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [expanded]);
  useEffect(() => {
    if (!inFlow) return;
    const first = chooser.current?.querySelector<HTMLElement>("a");
    if (first && typeof first.scrollIntoView === "function")
      first.scrollIntoView({ block: "center" });
  }, [inFlow]);
  if (!eligible) return null;
  const first = services[0];
  function close() {
    setExpanded(false);
    setInFlow(false);
    trigger.current?.focus();
  }
  return (
    <aside
      className="custom-boost-action"
      aria-label="Custom boosting"
      data-choices-flow={inFlow}
    >
      <div className="custom-boost-action-inner">
        <span className="custom-boost-prompt">Your goal, your boost.</span>
        {services.length === 1 && first ? (
          <Link
            className="button"
            preventScrollReset
            to={`/games/${release.slug}/services/${first.key}`}
          >
            <ServiceIcon kind="boost" />
            <span className="custom-boost-label">Configure custom boost</span>
          </Link>
        ) : (
          <>
            <button
              ref={trigger}
              type="button"
              className="button"
              aria-expanded={expanded}
              aria-controls="custom-boost-choices"
              onClick={() => {
                setInFlow(false);
                setExpanded((value) => !value);
              }}
            >
              <ServiceIcon kind="boost" />
              <span className="custom-boost-label">Configure custom boost</span>
            </button>
            {expanded && (
              <div
                ref={chooser}
                id="custom-boost-choices"
                className="custom-boost-choices"
                role="group"
                aria-label="Choose a custom service"
                onFocus={(event) => {
                  revealChoice(event.currentTarget, event.target);
                }}
              >
                <h2>Choose your custom service</h2>
                {services.map((service) => (
                  <Link
                    key={service.key}
                    className="button secondary"
                    preventScrollReset
                    to={`/games/${release.slug}/services/${service.key}`}
                    onClick={() => {
                      setExpanded(false);
                    }}
                  >
                    {service.name}
                  </Link>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={close}
                >
                  Close service choices
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
