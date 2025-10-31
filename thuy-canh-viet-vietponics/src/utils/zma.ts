import { getAccessToken as getZaloAccessToken } from "zmp-sdk/apis";
import { requestWithPost, requestWithGet } from "@/utils/request";

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

export async function decodeToken(token: string): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await requestWithGet<{
    error: boolean;
    message: string;
    data?: {
      number: string;
    };
  }>("/infouser", {
    access_token: accessToken,
    code: token,
  });

  if (response.error || !response.data?.number) {
    throw new Error(response.message || "Failed to decode phone token");
  }

  return response.data.number;
}
