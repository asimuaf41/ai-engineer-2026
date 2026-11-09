// Triage state for the demo issues. It lives in memory only: closing the app resets it.
// Day 26 replaces this with Supabase.
import type { Issue } from "@repo/ai/shared";
import { DEMO_ISSUES, productionScore } from "@repo/ai/shared";
import { createContext, type ReactNode, useContext, useMemo, useReducer } from "react";
import type { TriageStatus } from "@/lib/triage-types";

// What the last triage changed, so Undo can put it back.
export type LastAction = { id: string; from: TriageStatus; to: TriageStatus };

type State = {
  statuses: Record<string, TriageStatus>;
  lastAction: LastAction | null;
  haptics: boolean;
};

type Action =
  | { type: "triage"; id: string; status: TriageStatus }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "setHaptics"; on: boolean };

// Issues that are already fixed in the demo data are not part of triage: they never show in a list,
// so they can't be changed (and can never be re-opened into the score).
const ALREADY_FIXED = new Set(DEMO_ISSUES.filter((issue) => issue.status === "fixed").map((issue) => issue.id));

function initialStatuses(): Record<string, TriageStatus> {
  return Object.fromEntries(DEMO_ISSUES.map((issue) => [issue.id, issue.status]));
}

function createInitialState(): State {
  return { statuses: initialStatuses(), lastAction: null, haptics: true };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "triage": {
      if (!Object.hasOwn(state.statuses, action.id) || ALREADY_FIXED.has(action.id)) return state;
      const from = state.statuses[action.id];
      if (from === action.status) return state;
      return {
        ...state,
        statuses: { ...state.statuses, [action.id]: action.status },
        lastAction: { id: action.id, from, to: action.status },
      };
    }
    case "undo": {
      if (state.lastAction === null) return state;
      const { id, from } = state.lastAction;
      return { ...state, statuses: { ...state.statuses, [id]: from }, lastAction: null };
    }
    case "reset":
      // Back to the starting data. The haptics setting is a preference, so it stays.
      return { ...createInitialState(), haptics: state.haptics };
    case "setHaptics":
      return { ...state, haptics: action.on };
  }
}

type TriageActions = {
  triage: (id: string, status: TriageStatus) => void;
  undo: () => void;
  reset: () => void;
  setHaptics: (on: boolean) => void;
};

// Two contexts: the actions never change, so a component that only needs an action
// (like the "Reset demo" button) does not re-render every time the state changes.
const TriageStateContext = createContext<State | null>(null);
const TriageActionsContext = createContext<TriageActions | null>(null);

export function TriageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // dispatch is stable, so this object is built once.
  const actions = useMemo<TriageActions>(
    () => ({
      triage: (id, status) => dispatch({ type: "triage", id, status }),
      undo: () => dispatch({ type: "undo" }),
      reset: () => dispatch({ type: "reset" }),
      setHaptics: (on) => dispatch({ type: "setHaptics", on }),
    }),
    [],
  );

  return (
    <TriageActionsContext.Provider value={actions}>
      <TriageStateContext.Provider value={state}>{children}</TriageStateContext.Provider>
    </TriageActionsContext.Provider>
  );
}

function useTriageState(): State {
  const value = useContext(TriageStateContext);
  if (value === null) throw new Error("Triage hooks must be used inside <TriageProvider>.");
  return value;
}

export function useTriageActions(): TriageActions {
  const value = useContext(TriageActionsContext);
  if (value === null) throw new Error("useTriageActions must be used inside <TriageProvider>.");
  return value;
}

// Selectors: small hooks so screens never read the whole state shape.

export function useOpenIssues(): Issue[] {
  const { statuses } = useTriageState();
  return useMemo(() => DEMO_ISSUES.filter((issue) => statuses[issue.id] === "open"), [statuses]);
}

// Only open issues cost points, so the score is worked out from the open ones.
export function useScore(): number {
  const openIssues = useOpenIssues();
  return useMemo(
    () => productionScore(openIssues.map(({ severity }) => ({ severity, status: "open" as const }))),
    [openIssues],
  );
}

export function useIssueStatus(id: string): TriageStatus | undefined {
  const { statuses } = useTriageState();
  return Object.hasOwn(statuses, id) ? statuses[id] : undefined;
}

export function useLastAction(): LastAction | null {
  return useTriageState().lastAction;
}

export function useHaptics(): boolean {
  return useTriageState().haptics;
}
