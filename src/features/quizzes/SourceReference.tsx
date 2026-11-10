import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { McqQuestion } from "@/domain/quiz";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";

export function SourceReference({ source }: { source: McqQuestion["sources"][number] }) {
  const { getSourceDocument } = useStore();
  const [state, setState] = useState<{ name: string; pageCount: number } | null | undefined>();
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setState(undefined);
    void getSourceDocument(source.documentId)
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [getSourceDocument, source.documentId, generation]);
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium">Source · page {source.page}</p>
      <blockquote className="whitespace-pre-wrap break-words text-muted-foreground">
        {source.excerpt}
      </blockquote>
      <p className="text-xs text-muted-foreground">Excerpt retained with this quiz version.</p>
      {failed ? (
        <>
          <p>PDF availability could not be checked.</p>
          <Button variant="outline" onClick={() => setGeneration((n) => n + 1)}>
            Retry source check
          </Button>
        </>
      ) : state === undefined ? (
        <p role="status">Checking saved PDF…</p>
      ) : !state || source.page > state.pageCount ? (
        <p>
          Original PDF page unavailable in this browser. The saved explanation and score are
          unchanged.
        </p>
      ) : (
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          to="/documents/$documentId"
          params={{ documentId: source.documentId }}
          search={{ page: source.page }}
        >
          Open {state.name}, page {source.page}
        </Link>
      )}
    </div>
  );
}
