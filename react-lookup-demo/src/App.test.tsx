import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("renders the connection settings page", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Connection Settings" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Lookup" })[0]!);
    expect(await screen.findByRole("button", { name: /General/i })).toBeInTheDocument();
  });
});
