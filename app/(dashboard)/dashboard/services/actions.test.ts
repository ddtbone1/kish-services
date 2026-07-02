import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateService = vi.hoisted(() => vi.fn());
const mockUpdateService = vi.hoisted(() => vi.fn());
const mockSetServiceActive = vi.hoisted(() => vi.fn());
const mockAuthGetUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockRevalidateTag = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/service.service", () => ({
  createService: mockCreateService,
  updateService: mockUpdateService,
  setServiceActive: mockSetServiceActive,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockAuthGetUser },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
}));

import {
  createServiceAction,
  setServiceActiveAction,
  updateServiceAction,
} from "./actions";

function makeServiceFormData(overrides?: Record<string, string>) {
  const formData = new FormData();
  formData.set("name", "Interior Detailing");
  formData.set("description", "Deep clean for the car interior.");
  formData.set("price", "800");
  formData.set("duration_minutes", "90");
  formData.set("is_active", "true");

  for (const [key, value] of Object.entries(overrides ?? {})) {
    formData.set(key, value);
  }

  return formData;
}

describe("service management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "owner-1" } },
    });
    mockCreateService.mockResolvedValue({ data: { id: "service-1" }, error: null });
    mockUpdateService.mockResolvedValue({ data: { id: "service-1" }, error: null });
    mockSetServiceActive.mockResolvedValue({
      data: { id: "service-1" },
      error: null,
    });
  });

  it("creates a service and revalidates customer-facing service surfaces", async () => {
    const result = await createServiceAction(makeServiceFormData());

    expect(result.error).toBeNull();
    expect(mockCreateService).toHaveBeenCalledWith({
      name: "Interior Detailing",
      description: "Deep clean for the car interior.",
      price: 800,
      duration_minutes: 90,
      is_active: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/book");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/services");
    expect(mockRevalidateTag).toHaveBeenCalledWith("services", "max");
  });

  it("updates a service", async () => {
    const result = await updateServiceAction(
      "service-1",
      makeServiceFormData({ price: "950.50", is_active: "false" }),
    );

    expect(result.error).toBeNull();
    expect(mockUpdateService).toHaveBeenCalledWith("service-1", {
      name: "Interior Detailing",
      description: "Deep clean for the car interior.",
      price: 950.5,
      duration_minutes: 90,
      is_active: false,
    });
  });

  it("archives or restores a service", async () => {
    const result = await setServiceActiveAction("service-1", false);

    expect(result.error).toBeNull();
    expect(mockSetServiceActive).toHaveBeenCalledWith("service-1", false);
    expect(mockRevalidateTag).toHaveBeenCalledWith("services", "max");
  });

  it("rejects unauthenticated users", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createServiceAction(makeServiceFormData());

    expect(result.error).toBe("Unauthorized");
    expect(mockCreateService).not.toHaveBeenCalled();
  });

  it("rejects invalid prices", async () => {
    const result = await createServiceAction(
      makeServiceFormData({ price: "-1" }),
    );

    expect(result.error).toContain("Invalid input");
    expect(mockCreateService).not.toHaveBeenCalled();
  });
});
