import { useState } from "react";
import { CheckCircle2, Eye, Lightbulb, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./common";
import { checkAnswer, emptyResponse, isResponseEmpty, type CheckResult } from "@/domain/checking";
import { QUESTION_TYPE_LABEL } from "@/domain/subjects";
import type { AnswerRecord, AnswerResponse, Question } from "@/domain/types";
import { cn } from "@/lib/utils";

export function QuestionPractice({
  question,
  record,
  hintsShown,
  isLast,
  onHint,
  onSubmit,
  onNext,
}: {
  question: Question;
  record: AnswerRecord | undefined;
  hintsShown: number;
  isLast: boolean;
  onHint: (count: number) => void;
  onSubmit: (r: { response: AnswerResponse; correct: boolean; revealed: boolean }) => void;
  onNext: () => void;
}) {
  const [response, setResponse] = useState<AnswerResponse>(() => record?.response ?? emptyResponse(question));
  const answered = !!record;
  const result: CheckResult | null = record ? checkAnswer(question, record.response) : null;
  const hints = question.hints;

  const check = () => {
    if (answered || isResponseEmpty(response)) return;
    const r = checkAnswer(question, response);
    onSubmit({ response, correct: r.correct, revealed: false });
  };
  const reveal = () => {
    if (answered) return;
    onSubmit({ response, correct: false, revealed: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">{QUESTION_TYPE_LABEL[question.type]}</p>
        <h2 className="mt-1 text-lg font-semibold leading-snug">{question.prompt}</h2>
      </div>
      {question.type !== "fix" && <CodeBlock code={question.code} language={question.language} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="space-y-3"
      >
        {question.type === "predict" && response.type === "predict" && (
          <div className="space-y-1.5">
            <label htmlFor="answer-output" className="text-sm font-medium">
              Your predicted output
            </label>
            <textarea
              id="answer-output"
              className="field min-h-24 font-mono text-[13px]"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              readOnly={answered}
              value={response.output}
              onChange={(e) => setResponse({ type: "predict", output: e.target.value })}
              placeholder="Type exactly what is printed, one line per line"
            />
          </div>
        )}

        {question.type === "trace" && response.type === "trace" && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Trace table</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Step</th>
                  {question.variables.map((v) => (
                    <th key={v} scope="col" className="px-2 py-2 text-left font-mono text-xs font-medium">{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {question.steps.map((s, i) => (
                  <tr key={i} className="border-t border-border">
                    <th scope="row" className="px-2 py-1.5 text-left text-xs font-normal text-muted-foreground">{s.label}</th>
                    {question.variables.map((v, j) => {
                      const ok = result?.cellResults?.[i]?.[j];
                      return (
                        <td key={v} className="px-1 py-1.5">
                          <input
                            aria-label={`${v} at ${s.label}`}
                            className={cn(
                              "field min-w-14 px-2 font-mono text-[13px]",
                              answered && ok === true && "border-success",
                              answered && ok === false && "border-destructive",
                            )}
                            autoCapitalize="off"
                            autoCorrect="off"
                            readOnly={answered}
                            value={response.cells[i]?.[j] ?? ""}
                            onChange={(e) =>
                              setResponse({
                                type: "trace",
                                cells: response.cells.map((row, ri) => (ri === i ? row.map((c, cj) => (cj === j ? e.target.value : c)) : row)),
                              })
                            }
                          />
                          {answered && ok === false && <span className="sr-only">incorrect</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {question.type === "fix" && response.type === "fix" && (
          <div className="space-y-1.5">
            <label htmlFor="answer-fix" className="text-sm font-medium">
              Edit the code to fix the bug <span className="font-normal text-muted-foreground">({question.language})</span>
            </label>
            <textarea
              id="answer-fix"
              className="field min-h-48 bg-code font-mono text-[13px] text-code-foreground"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              readOnly={answered}
              value={response.code}
              onChange={(e) => setResponse({ type: "fix", code: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Compared to the saved fix as text; spacing and blank lines are ignored.</p>
          </div>
        )}

        {hintsShown > 0 && (
          <ul className="space-y-2" aria-label="Hints">
            {hints.slice(0, hintsShown).map((h, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-warning/10 p-3 text-sm text-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {!answered && (
          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={isResponseEmpty(response)}>
              Check answer
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={hintsShown >= hints.length} onClick={() => onHint(hintsShown + 1)}>
                <Lightbulb aria-hidden />
                {hints.length === 0 ? "No hints" : hintsShown >= hints.length ? "No more hints" : `Show hint (${hints.length - hintsShown})`}
              </Button>
              <Button type="button" variant="outline" onClick={reveal}>
                <Eye aria-hidden /> Reveal answer
              </Button>
            </div>
          </div>
        )}
      </form>

      {record && (
        <section aria-live="polite" className="space-y-3">
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl p-3 text-sm",
              record.revealed ? "bg-secondary" : record.correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {record.revealed ? <Eye className="h-5 w-5 shrink-0" aria-hidden /> : record.correct ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> : <XCircle className="h-5 w-5 shrink-0" aria-hidden />}
            <p className="font-semibold">
              {record.revealed
                ? "Answer revealed — counted as not correct."
                : record.correct
                  ? record.hintsUsed > 0
                    ? "Correct (with a hint — mastery unchanged)."
                    : "Correct!"
                  : "Not quite."}
            </p>
          </div>
          {(!record.correct || record.revealed) && <ExpectedAnswer question={question} />}
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Explanation</p>
            <p className="mt-1 text-sm leading-relaxed">{question.explanation}</p>
          </div>
          <Button className="w-full" onClick={onNext} autoFocus>
            {isLast ? "Finish & see results" : "Next question"}
          </Button>
        </section>
      )}
    </div>
  );
}

export function ExpectedAnswer({ question }: { question: Question }) {
  if (question.type === "predict")
    return (
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Expected output</p>
        <CodeBlock code={question.expectedOutput} />
      </div>
    );
  if (question.type === "fix")
    return (
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Corrected code</p>
        <CodeBlock code={question.fixedCode} language={question.language} />
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <caption className="px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Expected trace</caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Step</th>
            {question.variables.map((v) => (
              <th key={v} scope="col" className="px-2 py-1.5 text-left font-mono text-xs">{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.steps.map((s, i) => (
            <tr key={i} className="border-t border-border">
              <th scope="row" className="px-2 py-1.5 text-left text-xs font-normal text-muted-foreground">{s.label}</th>
              {s.values.map((v, j) => (
                <td key={j} className="px-2 py-1.5 font-mono text-[13px]">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
