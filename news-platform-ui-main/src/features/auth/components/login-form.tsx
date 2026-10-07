"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import Link from "next/link";
import { isAuthenticated } from "@/features/auth/utils";
import { useLogin } from "@/features/auth/hooks/use-login";
import { AuthHeroPanel } from "@/features/auth/components/auth-hero-panel";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Field,
   FieldDescription,
   FieldGroup,
   FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm(): React.JSX.Element {
   const router = useRouter();
   const {
      form,
      isLoading,
      errorMsg,
      showPassword,
      captchaRef,
      toggleShowPassword,
      setCaptchaToken,
      onSubmit,
      hcaptchaSiteKey,
   } = useLogin();

   useEffect(() => {
      if (isAuthenticated()) {
         router.push(ROUTES.NEWS);
      }
   }, [router]);

   return (
      <div className="grid min-h-screen w-full lg:grid-cols-2">
         <AuthHeroPanel
            title="Stay informed with the latest news."
            description="Your trusted platform for breaking stories and deep analysis."
         />

         <div className="flex items-center justify-center p-8 bg-white">
            <div className="w-full max-w-sm">
               <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                  <CardHeader className="text-center">
                     <CardTitle className="text-2xl font-bold tracking-tight">
                        Welcome back
                     </CardTitle>
                     <CardDescription className="text-slate-500">
                        Sign in to your account to continue
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                     >
                        <FieldGroup>
                           <Field>
                              <FieldLabel htmlFor="emailOrUsername">
                                 Email or username
                              </FieldLabel>
                              <Input
                                 id="emailOrUsername"
                                 placeholder="Enter your email or username"
                                 {...form.register("emailOrUsername")}
                                 disabled={isLoading}
                              />
                              {form.formState.errors.emailOrUsername && (
                                 <FieldDescription className="text-destructive font-medium">
                                    {
                                       form.formState.errors.emailOrUsername
                                          .message
                                    }
                                 </FieldDescription>
                              )}
                           </Field>

                           <Field>
                              <FieldLabel htmlFor="password">
                                 Password
                              </FieldLabel>
                              <div className="relative">
                                 <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...form.register("password")}
                                    disabled={isLoading}
                                 />
                                 <button
                                    type="button"
                                    onClick={toggleShowPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                                 >
                                    {showPassword ? (
                                       <EyeOff className="h-4 w-4" />
                                    ) : (
                                       <Eye className="h-4 w-4" />
                                    )}
                                 </button>
                              </div>
                              {form.formState.errors.password && (
                                 <FieldDescription className="text-destructive font-medium">
                                    {form.formState.errors.password.message}
                                 </FieldDescription>
                              )}
                           </Field>

                           {errorMsg && (
                              <FieldDescription className="text-destructive font-medium text-center">
                                 {errorMsg}
                              </FieldDescription>
                           )}

                           <div className="flex justify-center overflow-hidden my-4">
                              <HCaptcha
                                 ref={captchaRef}
                                 sitekey={hcaptchaSiteKey}
                                 onVerify={setCaptchaToken}
                                 onExpire={() => setCaptchaToken("")}
                              />
                           </div>

                           <Button
                              type="submit"
                              className="w-full"
                              disabled={isLoading}
                           >
                              {isLoading ? (
                                 <>
                                    <Spinner className="mr-2" />
                                    Signing in...
                                 </>
                              ) : (
                                 "Sign in"
                              )}
                           </Button>

                           <div className="text-center text-sm">
                              <span className="text-slate-500 mr-1">
                                 Don&apos;t have an account?
                              </span>
                              <Link
                                 href={ROUTES.REGISTER}
                                 className="text-primary font-semibold hover:underline"
                              >
                                 Register
                              </Link>
                           </div>
                        </FieldGroup>
                     </form>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
}
