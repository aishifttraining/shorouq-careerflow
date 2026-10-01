import { readFile } from "node:fs/promises";
import vm from "node:vm";

const dataScript = await readFile("sample-data/data.js", "utf8");
const appSource = await readFile("app.js", "utf8");
const html = await readFile("index.html", "utf8");
const css = await readFile("styles.css", "utf8");

const context = { window: {}, Date };
vm.createContext(context);
vm.runInContext(dataScript, context);
const demo = context.window.CAREERFLOW_DEMO_DATA;
const today = new Date();
today.setHours(12, 0, 0, 0);
const daysOld = (date) => Math.floor((today - new Date(`${date}T12:00:00`)) / 86400000);

const isExpectedFollowupDue = (status, age) => (status === "Applied" || status === "Interview") && age >= 14;
for (const status of ["Applied", "Interview"]) {
  if (!isExpectedFollowupDue(status, 14)) throw new Error(`${status} applications at 14 days must qualify for follow-up.`);
  if (!demo.applications.some((app) => app.status === status && isExpectedFollowupDue(app.status, daysOld(app.date)))) throw new Error(`Demo ${status} follow-up entry missing.`);
}
for (const status of ["Screening", "Offer", "Rejected"]) {
  if (isExpectedFollowupDue(status, 60)) throw new Error(`${status} applications must never qualify for follow-up.`);
  if (!demo.applications.some((app) => app.status === status)) throw new Error(`Demo status missing: ${status}`);
}
if (!demo.applications.every((app) => ["Applied", "Screening", "Interview", "Offer", "Rejected"].includes(app.status))) throw new Error("Unexpected demo status.");
if (!/function isFollowupDue\(application\)\s*\{\s*return \(application\.status === "Applied" \|\| application\.status === "Interview"\) && getDaysSince\(application\.date\) >= 14;\s*\}/.test(appSource)) throw new Error("Follow-up eligibility must allow only Applied or Interview applications at 14+ days.");
for (const token of ["next-step-card", "dashboard-journey-list", "ai-flow", "map-flow", "sample-data/data.js", "app.js", "Understand the Job", "Discover Your Gaps", "Build Your Readiness Plan", "Prepare for the Interview", "Understand Requirements", "Compare with My CV", "id=\"theme-toggle\""]) if (!html.includes(token)) throw new Error(`Required markup reference missing: ${token}`);
for (const token of ["careerflow-analyzed-applications-v1", "careerflow-theme-v1", "function initializeTheme", "function toggleTheme", "prefers-color-scheme: dark", "isFollowupDue(application)", "function getNextStep", "function isApplicationAnalyzed", "function getJobTextForAnalysis", "function createReadinessPlan", "function compareRole"]) if (!appSource.includes(token)) throw new Error(`Required app behavior missing: ${token}`);
for (const token of [".command-center-grid", ".next-step-card", ".dashboard-journey-list", ".ai-flow", ".map-flow", "@media (max-width: 550px)", "prefers-reduced-motion", "--alert:", "--alert-pale:", "--alert-line:", ".metric-alert::before { background: var(--alert); }", ".followup-panel { border-color: var(--alert-line); background: var(--alert-pale);", ".followup-entry { padding: 16px; border-color: var(--alert-line);", ".application-card.has-followup { border-color: var(--alert-line);", ".followup-assistant { border-left: 4px solid var(--alert);", ":root[data-theme=\"dark\"]", ".theme-toggle"]) if (!css.includes(token)) throw new Error(`Required responsive or theme style missing: ${token}`);
console.log("CareerFlow local regression smoke check passed.");
console.log(`Demo: ${demo.applications.length} applications, ${demo.careerRoles.length} roles, follow-up age ${daysOld(demo.applications[0].date)} days.`);
