import { useState } from "react";
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ShieldCheck,
  Menu,
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import type { DevicePreviewMode } from "../../types/editor.types";

export function PreviewScreen() {
  const { navigate, notify } = useApp();
  const { activeProject, questions, slides } = useContent();

  const [device, setDevice] = useState<DevicePreviewMode>("desktop");
  const [step, setStep] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const activeQ = questions[0] || {
    id: 1,
    title: "What should you do first when you notice a liquid spill?",
    type: "Multiple choice",
    points: 2,
    correctFeedback: "Securing the area helps prevent slips while the spill is handled safely.",
    explanation: "Always control immediate risk before attempting cleanup. Follow your workplace reporting procedure.",
    options: [
      { id: "1", text: "Place a warning sign and report it", isCorrect: true },
      { id: "2", text: "Walk around it and continue working", isCorrect: false },
      { id: "3", text: "Clean it without protective equipment", isCorrect: false },
    ],
  };

  const isCurrentSelectionCorrect =
    selectedAnswerIndex !== null && activeQ.options[selectedAnswerIndex]?.isCorrect;

  const handleNextStep = () => {
    if (step === 0) {
      if (isCurrentSelectionCorrect) {
        setEarnedPoints(activeQ.points || 1);
      } else {
        setEarnedPoints(0);
      }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setComplete(true);
      notify("Course preview completed!");
    }
  };

  const handleRestart = () => {
    setStep(0);
    setSelectedAnswerIndex(null);
    setComplete(false);
    setEarnedPoints(0);
    notify("Preview simulation reset to beginning");
  };

  const scorePercentage = Math.round(
    (earnedPoints / Math.max(1, activeQ.points || 1)) * 100
  );

  return (
    <div className="preview-page">
      <header className="preview-topbar">
        <button className="btn secondary" onClick={() => navigate("editor")} type="button">
          <X size={16} />
          Exit preview
        </button>

        <div>
          <b>Learner preview</b>
          <span>{activeProject.title}</span>
        </div>

        <div className="device-switch">
          {[
            ["desktop", Monitor, "Desktop view (100%)"],
            ["tablet", Tablet, "Tablet view (768px)"],
            ["mobile", Smartphone, "Mobile view (375px)"],
          ].map(([d, Icon, tooltip]) => {
            const IconComp = Icon as typeof Monitor;
            return (
              <button
                key={d as string}
                onClick={() => setDevice(d as DevicePreviewMode)}
                className={device === d ? "active" : ""}
                title={tooltip as string}
                type="button"
              >
                <IconComp size={17} />
              </button>
            );
          })}
        </div>

        <button className="btn secondary" onClick={handleRestart} type="button">
          <RotateCcw size={15} />
          Restart
        </button>
      </header>

      <main className="preview-stage">
        <div className={`device-frame ${device}`}>
          {!complete ? (
            <div className="learner-screen">
              <header>
                <div>
                  <ShieldCheck size={18} />
                  NORTHSTAR ACADEMY
                </div>
                <span>{activeProject.title}</span>
                <button
                  type="button"
                  onClick={() => notify("Learner navigation menu opened")}
                >
                  <Menu size={18} />
                </button>
              </header>

              <div className="learner-progress">
                <i style={{ width: `${(step + 1) * 33.3}%` }} />
              </div>

              <div className="learner-content">
                {step === 0 ? (
                  <>
                    <span className="lesson-label">LESSON 01 · KNOWLEDGE CHECK</span>
                    <h1>{activeQ.title}</h1>
                    <p>
                      You notice a liquid spill near a busy walkway. Choose the safest first action.
                    </p>
                    <div className="preview-answers">
                      {activeQ.options.map((opt, i) => (
                        <button
                          className={selectedAnswerIndex === i ? "selected" : ""}
                          onClick={() => setSelectedAnswerIndex(i)}
                          key={opt.id || opt.text}
                          type="button"
                        >
                          <span>{String.fromCharCode(65 + i)}</span>
                          {opt.text}
                          {selectedAnswerIndex === i && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                  </>
                ) : step === 1 ? (
                  <>
                    <div className="result-icon">
                      {isCurrentSelectionCorrect ? (
                        <CheckCircle2 size={30} color="#16a34a" />
                      ) : (
                        <AlertCircle size={30} color="#dc2626" />
                      )}
                    </div>
                    <h1>{isCurrentSelectionCorrect ? "That’s correct!" : "Review Required"}</h1>
                    <p>
                      {isCurrentSelectionCorrect
                        ? activeQ.correctFeedback ||
                          "Securing the area helps prevent slips while the spill is handled safely."
                        : "That response was not quite right. Review the guidelines below to proceed safely."}
                    </p>
                    <div className="explain-card">
                      <b>Why this matters</b>
                      <span>
                        {activeQ.explanation ||
                          "Always control immediate risk before attempting cleanup. Follow your workplace reporting procedure."}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="lesson-label">SUMMARY</span>
                    <h1>Key safety takeaways</h1>
                    <p>Small actions make a safer workplace for everyone.</p>
                    <div className="takeaway-list">
                      <div>
                        <CheckCircle2 size={16} />
                        Identify hazards early
                      </div>
                      <div>
                        <CheckCircle2 size={16} />
                        Secure and report unsafe areas
                      </div>
                      <div>
                        <CheckCircle2 size={16} />
                        Follow approved procedures
                      </div>
                    </div>
                  </>
                )}
              </div>

              <footer>
                <button
                  className="btn secondary"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  type="button"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <span>{step + 1} / 3</span>
                <button
                  className="btn primary"
                  disabled={step === 0 && selectedAnswerIndex === null}
                  onClick={handleNextStep}
                  type="button"
                >
                  {step === 2 ? "Finish" : "Continue"}
                  <ChevronRight size={15} />
                </button>
              </footer>
            </div>
          ) : (
            <div className="completion-screen">
              <div className="completion-mark">
                <Check size={32} />
              </div>
              <span>COURSE COMPLETE</span>
              <h1>Great work!</h1>
              <p>You’ve completed {activeProject.title}.</p>
              <div className="score-card">
                <div>
                  <strong>{scorePercentage}%</strong>
                  <span>Final score</span>
                </div>
                <i />
                <div>
                  <strong>02:15</strong>
                  <span>Time spent</span>
                </div>
                <i />
                <div>
                  <strong>{slides.length} / {slides.length}</strong>
                  <span>Slides viewed</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  className="btn secondary"
                  onClick={() => navigate("editor")}
                  type="button"
                >
                  Return to editor
                </button>
                <button
                  className="btn primary"
                  onClick={() => navigate("library")}
                  type="button"
                >
                  Return to library
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
