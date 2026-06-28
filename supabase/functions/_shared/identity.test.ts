// Deno unit tests for Member Identity pure helpers.
// Run: deno test supabase/functions/_shared/identity.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeHandle, validateHandle } from "./identity.ts";

Deno.test("normalizeHandle lowercases, trims, single @", () => {
  assertEquals(normalizeHandle("  @@Dave "), "@dave");
  assertEquals(normalizeHandle("Dave_99"), "@dave_99");
});

Deno.test("valid handles pass", () => {
  assertEquals(validateHandle("dave").ok, true);
  assertEquals(validateHandle("@dave_99").handle, "@dave_99");
  assertEquals(validateHandle("kop-end").ok, true);
});

Deno.test("too short / too long rejected", () => {
  assertEquals(validateHandle("ab").error, "handle_length");
  assertEquals(validateHandle("a".repeat(21)).error, "handle_length");
});

Deno.test("must start with a letter, allowed charset only", () => {
  assertEquals(validateHandle("9dave").error, "handle_format");
  assertEquals(validateHandle("da ve").error, "handle_format");
  assertEquals(validateHandle("da.ve").error, "handle_format");
});

Deno.test("reserved handles rejected", () => {
  assertEquals(validateHandle("thegaffer").error, "handle_reserved");
  assertEquals(validateHandle("@admin").error, "handle_reserved");
});
