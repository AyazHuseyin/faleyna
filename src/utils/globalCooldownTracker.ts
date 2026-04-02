// src/utils/globalCooldownTracker.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cooldown event types
export type CooldownEventType = 
  | 'app_open'
  | 'interstitial_home_zodiac'
  | 'interstitial_home_intention'
  | 'interstitial_history_detail'
  | 'rewarded_balance'
  | 'rewarded_daily_card'
  | 'banner_home';

// Cooldown event data
interface CooldownEvent {
  type: CooldownEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

// Session data
interface SessionData {
  sessionId: string;
  startTime: number;
  events: CooldownEvent[];
  dailyCounts: Record<CooldownEventType, number>;
}

// Global cooldown tracker class
class GlobalCooldownTracker {
  private sessionData: SessionData | null = null;
  private isInitialized = false;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat
  private readonly DEBOUNCE_DELAY_MS = 1000; // 1 saniye
  private readonly MAX_EVENTS_PER_SESSION = 100; // Session başına maksimum event

  // Initialize tracker
  async initialize(): Promise<void> {
    try {
      await this.loadSessionData();
      this.isInitialized = true;
      // Silent log('GlobalCooldownTracker initialized');
    } catch (error) {
      // Silent error handling('GlobalCooldownTracker initialization failed:', error);
      this.createNewSession();
      this.isInitialized = true;
    }
  }

  // Create new session
  private createNewSession(): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionData = {
      sessionId,
      startTime: Date.now(),
      events: [],
      dailyCounts: {
        app_open: 0,
        interstitial_home_zodiac: 0,
        interstitial_home_intention: 0,
        interstitial_history_detail: 0,
        rewarded_balance: 0,
        rewarded_daily_card: 0,
        banner_home: 0,
      },
    };
  }

  // Load session data from storage
  private async loadSessionData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('globalCooldownSession');
      if (stored) {
        const data: SessionData = JSON.parse(stored);
        
        // Check if session is still valid (within 24 hours)
        const now = Date.now();
        if (now - data.startTime < this.SESSION_DURATION_MS) {
          this.sessionData = data;
        } else {
          // Session expired, create new one
          this.createNewSession();
          await this.saveSessionData();
        }
      } else {
        this.createNewSession();
        await this.saveSessionData();
      }
    } catch (error) {
      // Silent error handling('Failed to load session data:', error);
      this.createNewSession();
    }
  }

  // Save session data to storage
  private async saveSessionData(): Promise<void> {
    if (!this.sessionData) return;
    
    try {
      await AsyncStorage.setItem('globalCooldownSession', JSON.stringify(this.sessionData));
    } catch (error) {
      // Silent error handling('Failed to save session data:', error);
    }
  }

  // Check if event can be triggered (cooldown check)
  canTriggerEvent(
    eventType: CooldownEventType, 
    cooldownMs: number, 
    maxPerSession?: number,
    maxPerDay?: number
  ): boolean {
    if (!this.isInitialized || !this.sessionData) {
      // Silent warning('GlobalCooldownTracker not initialized');
      return true; // Allow if not initialized
    }

    const now = Date.now();
    const recentEvents = this.sessionData.events.filter(
      event => event.type === eventType && (now - event.timestamp) < cooldownMs
    );

    // Check cooldown
    if (recentEvents.length > 0) {
      // Silent log(`Cooldown active for ${eventType}, ${recentEvents.length} recent events`);
      return false;
    }

    // Check session limit
    if (maxPerSession) {
      const sessionEvents = this.sessionData.events.filter(
        event => event.type === eventType
      );
      if (sessionEvents.length >= maxPerSession) {
        // Silent log(`Session limit reached for ${eventType}: ${sessionEvents.length}/${maxPerSession}`);
        return false;
      }
    }

    // Check daily limit
    if (maxPerDay) {
      const dailyCount = this.sessionData.dailyCounts[eventType];
      if (dailyCount >= maxPerDay) {
        // Silent log(`Daily limit reached for ${eventType}: ${dailyCount}/${maxPerDay}`);
        return false;
      }
    }

    return true;
  }

  // Record event
  async recordEvent(eventType: CooldownEventType, userId?: string): Promise<void> {
    if (!this.isInitialized || !this.sessionData) {
      // Silent warning('GlobalCooldownTracker not initialized');
      return;
    }

    const event: CooldownEvent = {
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
      userId,
    };

    // Add event
    this.sessionData.events.push(event);
    
    // Increment daily count
    this.sessionData.dailyCounts[eventType]++;

    // Cleanup old events (keep only last 24 hours)
    const cutoffTime = Date.now() - this.SESSION_DURATION_MS;
    this.sessionData.events = this.sessionData.events.filter(
      event => event.timestamp > cutoffTime
    );

    // Limit events per session
    if (this.sessionData.events.length > this.MAX_EVENTS_PER_SESSION) {
      this.sessionData.events = this.sessionData.events.slice(-this.MAX_EVENTS_PER_SESSION);
    }

    // Save to storage
    await this.saveSessionData();

    // Silent log(`Recorded event: ${eventType} at ${new Date(event.timestamp).toISOString()}`);
  }

  // Get event statistics
  getEventStats(eventType: CooldownEventType): {
    totalToday: number;
    totalSession: number;
    lastEventTime: number | null;
    recentEventsCount: number;
  } {
    if (!this.sessionData) {
      return {
        totalToday: 0,
        totalSession: 0,
        lastEventTime: null,
        recentEventsCount: 0,
      };
    }

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    const sessionEvents = this.sessionData.events.filter(event => event.type === eventType);
    const todayEvents = sessionEvents.filter(event => event.timestamp >= todayStart);
    const recentEvents = sessionEvents.filter(event => (now - event.timestamp) < 60000); // Last minute

    const lastEvent = sessionEvents[sessionEvents.length - 1];

    return {
      totalToday: todayEvents.length,
      totalSession: sessionEvents.length,
      lastEventTime: lastEvent?.timestamp || null,
      recentEventsCount: recentEvents.length,
    };
  }

  // Reset session (for testing or manual reset)
  async resetSession(): Promise<void> {
    this.createNewSession();
    await this.saveSessionData();
    // Silent log('GlobalCooldownTracker session reset');
  }

  // Get session info
  getSessionInfo(): {
    sessionId: string;
    startTime: number;
    duration: number;
    totalEvents: number;
    eventTypes: Record<CooldownEventType, number>;
  } | null {
    if (!this.sessionData) return null;

    const now = Date.now();
    const eventTypes: Record<CooldownEventType, number> = {
      app_open: 0,
      interstitial_home_zodiac: 0,
      interstitial_home_intention: 0,
      interstitial_history_detail: 0,
      rewarded_balance: 0,
      rewarded_daily_card: 0,
      banner_home: 0,
    };

    this.sessionData.events.forEach(event => {
      eventTypes[event.type]++;
    });

    return {
      sessionId: this.sessionData.sessionId,
      startTime: this.sessionData.startTime,
      duration: now - this.sessionData.startTime,
      totalEvents: this.sessionData.events.length,
      eventTypes,
    };
  }
}

// Singleton instance
export const globalCooldownTracker = new GlobalCooldownTracker();

// Initialize on import
globalCooldownTracker.initialize();

// Helper functions
export const canTriggerEvent = (
  eventType: CooldownEventType,
  cooldownMs: number,
  maxPerSession?: number,
  maxPerDay?: number
) => globalCooldownTracker.canTriggerEvent(eventType, cooldownMs, maxPerSession, maxPerDay);

export const recordEvent = (eventType: CooldownEventType, userId?: string) =>
  globalCooldownTracker.recordEvent(eventType, userId);

export const getEventStats = (eventType: CooldownEventType) =>
  globalCooldownTracker.getEventStats(eventType);

export const getSessionInfo = () => globalCooldownTracker.getSessionInfo();

export const resetSession = () => globalCooldownTracker.resetSession();
