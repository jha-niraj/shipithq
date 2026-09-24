// Sprint 1, task 1: Stand up a typed React app you can run.
import tsconfig from "../tsconfig.app.json";
import { APP_NAME } from "../src/config";

describe("sprint 1, task 1", () => {
  it("names the app instead of the placeholder", () => {
    expect(APP_NAME.trim().length).toBeGreaterThan(0);
    expect(APP_NAME).not.toBe("My App");
  });

  it("turns strict mode on in tsconfig", () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});
