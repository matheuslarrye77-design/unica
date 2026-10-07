import axios, {
   InternalAxiosRequestConfig,
   AxiosResponse,
   AxiosError,
} from "axios";
import { getToken, clearAuth } from "@/features/auth/utils";
import { ROUTES } from "@/lib/constants";

const API_BASE_URL: string =
   process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
   baseURL: API_BASE_URL,
   headers: {
      "Content-Type": "application/json",
   },
});

apiClient.interceptors.request.use(
   (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = getToken();
      if (token && config.headers) {
         config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
   },
);

apiClient.interceptors.response.use(
   (response: AxiosResponse): AxiosResponse => response,
   (error: AxiosError): Promise<never> => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
         clearAuth();
         window.location.href = ROUTES.LOGIN;
      }
      return Promise.reject(error);
   },
);
