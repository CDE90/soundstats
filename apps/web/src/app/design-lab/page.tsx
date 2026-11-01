import { redirect } from "next/navigation";

// Keep the original review link useful now that its layouts are in the app.
export default function LayoutStudies() {
    redirect("/dashboard");
}
