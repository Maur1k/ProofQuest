import { useRef, useState } from "react";
import { useStore } from "@/store/store";
import { BACKUP_MAX_BYTES } from "@/data/backup";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ConfirmDialog";

export function DataControls() {
  const { ready, persistence, busy, exportData, importData, clearData, useTemporarySession } =
    useStore();
  const [working, setWorking] = useState(false);
  const workingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ name: string; text: string } | null>(null);
  const disabled = !ready || busy || working;
  async function perform(work: () => Promise<void>) {
    if (workingRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setMessage(null);
    try {
      await work();
    } catch (error) {
      setMessage(
        error instanceof Error && !error.message.startsWith("[")
          ? error.message
          : "This backup could not be read. Nothing was imported.",
      );
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }
  return (
    <details className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-sm sm:p-5">
      <summary className="min-h-11 cursor-pointer content-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        Data &amp; backup
      </summary>
      <div className="space-y-4 pt-3 leading-relaxed">
        <p>
          Your library belongs to this browser and website address. Export a backup before changing
          devices or hosts. Backups can contain document text, PDFs and your study history; keep
          them private.
        </p>
        <p role="status">
          {persistence === "durable"
            ? "Browser storage is available."
            : persistence === "temporary"
              ? "Temporary session — changes are not saved after closing this tab."
              : "Storage is unavailable. Editing is paused until you choose a temporary session or reload successfully."}
        </p>
        {persistence === "blocked" && (
          <p>
            Recovery export contains readable legacy data and its original source only. Newer data
            that storage cannot open may be absent; this does not replace a complete backup.
            Existing browser records are left untouched.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() =>
              void perform(async () => {
                const text = await exportData();
                const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = "proofquest-backup.json";
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage(
                  "Backup download requested. Check your downloads before removing any data.",
                );
              })
            }
          >
            {persistence === "blocked" ? "Export legacy recovery copy" : "Export backup"}
          </Button>
          {persistence === "blocked" && (
            <Button variant="outline" onClick={useTemporarySession} disabled={disabled}>
              Use temporary session
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={disabled || persistence !== "durable"}
            onClick={() => setConfirmClear(true)}
          >
            Delete browser library
          </Button>
        </div>
        <label className="block space-y-2">
          <span className="font-medium">Import a ProofQuest backup (up to 100 MiB)</span>
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled || persistence !== "durable"}
            className="block min-h-11 w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:min-h-8 file:rounded file:border-0 file:bg-primary file:px-3 file:font-medium file:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void perform(async () => {
                if (file.size > BACKUP_MAX_BYTES)
                  throw new Error("Backup exceeds the 100 MiB recovery limit.");
                setPendingImport({ name: file.name, text: await file.text() });
              });
            }}
          />
        </label>
        <p>
          Import adds missing records and refuses conflicting copies. It never silently overwrites
          your current library. PDF deletion retains saved explanations and results, but removes
          access to the original file.
        </p>
        {message && (
          <p role="status" className="break-words">
            {message}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
        title="Import this backup?"
        description={`Add saved data from ${pendingImport?.name ?? "this file"} to this browser? Conflicts will cancel the entire import.`}
        confirmLabel="Import backup"
        onConfirm={() => {
          const text = pendingImport?.text;
          setPendingImport(null);
          if (text)
            void perform(async () => {
              await importData(text);
              setMessage("Backup imported successfully.");
            });
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Delete this browser library?"
        destructive
        confirmLabel="Delete library"
        description="This permanently removes this site's saved quests, attempts, PDFs and rollback backups in this browser. Export first. Your downloaded backups and other browser profiles are not affected."
        onConfirm={() => {
          setConfirmClear(false);
          void perform(async () => {
            await clearData();
            setMessage("Browser library deleted.");
          });
        }}
      />
    </details>
  );
}
