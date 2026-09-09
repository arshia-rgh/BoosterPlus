import { Link, useLocation } from "react-router";

export default function Portal() {
  const { pathname } = useLocation();
  const title =
    pathname === "/admin"
      ? "Administration"
      : pathname === "/booster"
        ? "Booster portal"
        : "Your account";
  return (
    <main id="main" className="page">
      <title>{`${title} | Booster Plus`}</title>
      <p className="eyebrow">Opening soon</p>
      <h1>{title}</h1>
      <p>
        Secure sign-in is being prepared. Your account will use Google or an
        email sign-in link.
      </p>
      <Link className="button" to="/">
        Back to home
      </Link>
    </main>
  );
}
