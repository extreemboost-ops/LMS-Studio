import { useState } from "react";
import { UserRound, Boxes, UsersRound, ShieldCheck, HardDrive, LockKeyhole, CreditCard, ChevronRight, Settings } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { ToggleRow } from "../../components/ui/ToggleRow";
import { BillingSettingsPanel } from "./BillingSettingsPanel";
import { currentUserProfile } from "../../mocks/team.mock";

export function SettingsScreen() {
  const { notify } = useApp();
  const [tab, setTab] = useState("Profile");
  const [profile, setProfile] = useState(currentUserProfile);

  const tabs: [string, typeof UserRound][] = [
    ["Profile", UserRound],
    ["Organization", Boxes],
    ["Billing & Plan", CreditCard],
    ["Team", UsersRound],
    ["Roles & permissions", ShieldCheck],
    ["Storage", HardDrive],
    ["Security", LockKeyhole],
  ];

  const handleSave = () => {
    notify("Workspace settings saved successfully");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, workspace, and security preferences."
      />

      <div className="settings-layout">
        <aside>
          {tabs.map(([x, Icon]) => (
            <button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
              type="button"
            >
              <Icon size={17} />
              {x}
              <ChevronRight size={14} />
            </button>
          ))}
        </aside>

        <section className="panel settings-panel">
          <div className="settings-heading">
            <h2>{tab}</h2>
            <p>
              {tab === "Profile"
                ? "Update your personal details and preferences."
                : `Manage your workspace ${tab.toLowerCase()} settings.`}
            </p>
          </div>

          {tab === "Billing & Plan" ? (
            <BillingSettingsPanel />
          ) : tab === "Profile" ? (
            <>
              <div className="profile-photo">
                <div className="avatar big">{profile.avatarText}</div>
                <div>
                  <button
                    className="btn secondary"
                    onClick={() => notify("Photo upload dialog opened")}
                    type="button"
                  >
                    Change photo
                  </button>
                  <span>JPG, GIF or PNG. 2 MB maximum.</span>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  <span>First name</span>
                  <input
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </label>
                <label>
                  <span>Last name</span>
                  <input
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </label>
                <label className="full">
                  <span>Email address</span>
                  <input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </label>
                <label>
                  <span>Job title</span>
                  <input
                    value={profile.jobTitle}
                    onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                  />
                </label>
                <label>
                  <span>Time zone</span>
                  <select
                    value={profile.timeZone}
                    onChange={(e) => setProfile({ ...profile, timeZone: e.target.value })}
                  >
                    <option value="Pacific Time (UTC−08:00)">Pacific Time (UTC−08:00)</option>
                    <option value="Eastern Time (UTC−05:00)">Eastern Time (UTC−05:00)</option>
                    <option value="UTC (UTC+00:00)">UTC (UTC+00:00)</option>
                    <option value="Central European Time (UTC+01:00)">Central European Time (UTC+01:00)</option>
                  </select>
                </label>
              </div>
            </>
          ) : (
            <div className="settings-placeholder">
              <div>
                <Settings size={26} />
              </div>
              <h3>{tab} settings</h3>
              <p>Configure {tab.toLowerCase()} preferences for Acme Learning.</p>
              <ToggleRow label={`Enable managed ${tab.toLowerCase()}`} checked />
              <ToggleRow label="Send administrator notifications" checked />
            </div>
          )}

          <div className="settings-save">
            <button
              className="btn secondary"
              onClick={() => notify("Settings reverted")}
              type="button"
            >
              Cancel
            </button>
            <button className="btn primary" onClick={handleSave} type="button">
              Save changes
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
