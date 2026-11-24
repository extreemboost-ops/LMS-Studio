export type LMSConnectionStatus = "Connected" | "Disconnected" | "Syncing" | "Error";

export interface LMSIntegration {
  id: string;
  name: string;
  code: string;
  logo: string;
  type: string;
  status: LMSConnectionStatus;
  lastSync?: string;
  itemsSynced?: number;
  health?: "Healthy" | "Degraded" | "Failed";
}

export interface SyncActivity {
  id: string;
  contentTitle: string;
  action: string;
  time: string;
  success: boolean;
}
