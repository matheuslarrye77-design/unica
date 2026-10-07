"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { authApi } from "@/features/auth/api";
import { saveAuth } from "@/features/auth/utils";
import {
   registerSchema,
   type RegisterFormValues,
} from "@/features/auth/schemas";
import { ROUTES } from "@/lib/constants";

const HCAPTCHA_SITE_KEY: string =
   process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

interface UseRegisterReturn {
   form: UseFormReturn<RegisterFormValues>;
   isLoading: boolean;
   errorMsg: string;
   showPassword: boolean;
   showConfirmPassword: boolean;
   captchaToken: string;
   captchaRef: React.RefObject<HCaptcha | null>;
   toggleShowPassword: () => void;
   toggleShowConfirmPassword: () => void;
   setCaptchaToken: (token: string) => void;
   onSubmit: (data: RegisterFormValues) => Promise<void>;
   hcaptchaSiteKey: string;
}

interface AxiosErrorPayload {
   response?: { data?: { message?: string } };
}

export function useRegister(): UseRegisterReturn {
   const router = useRouter();
   const [isLoading, setIsLoading] = useState<boolean>(false);
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [showConfirmPassword, setShowConfirmPassword] =
      useState<boolean>(false);
   const [errorMsg, setErrorMsg] = useState<string>("");
   const [captchaToken, setCaptchaToken] = useState<string>("");
   const captchaRef = useRef<HCaptcha>(null);

   const form = useForm<RegisterFormValues>({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- zod v4.3.x minor version type mismatch with @hookform/resolvers
      resolver: zodResolver(registerSchema),
      defaultValues: {
         username: "",
         email: "",
         password: "",
         confirmPassword: "",
      },
   });

   const onSubmit = async (data: RegisterFormValues): Promise<void> => {
      setIsLoading(true);
      setErrorMsg("");
      try {
         const response = await authApi.register({
            username: data.username,
            email: data.email,
            password: data.password,
            captchaToken: captchaToken || undefined,
         });
         saveAuth(response.token, {
            id: response.id,
            email: response.email,
            username: response.username,
            role: response.role,
         });
         router.push(ROUTES.NEWS);
      } catch (err: unknown) {
         const errorPayload = err as AxiosErrorPayload;
         setErrorMsg(
            errorPayload?.response?.data?.message ??
               "Registration failed. Please try again.",
         );
         captchaRef.current?.resetCaptcha();
         setCaptchaToken("");
      } finally {
         setIsLoading(false);
      }
   };

   const toggleShowPassword = (): void => {
      setShowPassword((prev) => !prev);
   };

   const toggleShowConfirmPassword = (): void => {
      setShowConfirmPassword((prev) => !prev);
   };

   return {
      form,
      isLoading,
      errorMsg,
      showPassword,
      showConfirmPassword,
      captchaToken,
      captchaRef,
      toggleShowPassword,
      toggleShowConfirmPassword,
      setCaptchaToken,
      onSubmit,
      hcaptchaSiteKey: HCAPTCHA_SITE_KEY,
   };
}
