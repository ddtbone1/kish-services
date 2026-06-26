import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger, requestContext } from "./logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("without request context", () => {
    it("prefixes with no-req-id when no context is active", () => {
      logger.info("hello");
      expect(logSpy).toHaveBeenCalledOnce();
      const msg: string = logSpy.mock.calls[0][0];
      expect(msg).toContain("[INFO]");
      expect(msg).toContain("[no-req-id]");
      expect(msg).toContain("hello");
    });

    it("includes ISO timestamp", () => {
      logger.warn("test warn");
      const msg: string = warnSpy.mock.calls[0][0];
      expect(msg).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });

    it("serialises meta as JSON", () => {
      logger.error("oops", { code: 42, reason: "test" });
      const msg: string = errorSpy.mock.calls[0][0];
      expect(msg).toContain('{"code":42,"reason":"test"}');
    });
  });

  describe("with request context", () => {
    it("includes the requestId from AsyncLocalStorage", async () => {
      await requestContext.run({ requestId: "test-req-123" }, async () => {
        logger.info("inside context");
      });
      const msg: string = logSpy.mock.calls[0][0];
      expect(msg).toContain("[test-req-123]");
      expect(msg).toContain("inside context");
    });

    it("falls back to no-req-id outside the context", () => {
      logger.info("outside context");
      const msg: string = logSpy.mock.calls[0][0];
      expect(msg).toContain("[no-req-id]");
    });
  });

  describe("log levels", () => {
    it("calls console.log for info", () => {
      logger.info("info message");
      expect(logSpy).toHaveBeenCalledOnce();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("calls console.warn for warn", () => {
      logger.warn("warn message");
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("calls console.error for error", () => {
      logger.error("error message");
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
