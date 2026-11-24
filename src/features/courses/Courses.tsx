import { useState } from "react";
import { Plus, BookOpen, ChevronRight, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { initialCourses } from "../../mocks/courses.mock";

export function Courses() {
  const { navigate, notify } = useApp();
  const [courseSearch, setCourseSearch] = useState("");

  const filteredCourses = initialCourses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase()),
  );

  return (
    <>
      <PageHeader title="Courses" subtitle="Organize content into structured learning paths.">
        <button
          className="btn primary"
          onClick={() => notify("New course creation wizard opened — demonstration mode")}
          type="button"
        >
          <Plus size={16} />
          New course
        </button>
      </PageHeader>

      <div className="course-banner">
        <div>
          <span className="eyebrow">FEATURED COURSE</span>
          <h2>New manager foundations</h2>
          <p>8 modules · 2 assessments · 45 minutes</p>
          <div className="avatar-stack">
            <div className="avatar tiny">AK</div>
            <div className="avatar tiny purple">MC</div>
            <div className="avatar tiny teal">PS</div>
            <span>482 learners enrolled</span>
          </div>
        </div>
        <button className="btn white" onClick={() => navigate("editor")} type="button">
          Open course <ChevronRight size={15} />
        </button>
      </div>

      <div className="section-heading">
        <div>
          <h2>All courses</h2>
          <p>{initialCourses.length} active learning paths</p>
        </div>
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder="Search courses"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="course-grid">
        {filteredCourses.map((c, i) => (
          <div className="course-card" key={c.id}>
            <div className={`course-cover c${c.coverIndex}`}>
              <BookOpen size={24} />
              <span>{c.code}</span>
            </div>
            <div>
              <StatusBadge status={c.status} />
              <h3>{c.title}</h3>
              <p>
                {c.modulesCount} modules · {c.durationMinutes} min
              </p>
              <div className="card-progress">
                <div>
                  <span>{c.learnersCount} learners</span>
                  <b>{c.completionRate}% completion</b>
                </div>
                <div className="progress">
                  <i style={{ width: `${c.completionRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
