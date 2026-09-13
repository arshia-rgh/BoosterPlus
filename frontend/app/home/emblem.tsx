// Original PLAYORA illustrations; not official MLBB rank artwork.
export function Emblem({ elevated = false }: { elevated?: boolean }) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={elevated ? "emblem emblem-gold" : "emblem"}
    >
      <path className="crest-ring" d="M120 19 207 69v101l-87 51-87-51V69Z" />
      {elevated && (
        <g className="crest-wings">
          <path d="m91 112-47-31L18 31l8 81 47 39 24-9M149 112l47-31 26-50-8 81-47 39-24-9" />
          <path d="m82 140-52-24 18 39 55 26M158 140l52-24-18 39-55 26M73 87 49 44l46 27M167 87l24-43-46 27" />
          <path d="m96 63 24-42 24 42-24 23Z" />
        </g>
      )}
      <path className="crest-shield" d="m120 63 49 24-9 69-40 34-40-34-9-69Z" />
      <path className="crest-facet" d="m120 77 31 41-31 57-31-57Z" />
      <path
        className="crest-line"
        d="m120 77 0 98m-31-57 31 11 31-11M76 94l-16 10m104-10 16 10"
      />
      <path
        className="crest-star"
        d="m120 98 5 17 17 5-17 5-5 17-5-17-17-5 17-5Z"
      />
      <circle cx="120" cy="209" r="3" fill="currentColor" />
    </svg>
  );
}
export function Avatar() {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="profile-avatar"
    >
      <path fill="#152e2b" d="M0 0h64v64H0z" />
      <path fill="#819e8e" d="m16 53 7-16-2-17 11-9 11 9-2 17 7 16Z" />
      <path fill="#14251f" d="m23 22 9-5 9 5-3 15-6 6-6-6Z" />
      <path
        stroke="#e4c68d"
        strokeWidth="2"
        d="m23 27 7 3m11-3-7 3M32 18v13M21 45l11 6 11-6"
      />
    </svg>
  );
}
