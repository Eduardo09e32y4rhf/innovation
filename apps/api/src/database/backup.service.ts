import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    this.logger.log('Starting daily PostgreSQL backup...');
    
    try {
      const backupDir = path.join(process.cwd(), 'storage', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `db_backup_${timestamp}.sql`;
      const filepath = path.join(backupDir, filename);

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.logger.warn('DATABASE_URL not set, skipping backup.');
        return;
      }

      // We extract DB info from prisma URL (postgresql://user:password@host:port/dbname)
      // Assuming pg_dump is available on the system running the node process
      const command = `pg_dump "${dbUrl}" -F c -f "${filepath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        this.logger.debug(`pg_dump stderr: ${stderr}`);
      }
      
      this.logger.log(`Database backup successful: ${filepath}`);
      
      // Keep only last 7 backups
      this.cleanupOldBackups(backupDir);
    } catch (error: any) {
      this.logger.error(`Database backup failed: ${error.message}`);
    }
  }

  private cleanupOldBackups(backupDir: string) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('db_backup_') && f.endsWith('.sql'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 7) {
        for (let i = 7; i < files.length; i++) {
          fs.unlinkSync(path.join(backupDir, files[i].name));
          this.logger.log(`Deleted old backup: ${files[i].name}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error cleaning up old backups: ${error.message}`);
    }
  }
}
