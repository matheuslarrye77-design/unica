import { z } from "zod";

export const loginSchema = z.object({
   emailOrUsername: z.string().min(1, "Email or username is required"),
   password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
   .object({
      username: z
         .string()
         .min(3, "Username must be at least 3 characters")
         .max(20, "Username must be at most 20 characters")
         .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username must be alphanumeric with underscores",
         ),
      email: z.string().email("Please enter a valid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string(),
   })
   .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
   });

export type RegisterFormValues = z.infer<typeof registerSchema>;
