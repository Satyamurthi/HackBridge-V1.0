import { redirect } from "next/navigation";

export default function HostSignupRedirect() {
  redirect("/register/college");
}
