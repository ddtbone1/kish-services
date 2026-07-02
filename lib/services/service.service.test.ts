import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import {
  createService,
  getActiveServices,
  getAllServices,
  setServiceActive,
  updateService,
} from "./service.service";

describe("service.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all services with active services first", async () => {
    const rows = [
      { id: "service-1", name: "Buffing", is_active: true },
      { id: "service-2", name: "Old Package", is_active: false },
    ];
    const orderName = vi.fn().mockResolvedValue({ data: rows, error: null });
    const orderActive = vi.fn().mockReturnValue({ order: orderName });
    const select = vi.fn().mockReturnValue({ order: orderActive });
    mockFrom.mockReturnValue({ select });

    const result = await getAllServices();

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(orderActive).toHaveBeenCalledWith("is_active", {
      ascending: false,
    });
    expect(orderName).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("lists active services for customer-facing surfaces", async () => {
    const rows = [{ id: "service-1", name: "Interior", is_active: true }];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await getActiveServices();

    expect(result.error).toBeNull();
    expect(result.data).toEqual(rows);
    expect(eq).toHaveBeenCalledWith("is_active", true);
  });

  it("creates a service", async () => {
    const row = { id: "service-1", name: "Interior" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    const input = {
      name: "Interior",
      description: "Deep interior clean",
      price: 800,
      duration_minutes: 90,
      is_active: true,
    };
    const result = await createService(input);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
    expect(insert).toHaveBeenCalledWith(input);
  });

  it("updates a service", async () => {
    const row = { id: "service-1", name: "Updated Interior" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const result = await updateService("service-1", {
      name: "Updated Interior",
      price: 900,
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
    expect(update).toHaveBeenCalledWith({
      name: "Updated Interior",
      price: 900,
    });
    expect(eq).toHaveBeenCalledWith("id", "service-1");
  });

  it("archives or restores a service through is_active", async () => {
    const row = { id: "service-1", is_active: false };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await setServiceActive("service-1", false);

    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(eq).toHaveBeenCalledWith("id", "service-1");
  });
});
