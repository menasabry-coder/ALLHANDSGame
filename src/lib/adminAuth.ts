export const ADMIN_COOKIE_NAME = "arena_admin_auth";
export const DEFAULT_ADMIN_PASSWORD = "hakonamatata";
export const DEFAULT_ADMIN_TOKEN = "arena-admin-authenticated";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
}

export function isAdminCookieValid(cookieValue: string | undefined): boolean {
  return cookieValue === (process.env.ADMIN_AUTH_TOKEN ?? DEFAULT_ADMIN_TOKEN);
}

export function getAdminAuthToken(): string {
  return process.env.ADMIN_AUTH_TOKEN ?? DEFAULT_ADMIN_TOKEN;
}
