import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { seedBaseLibrary } from "../services/demoData/seed";
import { Providers } from "./providers";
import { router } from "./routes";

export function App() {
  // Base exercise/food library is seeded idempotently on every start (§136).
  useEffect(() => {
    void seedBaseLibrary().catch((error) => {
      console.error("Seed failed:", error);
    });
  }, []);

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
