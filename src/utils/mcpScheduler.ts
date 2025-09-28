import { EnhancedMCPService } from '../services/enhancedMcpService';

/**
 * MCP Session Cleanup Scheduler
 * Runs periodic cleanup of expired MCP sessions
 */
export class MCPScheduler {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Start the MCP session cleanup scheduler
   */
  static start(): void {
    if (this.cleanupInterval) {
      console.log('MCP scheduler is already running');
      return;
    }

    console.log('Starting MCP session cleanup scheduler...');
    
    // Run cleanup immediately
    EnhancedMCPService.cleanupExpiredSessions();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      try {
        EnhancedMCPService.cleanupExpiredSessions();
      } catch (error) {
        console.error('MCP session cleanup error:', error);
      }
    }, this.CLEANUP_INTERVAL_MS);

    console.log(`MCP scheduler started - cleanup runs every ${this.CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
  }

  /**
   * Stop the MCP session cleanup scheduler
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('MCP scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  static isRunning(): boolean {
    return this.cleanupInterval !== null;
  }
}
