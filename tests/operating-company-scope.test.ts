import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessOperatingCompany,
  GHANA_OPERATING_COMPANY_ID,
  NIGERIA_OPERATING_COMPANY_ID,
  resolveActiveOperatingCompany,
} from "../lib/operating-company-scope.ts";

test("ordinary staff remain bound to the operating company on their profile", () => {
  assert.equal(resolveActiveOperatingCompany(GHANA_OPERATING_COMPANY_ID, NIGERIA_OPERATING_COMPANY_ID, false), GHANA_OPERATING_COMPANY_ID);
  assert.equal(canAccessOperatingCompany(GHANA_OPERATING_COMPANY_ID, NIGERIA_OPERATING_COMPANY_ID, false), false);
});

test("administrators may switch between configured operating companies", () => {
  assert.equal(resolveActiveOperatingCompany(GHANA_OPERATING_COMPANY_ID, NIGERIA_OPERATING_COMPANY_ID, true), NIGERIA_OPERATING_COMPANY_ID);
  assert.equal(canAccessOperatingCompany(GHANA_OPERATING_COMPANY_ID, NIGERIA_OPERATING_COMPANY_ID, true), true);
  assert.equal(resolveActiveOperatingCompany(GHANA_OPERATING_COMPANY_ID, "untrusted", true), GHANA_OPERATING_COMPANY_ID);
});
