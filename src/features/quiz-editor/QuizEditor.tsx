import { useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Play,
  Check,
  Plus,
  GripVertical,
  Settings,
  ChevronRight,
  Copy,
  Trash2,
  Link2,
  Image,
  Code2,
  RotateCcw,
  ImagePlus,
  MessageSquareText,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { PropertySection } from "../../components/ui/PropertySection";
import { ToggleRow } from "../../components/ui/ToggleRow";

export function QuizEditor() {
  const { navigate, notify } = useApp();
  const {
    activeProject,
    updateActiveProject,
    questions,
    activeQuestionId,
    setActiveQuestionId,
    addQuestion,
    duplicateQuestion,
    updateQuestion,
    deleteQuestion,
    saveStatus,
    saveCurrentProject,
  } = useContent();

  const currentQuestion = questions.find((q) => q.id === activeQuestionId) || questions[0];

  const handleUpdateTitle = (val: string) => {
    updateQuestion(currentQuestion.id, { title: val });
  };

  const handleSetCorrectOption = (optId: string) => {
    const updatedOptions = currentQuestion.options.map((opt) => ({
      ...opt,
      isCorrect: opt.id === optId,
    }));
    updateQuestion(currentQuestion.id, { options: updatedOptions });
    notify("Correct answer updated");
  };

  const handleOptionTextChange = (optId: string, text: string) => {
    const updatedOptions = currentQuestion.options.map((opt) =>
      opt.id === optId ? { ...opt, text } : opt
    );
    updateQuestion(currentQuestion.id, { options: updatedOptions });
  };

  const handleAddOption = () => {
    const newOptId = `opt-${Date.now()}`;
    const nextChar = String.fromCharCode(65 + currentQuestion.options.length);
    const newOptions = [
      ...currentQuestion.options,
      { id: newOptId, text: `New Option ${nextChar}`, isCorrect: false },
    ];
    updateQuestion(currentQuestion.id, { options: newOptions });
    notify("New answer option added");
  };

  const handleRemoveOption = (optId: string) => {
    if (currentQuestion.options.length <= 2) {
      notify("Questions must have at least 2 options");
      return;
    }
    const newOptions = currentQuestion.options.filter((o) => o.id !== optId);
    updateQuestion(currentQuestion.id, { options: newOptions });
  };

  const handlePointsChange = (delta: number) => {
    const newPts = Math.max(1, currentQuestion.points + delta);
    updateQuestion(currentQuestion.id, { points: newPts });
  };

  const handleShuffle = () => {
    const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5);
    updateQuestion(currentQuestion.id, { options: shuffled });
    notify("Answers shuffled");
  };

  const handleDone = async () => {
    await saveCurrentProject();
    notify("Assessment saved successfully");
    navigate("editor");
  };

  return (
    <div className="quiz-shell">
      <header className="editor-topbar">
        <button
          className="icon-button"
          onClick={() => navigate("editor")}
          title="Return to authoring workspace"
          type="button"
        >
          <ArrowLeft size={19} />
        </button>

        <div className="editor-title">
          <div className="mini-brand">
            <BrainCircuit size={16} />
          </div>
          <div>
            <input
              value={activeProject.title}
              onChange={(e) => updateActiveProject({ title: e.target.value })}
              title="Project title"
            />
            <span>
              <CheckCircle2 size={13} />
              {saveStatus === "saving" ? "Saving changes…" : "All changes saved"}
            </span>
          </div>
        </div>

        <div className="quiz-step">
          <b>Assessment editor</b>
          <span>
            {questions.length} questions · {questions.reduce((a, b) => a + b.points, 0)} points
          </span>
        </div>

        <div className="editor-actions">
          <button className="btn secondary" onClick={() => navigate("preview")} type="button">
            <Play size={15} />
            Preview
          </button>
          <button className="btn primary" onClick={handleDone} type="button">
            <Check size={15} />
            Done
          </button>
        </div>
      </header>

      <div className="quiz-body">
        {/* LEFT NAV: QUESTION LIST */}
        <aside className="question-nav">
          <div className="editor-panel-head">
            <div>
              <b>Questions</b>
              <span>{questions.length} total</span>
            </div>
            <button
              className="icon-button"
              onClick={addQuestion}
              title="Add question"
              type="button"
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="question-list">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={activeQuestionId === q.id ? "active" : ""}
                type="button"
              >
                <span>{i + 1}</span>
                <div>
                  <b>{q.title}</b>
                  <small>{q.type}</small>
                </div>
                <GripVertical size={14} />
              </button>
            ))}
          </div>

          <button
            className="btn secondary full add-question"
            onClick={addQuestion}
            type="button"
          >
            <Plus size={15} />
            Add question
          </button>

          <div className="quiz-nav-settings">
            <button
              type="button"
              onClick={() => notify("Quiz passing criteria: 80% passing score, retry allowed")}
            >
              <Settings size={16} />
              <div>
                <b>Quiz settings</b>
                <span>Pass score, retry, randomize</span>
              </div>
              <ChevronRight size={15} />
            </button>
          </div>
        </aside>

        {/* CENTER: WORKSPACE */}
        <main className="question-workspace">
          <div className="question-canvas">
            <div className="question-canvas-head">
              <div>
                <span>
                  QUESTION {questions.findIndex((q) => q.id === activeQuestionId) + 1} OF{" "}
                  {questions.length}
                </span>
                <StatusBadge status={`${currentQuestion.points} points`} />
              </div>
              <div>
                <button
                  className="icon-button"
                  onClick={() => {
                    duplicateQuestion(currentQuestion.id);
                    notify("Question duplicated");
                  }}
                  title="Duplicate question"
                  type="button"
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => {
                    if (questions.length <= 1) {
                      notify("Cannot delete the only question in the assessment");
                      return;
                    }
                    deleteQuestion(currentQuestion.id);
                    notify("Question deleted");
                  }}
                  title="Delete question"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <label className="field-label">Question</label>
            <div className="rich-input">
              <div className="rich-toolbar">
                <b onClick={() => notify("Bold formatting")}>B</b>
                <i onClick={() => notify("Italic formatting")}>I</i>
                <button
                  type="button"
                  onClick={() => notify("Insert link")}
                >
                  <Link2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => notify("Insert image into prompt")}
                >
                  <Image size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => notify("Code formatting")}
                >
                  <Code2 size={14} />
                </button>
              </div>
              <textarea
                value={currentQuestion.title}
                onChange={(e) => handleUpdateTitle(e.target.value)}
                placeholder="Type your question prompt here…"
              />
            </div>

            <div className="answer-heading">
              <div>
                <label className="field-label">Answer options</label>
                <span>Select the correct answer</span>
              </div>
              <button onClick={handleShuffle} type="button">
                <RotateCcw size={14} />
                Shuffle
              </button>
            </div>

            <div className="answer-options">
              {currentQuestion.options.map((opt) => (
                <div
                  className={`answer-option ${opt.isCorrect ? "correct" : ""}`}
                  key={opt.id}
                >
                  <GripVertical size={15} />
                  <button
                    className="radio"
                    onClick={() => handleSetCorrectOption(opt.id)}
                    type="button"
                    aria-label={`Mark "${opt.text}" as correct`}
                  >
                    {opt.isCorrect && <Check size={13} />}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    placeholder="Option text..."
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: "inherit",
                      color: "inherit",
                      fontFamily: "inherit",
                      flex: 1,
                      minWidth: 0,
                    }}
                  />
                  <button
                    className="icon-button"
                    onClick={() => notify("Option media attachment")}
                    type="button"
                  >
                    <ImagePlus size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => handleRemoveOption(opt.id)}
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                  {opt.isCorrect && <b>Correct</b>}
                </div>
              ))}
            </div>

            <button
              className="add-answer"
              onClick={handleAddOption}
              type="button"
            >
              <Plus size={15} />
              Add answer option
            </button>

            <div className="feedback-box">
              <div>
                <MessageSquareText size={17} />
                <div>
                  <b>Feedback for correct answer</b>
                  <textarea
                    value={currentQuestion.correctFeedback || ""}
                    onChange={(e) =>
                      updateQuestion(currentQuestion.id, { correctFeedback: e.target.value })
                    }
                    placeholder="Feedback shown when learner chooses the correct answer"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT: QUESTION PROPERTIES */}
        <aside className="quiz-properties">
          <div className="editor-panel-head">
            <div>
              <b>Question settings</b>
              <span>{currentQuestion.type}</span>
            </div>
          </div>

          <div className="properties-scroll">
            <PropertySection title="Scoring">
              <label>Points</label>
              <div className="stepper">
                <button onClick={() => handlePointsChange(-1)} type="button">
                  −
                </button>
                <span>{currentQuestion.points}</span>
                <button onClick={() => handlePointsChange(1)} type="button">
                  +
                </button>
              </div>
              <ToggleRow label="Partial scoring" />
            </PropertySection>

            <PropertySection title="Attempts">
              <ToggleRow label="Allow retry" checked />
              <label>Maximum attempts</label>
              <select defaultValue="2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="unlimited">Unlimited</option>
              </select>
              <ToggleRow label="Show solution" checked />
            </PropertySection>

            <PropertySection title="Behavior">
              <ToggleRow label="Randomize answers" checked />
              <ToggleRow label="Require an answer" checked />
              <ToggleRow label="Show feedback instantly" />
            </PropertySection>
          </div>
        </aside>
      </div>
    </div>
  );
}
