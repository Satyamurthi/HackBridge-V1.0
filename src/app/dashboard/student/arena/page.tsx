import { redirect } from "next/navigation";

export default function ArenaIndexPage({
  searchParams,
}: {
  searchParams?: { teamId?: string };
}) {
  if (searchParams?.teamId) {
    redirect(`/dashboard/student/arena/${searchParams.teamId}`);
  }
  redirect("/dashboard/student");
}
