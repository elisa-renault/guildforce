import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { appRoutes } from "../routes";

vi.mock("../pages/Index", () => ({
  default: () => <div>Index Page</div>,
}));
vi.mock("../pages/Auth", () => ({
  default: () => <div>Auth Page</div>,
}));
vi.mock("../pages/GuildList", () => ({
  default: () => <div>Guild List Page</div>,
}));
vi.mock("../pages/LegalPage", () => ({
  default: () => <div>Legal Page</div>,
}));
vi.mock("../pages/NotFound", () => ({
  default: () => <div>Not Found Page</div>,
}));

const renderRoute = async (path: string, expectedText: string) => {
  cleanup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Suspense>
    </MemoryRouter>
  );

  expect(await screen.findByText(expectedText)).toBeInTheDocument();
};

describe("appRoutes", () => {
  it("renders essential routes", async () => {
    await renderRoute("/", "Index Page");
    await renderRoute("/auth", "Auth Page");
    await renderRoute("/guilds", "Guild List Page");
    await renderRoute("/legal", "Legal Page");
    await renderRoute("/unknown", "Not Found Page");
  });
});
