import type { CampaignProject } from "@/apps/campaign/lib/types";

const encoder = new TextEncoder();
const pdfEscape = (value: string) =>
  value.replace(/([\\()])/g, "\\$1").replace(/[^\x20-\x7e]/g, "-");
const csv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function buildStrategyPdf(campaign: CampaignProject): Uint8Array {
  const lines = [
    campaign.name,
    "",
    "STRATEGY",
    campaign.strategy.positioning,
    campaign.strategy.keyMessage,
    "",
    "MESSAGE PILLARS",
    ...campaign.strategy.pillars,
    "",
    "AUDIENCE INSIGHT",
    campaign.strategy.audienceInsight,
    "",
    "CAMPAIGN CONCEPT",
    campaign.concept.bigIdea,
    campaign.concept.tagline,
    campaign.concept.visualWorld,
  ];
  const wrapped = lines
    .flatMap((line) => line.match(/.{1,82}(?:\s|$)/g)?.map((part) => part.trim()) ?? [line])
    .slice(0, 42);
  const stream = [
    "BT",
    "/F1 12 Tf",
    "72 750 Td",
    ...wrapped.flatMap((line, index) =>
      index === 0 ? [`(${pdfEscape(line)}) Tj`] : ["0 -16 Td", `(${pdfEscape(line)}) Tj`]
    ),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(output).length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n"
    )}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(output);
}

export function buildPlanCsv(campaign: CampaignProject) {
  return [
    "title,channel,owner,status,due_offset_days,brief",
    ...campaign.plan.map((item) =>
      [
        csv(item.title),
        csv(item.channel),
        csv(item.ownerModule),
        csv(item.content ? "approved" : "planned"),
        csv(item.dueOffset),
        csv(item.brief),
      ].join(",")
    ),
  ].join("\n");
}

export function buildCampaignMarkdown(campaign: CampaignProject) {
  return `# ${campaign.name}\n\n## Strategy\n\n${campaign.strategy.positioning}\n\n**Key message:** ${campaign.strategy.keyMessage}\n\n${campaign.strategy.pillars.map((pillar) => `- ${pillar}`).join("\n")}\n\n## Concept\n\n**${campaign.concept.bigIdea}** — ${campaign.concept.tagline}\n\n${campaign.concept.visualWorld}\n\n## Deliverables\n\n${campaign.plan.map((item) => `- ${item.title} · ${item.channel} · ${item.dueOffset >= 0 ? "+" : ""}${item.dueOffset} days`).join("\n")}`;
}
