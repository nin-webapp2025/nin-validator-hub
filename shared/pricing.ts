export const DASHBOARD_OPERATION_PRICES: Record<string, number> = {
  nin_validation: 5000,
  bvn_verification: 800,
  nin_verification: 800,
  print_nin_slip_premium: 600,
  print_nin_slip_long: 400,
  clearance: 3000,
  personalization: 1500,
};

export const DASHBOARD_OPERATION_LABELS: Record<string, string> = {
  nin_validation: "NIN Validation",
  bvn_verification: "BVN Verification",
  nin_verification: "NIN Verification",
  print_nin_slip_premium: "Print Premium NIN Slip",
  print_nin_slip_long: "Print Long NIN Slip (NINS)",
  clearance: "Clearance",
  personalization: "Personalization",
};

export const API_ACTION_PRICES: Record<string, number> = {
  validate: DASHBOARD_OPERATION_PRICES.nin_validation,
  validation_status: 0,
  personalization: DASHBOARD_OPERATION_PRICES.personalization,
  personalization_status: 0,
  clearance: DASHBOARD_OPERATION_PRICES.clearance,
  clearance_status: 0,
  nin_search: DASHBOARD_OPERATION_PRICES.nin_verification,
  nin_phone: DASHBOARD_OPERATION_PRICES.nin_verification,
  nin_demo: DASHBOARD_OPERATION_PRICES.nin_verification,
  nin_basic: DASHBOARD_OPERATION_PRICES.nin_verification,
  nin_advance: DASHBOARD_OPERATION_PRICES.nin_verification,
  bvn_basic: DASHBOARD_OPERATION_PRICES.bvn_verification,
  bvn_advance: DASHBOARD_OPERATION_PRICES.bvn_verification,
  print_nin_slip_premium: DASHBOARD_OPERATION_PRICES.print_nin_slip_premium,
  print_nin_slip_long: DASHBOARD_OPERATION_PRICES.print_nin_slip_long,
};
