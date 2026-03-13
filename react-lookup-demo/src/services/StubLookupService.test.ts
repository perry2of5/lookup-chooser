import { StubLookupService } from "./StubLookupService";

describe("StubLookupService", () => {
  it("returns all categories when no allow-list hint is provided", async () => {
    const service = new StubLookupService();
    const categories = await service.getCategories();

    expect(categories.map((c) => c.id)).toEqual(["secrets", "general"]);
  });

  it("applies category allow-list filtering", async () => {
    const service = new StubLookupService();
    const categories = await service.getCategories({ categoryAllowList: ["general"] });

    expect(categories).toHaveLength(1);
    expect(categories[0]?.id).toBe("general");
  });

  it("returns empty targets for unknown category", async () => {
    const service = new StubLookupService();
    const targets = await service.getTargets("unknown");

    expect(targets).toEqual([]);
  });

  it("applies target allow-list filtering", async () => {
    const service = new StubLookupService();
    const targets = await service.getTargets("general", { targetAllowList: ["host-connection-2"] });

    expect(targets).toHaveLength(1);
    expect(targets[0]?.id).toBe("host-connection-2");
  });

  it("returns empty sub-targets when target is missing", async () => {
    const service = new StubLookupService();
    const subTargets = await service.getSubTargets("general", "missing-target");

    expect(subTargets).toEqual([]);
  });

  it("filters sub-targets by value type hint", async () => {
    const service = new StubLookupService();
    const subTargets = await service.getSubTargets("general", "host-connection-1", { valueType: "number" });

    expect(subTargets).toHaveLength(1);
    expect(subTargets[0]?.id).toBe("port");
  });

  it("resolves a known value and lookup path", async () => {
    const service = new StubLookupService();
    const resolved = await service.resolveValue("general", "host-connection-1", "hostname");

    expect(resolved).toEqual({
      value: "prod.example.com",
      lookupPath: "lookup:General/Production Server/Hostname"
    });
  });

  it("throws when resolving an unknown lookup item", async () => {
    const service = new StubLookupService();

    await expect(service.resolveValue("general", "host-connection-1", "missing")).rejects.toThrow(
      "Lookup item not found"
    );
  });
});
