import { createVersionedStorage } from "@/platform/lib/storage";

export type DeliverableStatus = "planned" | "generating" | "draft" | "approved";

export interface Deliverable {
  id: string;
  moduleId: string;
  projectId: string;
  kind: string;
  format: string;
  status: DeliverableStatus;
  title: string;
  thumbUrl?: string;
  assetRefs: string[];
  createdAt: string;
  updatedAt: string;
}

const deliverableStorage = createVersionedStorage<Deliverable[]>({
  namespace: "platform",
  key: "deliverables",
  version: 2,
  fallback: () => [],
  legacyKeys: ["mf.deliverables"],
  migrate: (data) => {
    if (!Array.isArray(data)) return [];
    return (data as Deliverable[]).map((item) => ({
      ...item,
      thumbUrl:
        item.thumbUrl ??
        item.assetRefs.find(
          (ref) =>
            ref.startsWith("data:image/") ||
            ref.startsWith("http") ||
            ref.startsWith("asset:") ||
            ref.startsWith("file:")
        ),
    }));
  },
});

export function deliverableThumbnail(deliverables: Deliverable[], projectId: string) {
  return deliverables.find((item) => item.projectId === projectId && item.thumbUrl)?.thumbUrl;
}

function readDeliverables(): Deliverable[] {
  return deliverableStorage.read();
}

function writeDeliverables(deliverables: Deliverable[]) {
  deliverableStorage.write(deliverables);
}

export function listDeliverables(
  filter: Partial<Pick<Deliverable, "moduleId" | "projectId">> = {}
): Deliverable[] {
  return readDeliverables().filter(
    (item) =>
      (!filter.moduleId || item.moduleId === filter.moduleId) &&
      (!filter.projectId || item.projectId === filter.projectId)
  );
}

export function saveDeliverable(deliverable: Deliverable): Deliverable {
  const timestamp = new Date().toISOString();
  const next = {
    ...deliverable,
    updatedAt: timestamp,
    createdAt: deliverable.createdAt || timestamp,
  };
  const deliverables = readDeliverables();
  const index = deliverables.findIndex((item) => item.id === next.id);
  if (index >= 0) deliverables[index] = next;
  else deliverables.unshift(next);
  writeDeliverables(deliverables);
  return next;
}

export function upsertDeliverables(items: Deliverable[]): Deliverable[] {
  return items.map(saveDeliverable);
}

export function createDeliverable(
  input: Omit<Deliverable, "id" | "createdAt" | "updatedAt">
): Deliverable {
  const timestamp = new Date().toISOString();
  return saveDeliverable({
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  });
}

export function deleteDeliverables(filter: Partial<Pick<Deliverable, "moduleId" | "projectId">>) {
  const retained = readDeliverables().filter(
    (item) =>
      !(
        (!filter.moduleId || item.moduleId === filter.moduleId) &&
        (!filter.projectId || item.projectId === filter.projectId)
      )
  );
  writeDeliverables(retained);
}

export function deleteDeliverable(id: string) {
  writeDeliverables(readDeliverables().filter((deliverable) => deliverable.id !== id));
}
