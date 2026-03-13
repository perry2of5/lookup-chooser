import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { LookupInput } from "./LookupInput";
import { StubLookupService } from "../services/StubLookupService";
import type { LookupHint, LookupInputValue } from "../services/LookupService";

function renderInput(options?: { initialValue?: LookupInputValue; hint?: LookupHint }) {
  const service = new StubLookupService();
  const onChange = vi.fn();
  const initialValue = options?.initialValue;
  const hint = options?.hint ?? { valueType: "text", categoryAllowList: ["general"] };

  function Harness() {
    const [value, setValue] = useState<LookupInputValue>(
      initialValue ?? { source: "manual", value: "" }
    );

    return (
      <LookupInput
        id="host"
        label="Host"
        hint={hint}
        value={value}
        lookupService={service}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }

  render(<Harness />);

  return { onChange };
}

describe("LookupInput", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows manual typing", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput();

    const input = screen.getByLabelText("Host");
    await user.type(input, "prod.example.com");

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({ source: "manual", value: "prod.example.com" });
  });

  it("supports lookup selection", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.click(screen.getByRole("button", { name: /General/i }));
    await user.click(screen.getByRole("button", { name: /Production Server/i }));
    await user.click(screen.getByRole("button", { name: /Hostname/i }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        source: "lookup",
        value: "prod.example.com",
        lookupPath: "lookup:General/Production Server/Hostname"
      });
    });
  });

  it("shows clear button for locked lookup values", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput({
      initialValue: {
        source: "lookup",
        value: "prod.example.com",
        lookupPath: "lookup:General/Production Server/Hostname"
      }
    });

    await user.click(screen.getByRole("button", { name: "Clear Host lookup value" }));
    expect(onChange).toHaveBeenCalledWith({ source: "manual", value: "", lookupPath: undefined });
  });

  it("restores previous manual value when clearing lookup", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput();

    await user.type(screen.getByLabelText("Host"), "manual-host");
    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.click(screen.getByRole("button", { name: /General/i }));
    await user.click(screen.getByRole("button", { name: /Production Server/i }));
    await user.click(screen.getByRole("button", { name: /Hostname/i }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        source: "lookup",
        value: "prod.example.com",
        lookupPath: "lookup:General/Production Server/Hostname"
      });
    });

    await user.click(screen.getByRole("button", { name: "Clear Host lookup value" }));
    expect(onChange).toHaveBeenCalledWith({ source: "manual", value: "manual-host", lookupPath: undefined });
  });

  it("autofocuses search when dialog opens", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    const generalCategory = await screen.findByRole("button", { name: /General/i });
    await waitFor(() => {
      expect(generalCategory).toHaveFocus();
    });
    expect(screen.getByRole("button", { name: /Secrets/i })).toBeInTheDocument();
  });

  it("closes dialog when clicking backdrop", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    expect(screen.getByRole("dialog", { name: "Host lookup dialog" })).toBeInTheDocument();

    await user.click(screen.getByTestId("host-dialog-backdrop"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Host lookup dialog" })).not.toBeInTheDocument();
    });
  });

  it("closes dialog on Escape", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    expect(screen.getByRole("dialog", { name: "Host lookup dialog" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Host lookup dialog" })).not.toBeInTheDocument();
    });
  });

  it("shows no-results message when filtering targets has no match", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.click(screen.getByRole("button", { name: /General/i }));
    await user.type(screen.getByPlaceholderText("Filter targets..."), "does-not-exist");

    await waitFor(() => {
      expect(screen.getByText("No targets found matching your search")).toBeInTheDocument();
    });
  });

  it("debounces search filtering by 75ms", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.click(await screen.findByRole("button", { name: /General/i }));

    const searchInput = screen.getByPlaceholderText("Filter targets...");
    await user.type(searchInput, "does-not-exist");

    expect(screen.queryByText("No targets found matching your search")).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText("No targets found matching your search")).toBeInTheDocument();
      },
      { timeout: 250 }
    );
  });

  it("supports arrow-key navigation in category and target lists", async () => {
    const user = userEvent.setup();
    renderInput({ hint: { valueType: "text" } });

    await user.click(screen.getByRole("button", { name: "Lookup" }));

    const secretsButton = await screen.findByRole("button", { name: /Secrets/i });
    secretsButton.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /General/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /General/i }));
    const productionButton = await screen.findByRole("button", { name: /Production Server/i });
    productionButton.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /Staging Server/i })).toHaveFocus();
  });

  it("keeps tab focus in a sensible dialog order", async () => {
    const user = userEvent.setup();
    renderInput({ hint: { valueType: "text" } });

    await user.click(screen.getByRole("button", { name: "Lookup" }));

    await screen.findByRole("button", { name: /Secrets/i });
    const activeCategory = screen
      .getAllByRole("button", { name: /Secrets|General/i })
      .find((button) => button.className.includes("bg-blue-50"));
    expect(activeCategory).toBeDefined();
    if (!activeCategory) {
      throw new Error("Expected an active category button");
    }
    await waitFor(() => {
      expect(activeCategory).toHaveFocus();
    });

    const dialog = screen.getByRole("dialog", { name: "Host lookup dialog" });

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab({ shift: true });
    expect(activeCategory).toHaveFocus();

    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("uses right arrow to drill down and left arrow to navigate up", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));

    const generalCategory = await screen.findByRole("button", { name: /General/i });
    generalCategory.focus();
    await user.keyboard("{ArrowRight}");

    const productionTarget = await screen.findByRole("button", { name: /Production Server/i });
    await waitFor(() => {
      expect(productionTarget).toHaveFocus();
    });

    await user.keyboard("{ArrowRight}");
    const hostnameSubTarget = await screen.findByRole("button", { name: /Hostname/i });
    expect(hostnameSubTarget).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: /Production Server/i })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: /General/i })).toHaveFocus();
  });

  it("reopens with previously selected sub-target focused", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    await user.click(await screen.findByRole("button", { name: /General/i }));
    await user.click(await screen.findByRole("button", { name: /Production Server/i }));
    await user.click(await screen.findByRole("button", { name: /Hostname/i }));

    await user.click(screen.getByRole("button", { name: "Lookup" }));
    const hostnameSubTarget = await screen.findByRole("button", { name: /Hostname/i });
    await waitFor(() => {
      expect(hostnameSubTarget).toHaveFocus();
    });
  });

  it("pins usage guidance after click until outside click", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));

    const usageButton = await screen.findByRole("button", {
      name: "Usage and keyboard shortcuts"
    });

    expect(screen.queryByRole("tooltip", { name: "Keyboard usage guidance" })).not.toBeInTheDocument();

    await user.hover(usageButton);
    expect(await screen.findByRole("tooltip", { name: "Keyboard usage guidance" })).toBeInTheDocument();
    expect(screen.getByText(/Right Arrow \/ Enter/i)).toBeInTheDocument();

    await user.click(usageButton);
    await user.unhover(usageButton);
    expect(screen.getByRole("tooltip", { name: "Keyboard usage guidance" })).toBeInTheDocument();

    await user.click(screen.getByPlaceholderText("Filter targets..."));
    await waitFor(() => {
      expect(screen.queryByRole("tooltip", { name: "Keyboard usage guidance" })).not.toBeInTheDocument();
    });
  });

  it("supports explicit close control for usage guidance", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole("button", { name: "Lookup" }));

    const usageButton = await screen.findByRole("button", {
      name: "Usage and keyboard shortcuts"
    });

    await user.click(usageButton);
    expect(await screen.findByRole("tooltip", { name: "Keyboard usage guidance" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close usage guidance" }));
    await waitFor(() => {
      expect(screen.queryByRole("tooltip", { name: "Keyboard usage guidance" })).not.toBeInTheDocument();
    });

    await user.hover(usageButton);
    expect(await screen.findByRole("tooltip", { name: "Keyboard usage guidance" })).toBeInTheDocument();

    await user.unhover(usageButton);
  });
});
