import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionFormPage } from "./ConnectionFormPage";

describe("ConnectionFormPage", () => {
  it("renders four lookup-enabled fields", async () => {
    const user = userEvent.setup();
    render(<ConnectionFormPage />);

    expect(screen.getByLabelText("Host")).toBeInTheDocument();
    expect(screen.getByLabelText("Port")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Lookup" })).toHaveLength(4);

    await user.click(screen.getAllByRole("button", { name: "Lookup" })[0]!);
    expect(await screen.findByRole("button", { name: /General/i })).toBeInTheDocument();
  });
});
