/**
 * Encrypted local persistence layer for the desktop app.
 * In Electron, data is stored through secureStore in the main process, which
 * encrypts files in app userData. No credit report/client/letter data is kept
 * in browser localStorage in production.
 */

import type { Client, CreditReportFile, NegativeItem, DisputeLetter, DisputeCase } from "@/types";
import { secureGetJson, secureRemove, secureSetJson } from "./secureStorageService";

interface DatabaseSnapshot {
  clients: Client[];
  reports: CreditReportFile[];
  negativeItems: NegativeItem[];
  letters: DisputeLetter[];
  disputeCases: DisputeCase[];
}

const STORAGE_KEY = "crap.secure.database.v3";

export const DEFAULT_CLIENT_ID = "client-default";

const defaultClient: Client = {
  id: DEFAULT_CLIENT_ID,
  fullName: "Default User",
  email: "",
  phone: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  activeDisputes: 0,
  reportsCount: 0,
  avatarColor: "#5b8def",
};

const seed: DatabaseSnapshot = {
  clients: [defaultClient],
  reports: [],
  negativeItems: [],
  letters: [],
  disputeCases: [],
};

async function readDb(): Promise<DatabaseSnapshot> {
  const parsed = await secureGetJson<Partial<DatabaseSnapshot>>(STORAGE_KEY);
  if (!parsed) {
    await writeDb(seed);
    return clone(seed);
  }
  const snapshot = sanitizeSnapshot({
    clients: parsed.clients?.length ? parsed.clients : [defaultClient],
    reports: parsed.reports ?? [],
    negativeItems: parsed.negativeItems ?? [],
    letters: parsed.letters ?? [],
    disputeCases: parsed.disputeCases ?? [],
  });
  await writeDb(snapshot);
  return snapshot;
}

async function writeDb(next: DatabaseSnapshot) {
  await secureSetJson(STORAGE_KEY, next);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeSnapshot(db: DatabaseSnapshot): DatabaseSnapshot {
  const mockClientIds = new Set(
    db.clients
      .filter((client) => /^(Selen Swift|Devon Lane|Wade Warren|Darlene Robertson)$/i.test(client.fullName))
      .map((client) => client.id)
  );
  const mockReportIds = new Set(
    db.reports
      .filter((report) => mockClientIds.has(report.clientId) || /^Selen_Swift_/i.test(report.fileName))
      .map((report) => report.id)
  );

  const clients = db.clients
    .filter((client) => !mockClientIds.has(client.id))
    .map((client) =>
      client.id === DEFAULT_CLIENT_ID
        ? { ...defaultClient, ...client, fullName: client.fullName || defaultClient.fullName }
        : client
    );

  if (!clients.some((client) => client.id === DEFAULT_CLIENT_ID)) {
    clients.unshift(defaultClient);
  }

  return {
    clients,
    reports: db.reports.filter((report) => !mockReportIds.has(report.id) && !mockClientIds.has(report.clientId)),
    negativeItems: db.negativeItems.filter((item) => !mockReportIds.has(item.reportId)),
    letters: db.letters.filter((letter) => !mockClientIds.has(letter.clientId)),
    disputeCases: db.disputeCases.filter((caseItem) => !mockClientIds.has(caseItem.clientId)),
  };
}

function updateClientCounts(db: DatabaseSnapshot): DatabaseSnapshot {
  const clients = db.clients.map((client) => {
    const reportsCount = db.reports.filter((r) => r.clientId === client.id).length;
    const activeDisputes = db.disputeCases.filter((d) => d.clientId === client.id && d.status !== "Removed").length;
    return { ...client, reportsCount, activeDisputes };
  });
  return { ...db, clients };
}

export async function getClients(): Promise<Client[]> {
  return updateClientCounts(await readDb()).clients;
}

export async function getClient(id: string): Promise<Client | undefined> {
  return updateClientCounts(await readDb()).clients.find((c) => c.id === id);
}

export async function addClient(input: Omit<Client, "id" | "createdAt" | "activeDisputes" | "reportsCount">): Promise<Client> {
  const db = await readDb();
  const client: Client = {
    ...input,
    id: `client-${Date.now()}`,
    createdAt: new Date().toISOString(),
    activeDisputes: 0,
    reportsCount: 0,
  };
  await writeDb(updateClientCounts({ ...db, clients: [client, ...db.clients] }));
  return client;
}

export async function getReports(clientId?: string): Promise<CreditReportFile[]> {
  const db = await readDb();
  const list = clientId ? db.reports.filter((r) => r.clientId === clientId) : db.reports;
  return [...list].sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
}

export async function addReport(report: CreditReportFile): Promise<CreditReportFile> {
  const db = await readDb();
  await writeDb(updateClientCounts({ ...db, reports: [report, ...db.reports.filter((r) => r.id !== report.id)] }));
  return report;
}

export async function getNegativeItems(reportId?: string): Promise<NegativeItem[]> {
  const db = await readDb();
  return reportId ? db.negativeItems.filter((i) => i.reportId === reportId) : [...db.negativeItems];
}

export async function addNegativeItems(items: NegativeItem[]): Promise<void> {
  if (!items.length) return;
  const db = await readDb();
  const newIds = new Set(items.map((i) => i.id));
  await writeDb(updateClientCounts({ ...db, negativeItems: [...items, ...db.negativeItems.filter((i) => !newIds.has(i.id))] }));
}

export async function getNegativeItemById(id: string): Promise<NegativeItem | undefined> {
  return (await readDb()).negativeItems.find((i) => i.id === id);
}

export async function getLetters(clientId?: string): Promise<DisputeLetter[]> {
  const db = await readDb();
  const list = clientId ? db.letters.filter((l) => l.clientId === clientId) : db.letters;
  return [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function saveLetter(letter: DisputeLetter): Promise<DisputeLetter> {
  const db = await readDb();
  const updated = { ...letter, updatedAt: new Date().toISOString() };
  await writeDb(updateClientCounts({ ...db, letters: [updated, ...db.letters.filter((l) => l.id !== letter.id)] }));
  return updated;
}

export async function getDisputeCases(clientId?: string): Promise<DisputeCase[]> {
  const db = await readDb();
  const list = clientId ? db.disputeCases.filter((d) => d.clientId === clientId) : db.disputeCases;
  return [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function upsertDisputeCase(caseItem: DisputeCase): Promise<DisputeCase> {
  const db = await readDb();
  const updated = { ...caseItem, updatedAt: new Date().toISOString() };
  await writeDb(updateClientCounts({ ...db, disputeCases: [updated, ...db.disputeCases.filter((d) => d.id !== caseItem.id)] }));
  return updated;
}

export async function resetLocalDatabase(): Promise<void> {
  await secureRemove(STORAGE_KEY);
  await writeDb(seed);
}
