import { exists, copyFile, mkdir } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";

export async function runAutoBackupIfDue(dbName: string) {
  try {
    const lastBackup = localStorage.getItem("lastAutoBackup");
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    if (lastBackup && now - Number(lastBackup) < THIRTY_DAYS) return;

    const dbDir = await appDataDir();
    const dbPath = await join(dbDir, dbName);
    const backupDir = await join(dbDir, "backups");

    if (!(await exists(backupDir))) {
      await mkdir(backupDir);
    }

    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const backupPath = await join(backupDir, `backup_${timestamp}.db`);

    await copyFile(dbPath, backupPath);
    localStorage.setItem("lastAutoBackup", String(now));
  } catch (err) {
    console.error("Auto-backup failed:", err);
  }
}