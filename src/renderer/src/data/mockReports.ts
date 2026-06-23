import type { CreditReportFile } from "@/types";

export const mockReports: CreditReportFile[] = [
  {
    id: "report-1",
    clientId: "client-1",
    fileName: "Selen_Swift_Experian_June2026.pdf",
    bureau: "Experian",
    uploadedAt: "2026-06-18T14:22:00.000Z",
    status: "analyzed",
    pages: 14,
  },
  {
    id: "report-2",
    clientId: "client-1",
    fileName: "Selen_Swift_TriBureau_March2026.pdf",
    bureau: "Multiple",
    uploadedAt: "2026-03-02T10:05:00.000Z",
    status: "analyzed",
    pages: 31,
  },
  {
    id: "report-3",
    clientId: "client-2",
    fileName: "Devon_Lane_Equifax_June2026.pdf",
    bureau: "Equifax",
    uploadedAt: "2026-06-10T16:40:00.000Z",
    status: "analyzed",
    pages: 9,
  },
  {
    id: "report-4",
    clientId: "client-3",
    fileName: "Wade_Warren_TransUnion_May2026.pdf",
    bureau: "TransUnion",
    uploadedAt: "2026-05-29T11:15:00.000Z",
    status: "analyzed",
    pages: 18,
  },
];
