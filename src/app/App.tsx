import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Providers } from "./providers";
import { router } from "./routes";

export function App() {
  // Base exercise/food library is seeded idempotently on every start (§136).
  // Dynamic import keeps the ~400 kB seed catalogs out of the initial bundle —
  // the app shell paints first, seeding follows a moment later.
  useEffect(() => {
    void import("../services/demoData/seed")
      .then(({ seedBaseLibrary }) => seedBaseLibrary())
      .catch((error) => {
        console.error("Seed failed:", error);
      });
  }, []);

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
