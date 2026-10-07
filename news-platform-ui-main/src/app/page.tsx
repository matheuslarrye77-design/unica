import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default function HomePage(): never {
   redirect(ROUTES.LOGIN);
}
