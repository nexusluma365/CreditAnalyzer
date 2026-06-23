import type { Client } from "@/types";

export const mockClients: Client[] = [
  {
    id: "client-1",
    fullName: "Selen Swift",
    email: "selen.swift@example.com",
    phone: "(704) 555-0148",
    createdAt: "2026-01-12T09:00:00.000Z",
    activeDisputes: 3,
    reportsCount: 2,
    avatarColor: "#1fb377",
  },
  {
    id: "client-2",
    fullName: "Devon Lane",
    email: "devon.lane@example.com",
    phone: "(704) 555-0172",
    createdAt: "2026-02-03T09:00:00.000Z",
    activeDisputes: 1,
    reportsCount: 1,
    avatarColor: "#5b8def",
  },
  {
    id: "client-3",
    fullName: "Wade Warren",
    email: "wade.warren@example.com",
    phone: "(704) 555-0193",
    createdAt: "2026-03-18T09:00:00.000Z",
    activeDisputes: 2,
    reportsCount: 3,
    avatarColor: "#e34a45",
  },
  {
    id: "client-4",
    fullName: "Darlene Robertson",
    email: "darlene.robertson@example.com",
    phone: "(704) 555-0167",
    createdAt: "2026-04-22T09:00:00.000Z",
    activeDisputes: 0,
    reportsCount: 1,
    avatarColor: "#dd8c33",
  },
];
