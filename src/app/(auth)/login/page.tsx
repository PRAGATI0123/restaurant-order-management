import type { Metadata } from "next";
import { UserPicker } from "@/features/auth/components/user-picker";

export const metadata: Metadata = { title: "Login" };

// Route: /login (and "/", which redirects here: the login page is the front door)
// Step 1: choose who's working. "(auth)" keeps it out of the URL and away from
// the POS sidebar; the layout next to this file adds the restaurant photo side.
export default function LoginPage() {
  return <UserPicker />;
}
