"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import Link from "next/link";
import { isAuthenticated } from "@/features/auth/utils";
import { useRegister } from "@/features/auth/hooks/use-register";
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

export function RegisterForm(): React.JSX.Element {
   const router = useRouter();
   const {
      form,
      isLoading,
      errorMsg,
      showPassword,
      showConfirmPassword,
      captchaRef,
      toggleShowPassword,
      toggleShowConfirmPassword,
      setCaptchaToken,
      onSubmit,
      hcaptchaSiteKey,
   } = useRegister();

   useEffect(() => {
      if (isAuthenticated()) {
         router.push(ROUTES.NEWS);
      }
   }, [router]);

   return (
      <div className="grid min-h-screen w-full lg:grid-cols-2">
         <AuthHeroPanel
            title="Become part of the story."
            description="Create your account and personalize your news feed today."
         />

         <div className="flex items-center justify-center p-8 bg-white overflow-y-auto">
            <div className="w-full max-w-md">
               <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                  <CardHeader className="text-center">
                     <CardTitle className="text-2xl font-bold tracking-tight">
                        Create an account
                     </CardTitle>
                     <CardDescription className="text-slate-500">
                        Join us today. It only takes a minute.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                     >
                        <FieldGroup>
                           <Field>
                              <FieldLabel htmlFor="username">
                                 Username
                              </FieldLabel>
                              <Input
                                 id="username"
                                 placeholder="Choose a username"
                                 {...form.register("username")}
                                 disabled={isLoading}
                              />
                              {form.formState.errors.username && (
                                 <FieldDescription className="text-destructive font-medium">
                                    {form.formState.errors.username.message}
                                 </FieldDescription>
                              )}
                           </Field>

                           <Field>
                              <FieldLabel htmlFor="email">Email</FieldLabel>
                              <Input
                                 id="email"
                                 type="email"
                                 placeholder="Enter your email"
                                 {...form.register("email")}
                                 disabled={isLoading}
                              />
                              {form.formState.errors.email && (
                                 <FieldDescription className="text-destructive font-medium">
                                    {form.formState.errors.email.message}
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

                           <Field>
                              <FieldLabel htmlFor="confirmPassword">
                                 Confirm Password
                              </FieldLabel>
                              <div className="relative">
                                 <Input
                                    id="confirmPassword"
                                    type={
                                       showConfirmPassword ? "text" : "password"
                                    }
                                    placeholder="••••••••"
                                    {...form.register("confirmPassword")}
                                    disabled={isLoading}
                                 />
                                 <button
                                    type="button"
                                    onClick={toggleShowConfirmPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                                 >
                                    {showConfirmPassword ? (
                                       <EyeOff className="h-4 w-4" />
                                    ) : (
                                       <Eye className="h-4 w-4" />
                                    )}
                                 </button>
                              </div>
                              {form.formState.errors.confirmPassword && (
                                 <FieldDescription className="text-destructive font-medium">
                                    {
                                       form.formState.errors.confirmPassword
                                          .message
                                    }
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
                                    Creating account...
                                 </>
                              ) : (
                                 "Create account"
                              )}
                           </Button>

                           <div className="text-center text-sm">
                              <span className="text-slate-500 mr-1">
                                 Already have an account?
                              </span>
                              <Link
                                 href={ROUTES.LOGIN}
                                 className="text-primary font-semibold hover:underline"
                              >
                                 Sign in
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
