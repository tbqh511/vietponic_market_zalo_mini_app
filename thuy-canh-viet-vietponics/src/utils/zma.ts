import { getAccessToken as getZaloAccessToken } from "zmp-sdk/apis";

export function getBasePath() {
  const urlParams = new URLSearchParams(window.location.search);
  const appEnv = urlParams.get("env");

  if (
    import.meta.env.PROD ||
    appEnv === "TESTING_LOCAL" ||
    appEnv === "TESTING" ||
    appEnv === "DEVELOPMENT"
  ) {
    return `/zapps/${window.APP_ID}`;
  }

  return window.BASE_PATH || "";
}

export async function getAccessToken(): Promise<string> {
  const accessToken = await getZaloAccessToken({});
  return accessToken;
}
