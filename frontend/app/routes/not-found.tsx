import { data } from "react-router";
import ErrorPage from "../ui/error-page";
import { useLocation } from "../portal-router";

// Explicit matching keeps the root loader's trusted portal context available
// even for unknown URLs; a framework-level unmatched route skips that loader.
export function loader() {
  return data(null, { status: 404 });
}
export default function NotFound() {
  const admin = useLocation().pathname.startsWith("/admin");
  return (
    <ErrorPage
      admin={admin}
      error={{
        status: 404,
        statusText: "Not Found",
        internal: false,
        data: "Not found",
      }}
    />
  );
}
