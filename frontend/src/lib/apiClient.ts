const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (requireAuth) {
    const token = getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    } else {
      // Handle missing token, e.g., redirect to login or throw error
      console.warn("API request requires authentication but no token found.");
    }
  }

  // Handle FormData where Content-Type shouldn't be explicitly set (browser handles it and boundaries)
  if (customConfig.body instanceof FormData && config.headers) {
      delete (config.headers as Record<string, string>)["Content-Type"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || "An error occurred");
    }

    return data as T;
  } catch (error: any) {
    console.error("API Error:", error.message);
    throw error;
  }
}

// Utility methods
export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) => apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body: any, options?: ApiOptions) => apiClient<T>(endpoint, { ...options, body: body instanceof FormData ? body : JSON.stringify(body), method: "POST" }),
  put: <T>(endpoint: string, body?: any, options?: ApiOptions) => apiClient<T>(endpoint, { ...options, body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined, method: "PUT" }),
  delete: <T>(endpoint: string, options?: ApiOptions) => apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
