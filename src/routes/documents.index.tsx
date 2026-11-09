import { createFileRoute } from "@tanstack/react-router";
import { DocumentLibrary } from "@/features/documents/DocumentLibrary";
export const Route = createFileRoute("/documents/")({ component: DocumentLibrary });
