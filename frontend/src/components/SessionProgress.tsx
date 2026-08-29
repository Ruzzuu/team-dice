import { CalendarDays, Check, LockKeyhole, Play, Settings2, UsersRound } from "lucide-react";
import type { Schedule, Session, SessionStep } from "../types";

const steps: Array<{ id: SessionStep; label: string; icon: typeof Settings2 }> = [
  { id: "setup", label: "Setup", icon: Settings2 },
  { id: "players", label: "Players", icon: UsersRound },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "play", label: "Play", icon: Play },
];

export function SessionProgress({
  session,
  schedule,
  activeStep,
  onSelect,
}: {
  session: Session;
  schedule?: Schedule;
  activeStep: SessionStep;
  onSelect: (step: SessionStep) => void;
}) {
  const completeSteps = new Set<SessionStep>(["setup"]);
  if (session.players.length >= 2) completeSteps.add("players");
  if (schedule) completeSteps.add("schedule");
  if (session.status === "ACTIVE" || session.status === "COMPLETED") completeSteps.add("play");

  const locked = (step: SessionStep) => step === "schedule"
    ? session.players.length < 2
    : step === "play" && !schedule;

  const stateText = (step: SessionStep) => {
    if (step === activeStep) return "Current step";
    if (completeSteps.has(step)) return "Complete";
    if (locked(step)) return "Needs previous step";
    return "Ready";
  };

  return (
    <ol className="session-progress" aria-label="Session setup progress">
      {steps.map((step) => {
        const complete = completeSteps.has(step.id);
        const current = activeStep === step.id;
        const isLocked = locked(step.id);
        const Icon = isLocked ? LockKeyhole : complete && !current ? Check : step.icon;
        return (
          <li key={step.id} className={current ? "is-current" : complete ? "is-complete" : isLocked ? "is-locked" : ""}>
            <button type="button" onClick={() => onSelect(step.id)} aria-current={current ? "step" : undefined} aria-disabled={isLocked}>
              <span className="session-progress__icon"><Icon /></span>
              <span className="session-progress__copy"><strong>{step.label}</strong><small>{stateText(step.id)}</small></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
