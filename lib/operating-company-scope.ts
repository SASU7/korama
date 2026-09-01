export const GHANA_OPERATING_COMPANY_ID = "10000000-0000-0000-0000-000000000001";
export const NIGERIA_OPERATING_COMPANY_ID = "10000000-0000-0000-0000-000000000002";
export const OPERATING_COMPANY_IDS = [GHANA_OPERATING_COMPANY_ID, NIGERIA_OPERATING_COMPANY_ID] as const;

export function resolveActiveOperatingCompany(
  profileOperatingCompanyId: string,
  requestedOperatingCompanyId: string | undefined,
  isAdministrator: boolean,
) {
  return isAdministrator && OPERATING_COMPANY_IDS.includes(requestedOperatingCompanyId as typeof OPERATING_COMPANY_IDS[number])
    ? requestedOperatingCompanyId!
    : profileOperatingCompanyId;
}

export function canAccessOperatingCompany(
  profileOperatingCompanyId: string,
  targetOperatingCompanyId: string,
  isAdministrator: boolean,
) {
  return isAdministrator || profileOperatingCompanyId === targetOperatingCompanyId;
}
