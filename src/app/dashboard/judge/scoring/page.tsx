import { redirect } from "next/navigation";

export default function JudgeScoringPage() {
  redirect("/dashboard/judge?tab=scoring");
}
