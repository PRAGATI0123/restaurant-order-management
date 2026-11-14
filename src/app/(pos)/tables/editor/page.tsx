import type { Metadata } from "next";
import { FloorEditor } from "@/features/tables/components/floor-editor";

export const metadata: Metadata = { title: "Floor Plan Editor" };

// Route: /tables/editor
export default function FloorPlanEditorPage() {
  return <FloorEditor />;
}
