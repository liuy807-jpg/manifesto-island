/**
 * Public Drift store settings.
 * The Mantle write key lives here because this is a static site; visitors
 * must be able to PATCH a new island. It is a public write credential, not
 * an admin secret. The raw admin token is not in this file — only its hash.
 */
export const MANTLE = {
  base: "https://mantledb.sh/v2",
  namespace: "yl-manifesto-island-drift",
  path: "islands",
  key: "d936b84081d3551a70ca968a8eef5cb4efeb9537e838ab8c2ce9d0bbf72d7ee2",
};

export const ADMIN_HASH = "854f20066793464d644a433b2f66fdc535da1219b05a867938c85c94aa0e632b";

export const MAX_TEXT = 80;
export const MAX_NAME = 20;
export const LIST_CAP = 200;
/** One new picture per device, unless the admin token is present. */
export const RATE_MS = 6 * 60 * 60 * 1000;
export const LS_PREFIX = "manifesto-drift-v1";
