import { z } from "zod";

const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

export const RegisterSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters").max(50),
  last_name: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number is too long"),
  birthdate: z.string().refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d <= eighteenYearsAgo;
  }, { message: "You must be at least 18 years old to register." }),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});
