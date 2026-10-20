type AppEventListener = (data: any) => void;

class AppEventService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<AppEventListener>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimeout: any = null;
  private lastUrl: string | null = null;
  private lastToken: string | null = null;

  connect(baseUrl: string, token: string | null) {
    if (!token) {
      this.disconnect();
      return;
    }

    this.lastUrl = baseUrl;
    this.lastToken = token;

    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return;
    }

    this.disconnect();
    this.isConnecting = true;

    try {
      const sseUrl = `${baseUrl}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.isConnecting = false;
      };

      es.onerror = () => {
        // EventSource will auto-retry by default; if closed, schedule explicit reconnect
        if (es.readyState === EventSource.CLOSED) {
          this.disconnect();
          this.reconnectTimeout = setTimeout(() => {
            if (this.lastUrl && this.lastToken) {
              this.connect(this.lastUrl, this.lastToken);
            }
          }, 5000);
        }
      };

      // Register all existing listener event types with native EventSource
      this.listeners.forEach((_, eventName) => {
        es.addEventListener(eventName, (e: MessageEvent) => {
          this.dispatch(eventName, e.data);
        });
      });
    } catch (err) {
      console.warn('SSE connection failed to initialize:', err);
      this.isConnecting = false;
    }
  }

  /**
   * Subscribe to a specific server-sent event (e.g., NEW_MESSAGE, NEW_LIKE, NEW_MATCH, INCOMING_CALL)
   * Returns an unsubscribe function.
   */
  on(eventName: string, callback: AppEventListener): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
      if (this.eventSource) {
        this.eventSource.addEventListener(eventName, (e: MessageEvent) => {
          this.dispatch(eventName, e.data);
        });
      }
    }
    this.listeners.get(eventName)!.add(callback);

    return () => {
      const set = this.listeners.get(eventName);
      if (set) {
        set.delete(callback);
      }
    };
  }

  private dispatch(eventName: string, rawData: string) {
    let parsed: any = rawData;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      // raw string is fine
    }

    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(parsed);
        } catch (err) {
          console.error(`Error in SSE listener for "${eventName}":`, err);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

const appEventService = new AppEventService();
export default appEventService;
