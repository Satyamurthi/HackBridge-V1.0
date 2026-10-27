import { redirect } from "next/navigation";

export default function RegisterStudentRedirect() {
  redirect("/signup/student");
}
