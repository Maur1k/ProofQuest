import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil, Play, Trash2 } from "lucide-react";
import type { Attempt, Quest } from "@/domain/types";
import { getSubject } from "@/domain/subjects";
import {
  attemptSummary,
  latestCompleted,
  pct,
  questStatus,
  unfinishedAttempt,
} from "@/domain/stats";
import { useStore } from "@/store/store";
import { DifficultyPill, Pill, ProgressBar } from "./common";
import { ConfirmDialog } from "./ConfirmDialog";

export function QuestCard({
  quest,
  attempts,
  showActions = true,
}: {
  quest: Quest;
  attempts: Attempt[];
  showActions?: boolean;
}) {
  const { deleteQuest } = useStore();
  const [confirm, setConfirm] = useState(false);
  const status = questStatus(quest.id, attempts);
  const open = unfinishedAttempt(quest.id, attempts);
  const last = latestCompleted(quest.id, attempts);
  const total = quest.questions.length;
  const answered = open ? Object.keys(open.answers).length : 0;

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{quest.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getSubject(quest.subjectId)?.short} · {quest.topic} · {total} question
            {total === 1 ? "" : "s"}
          </p>
        </div>
        <DifficultyPill difficulty={quest.difficulty} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {status === "completed" && last && (
          <Pill tone="success">Completed · {pct(attemptSummary(last).accuracy)}</Pill>
        )}
        {status === "in-progress" && (
          <Pill tone="primary">
            In progress · {answered}/{total}
          </Pill>
        )}
        {status === "new" && <Pill>Not started</Pill>}
      </div>
      {status === "in-progress" && (
        <div className="mt-2">
          <ProgressBar value={total ? answered / total : 0} label={`${quest.title} progress`} />
        </div>
      )}
      {showActions && (
        <div className="mt-3 flex items-center gap-2">
          {total > 0 ? (
            <Link
              to="/practice/$questId"
              params={{ questId: quest.id }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Play className="h-4 w-4" aria-hidden />{" "}
              {status === "in-progress"
                ? "Resume"
                : status === "completed"
                  ? "Practice again"
                  : "Start"}
            </Link>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">Add questions to practice.</span>
          )}
          <Link
            to="/quests/$questId/edit"
            params={{ questId: quest.id }}
            aria-label={`Edit ${quest.title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-input text-foreground hover:bg-accent"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
          <button
            onClick={() => setConfirm(true)}
            aria-label={`Delete ${quest.title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-input text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this quest?"
        description={`"${quest.title}" and its questions will be permanently removed. Completed attempts stay in your progress history.`}
        confirmLabel="Delete quest"
        destructive
        onConfirm={() => deleteQuest(quest.id)}
      />
    </article>
  );
}
