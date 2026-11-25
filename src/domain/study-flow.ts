import type { SourceRevision } from "./study-source";
import type { StudyChoice } from "./study-choice";

export const STUDY_STEPS = ["Add material", "Choose study mode", "Review and create"] as const;
export type StudyStep = 0 | 1 | 2;
/** Transient UI state only. Saved records stay in the existing repositories. */
export interface StudyFlowState {
  step: StudyStep;
  source: SourceRevision | null;
  selected: string[];
  choice: StudyChoice | null;
  consent: boolean;
  dirty: boolean;
  operation: "saving" | "generating" | null;
}
export const initialStudyFlow: StudyFlowState = {
  step: 0,
  source: null,
  selected: [],
  choice: null,
  consent: false,
  dirty: false,
  operation: null,
};
export type StudyFlowAction =
  | { type: "reset" }
  | { type: "source-edited" }
  | { type: "source-saved"; source: SourceRevision; selected: string[] }
  | { type: "select"; selected: string[] }
  | { type: "choose"; choice: StudyChoice }
  | { type: "consent"; consent: boolean }
  | { type: "begin"; operation: "saving" | "generating" }
  | { type: "settled" }
  | { type: "back" }
  | { type: "continue" };
function validSelection(source: SourceRevision | null, selected: string[]) {
  return (
    !!source &&
    source.kind !== "sample" &&
    selected.length > 0 &&
    new Set(selected).size === selected.length &&
    selected.every((id) => source.segments.some((s) => s.id === id))
  );
}
export function canContinueStudy(state: StudyFlowState) {
  return (
    !state.operation &&
    !state.dirty &&
    validSelection(state.source, state.selected) &&
    (state.step === 0 || (state.step === 1 && state.choice !== null))
  );
}
export function shouldWarnBeforeLeavingStudy(state: StudyFlowState) {
  return state.dirty || state.operation !== null;
}
export function studyFlowReducer(state: StudyFlowState, action: StudyFlowAction): StudyFlowState {
  // Ignore double clicks and selection changes during a save/request.
  if (state.operation && action.type !== "settled" && action.type !== "source-saved") return state;
  switch (action.type) {
    case "reset":
      return { ...initialStudyFlow };
    case "source-edited":
      return { ...state, step: 0, dirty: true, consent: false };
    case "source-saved":
      if (state.operation !== "saving" || !validSelection(action.source, action.selected))
        return state;
      return {
        ...state,
        source: action.source,
        selected: [...action.selected],
        dirty: false,
        consent: false,
        operation: null,
      };
    case "select":
      if (
        state.step !== 0 ||
        !state.source ||
        new Set(action.selected).size !== action.selected.length ||
        action.selected.some((id) => !state.source!.segments.some((s) => s.id === id))
      )
        return state;
      return { ...state, selected: [...action.selected], consent: false };
    case "choose":
      return state.step === 1 ? { ...state, choice: action.choice, consent: false } : state;
    case "consent":
      return state.step === 2 ? { ...state, consent: action.consent } : state;
    case "begin":
      if (action.operation === "saving" && state.step !== 0) return state;
      if (
        action.operation === "generating" &&
        (state.step !== 2 ||
          !state.consent ||
          state.dirty ||
          !state.choice ||
          !validSelection(state.source, state.selected))
      )
        return state;
      return { ...state, operation: action.operation };
    case "settled":
      return { ...state, operation: null };
    case "back":
      return { ...state, step: state.step === 2 ? 1 : 0 };
    case "continue":
      return canContinueStudy(state) ? { ...state, step: state.step === 0 ? 1 : 2 } : state;
  }
}
