import { getAccessToken } from "zmp-sdk/apis";
import { requestWithPost } from "./request";

export interface AuthResponse {
  error: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      profile: string | null;
      mobile: string | null;
    };
  };
}

export interface AuthenticatedUserInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  address: string;
}

const TOKEN_KEY = "jwt_token";

/**
 * Get stored JWT token from localStorage
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.warn("Failed to get stored token:", error);
    return null;
  }
}

/**
 * Store JWT token in localStorage
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.warn("Failed to store token:", error);
  }
}

/**
 * Remove JWT token from localStorage
 */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn("Failed to clear token:", error);
  }
}

/**
 * Authenticate with backend server using Zalo access token
 * This function gets the Zalo access token and sends it to the backend
 * which validates it with Zalo API and returns user info + JWT token
 */
export async function authenticateWithServer(): Promise<AuthenticatedUserInfo | null> {
  try {
    // Get Zalo access token
    const accessToken = await getAccessToken({});
    
    if (!accessToken) {
      console.warn("No access token available");
      return null;
    }

    // Send access token to backend for authentication
    const response = await requestWithPost<
      { access_token: string },
      AuthResponse
    >("/authenticate", {
      access_token: accessToken,
    });

    if (response.error || !response.data) {
      console.warn("Authentication failed:", response.message);
      return null;
    }

    // Store JWT token for future requests
    storeToken(response.data.token);

    // Transform backend user data to match UserInfo interface
    const userInfo: AuthenticatedUserInfo = {
      id: String(response.data.user.id),
      name: response.data.user.name,
      avatar: response.data.user.profile || "", // Use profile as avatar
      phone: response.data.user.mobile || "",
      email: response.data.user.email,
      address: "", // Address not provided by backend, will be updated later
    };

    return userInfo;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}
