import type { CampaignPlanItem, CampaignProject } from "@/apps/campaign/lib/types";

export function campaignItemDate(launchDate: string, dueOffset: number) {
  const date = new Date(`${launchDate}T12:00:00`);
  date.setDate(date.getDate() + dueOffset);
  return date;
}

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const day = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

export function buildCampaignIcs(project: CampaignProject) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = project.plan.map((item) => {
    const start = campaignItemDate(project.launchDate, item.dueOffset);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return ["BEGIN:VEVENT", `UID:${item.id}@director-studio`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(end)}`, `SUMMARY:${escapeIcs(item.title)}`, `DESCRIPTION:${escapeIcs(`${item.brief}\nOwner: ${item.ownerModule}`)}`, `CATEGORIES:${item.channel.toUpperCase()}`, "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wheelbarrow//Director Studio//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeIcs(project.name)}`, ...events, "END:VCALENDAR", ""].join("\r\n");
}

export function groupPlanByDate(project: CampaignProject): Array<{ date: Date; items: CampaignPlanItem[] }> {
  const groups = new Map<string, CampaignPlanItem[]>();
  for (const item of project.plan) {
    const key = campaignItemDate(project.launchDate, item.dueOffset).toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date: new Date(`${date}T12:00:00`), items }));
}
