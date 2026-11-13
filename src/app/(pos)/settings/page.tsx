import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

// Route: /settings
export default function SettingsPage() {
  return (
    <main>
      <h1>Settings</h1>
      <p>
        Tax rate, staff, mock API delay and error switches, and reset demo data. (Built in
        Step 54)
      </p>
    </main>
  );
}
