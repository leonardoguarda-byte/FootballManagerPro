interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSyncManager {
  private queue: OfflineQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private listeners: Set<(status: OfflineStatus) => void> = new Set();
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private loadQueue() {
    try {
      const storedQueue = localStorage.getItem('offline_queue');
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  private notifyListeners() {
    const status: OfflineStatus = {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.getLastSyncTime(),
    };
    this.listeners.forEach(listener => listener(status));
  }

  private getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem('last_sync_time');
    return lastSync ? new Date(lastSync) : null;
  }

  private setLastSyncTime() {
    localStorage.setItem('last_sync_time', new Date().toISOString());
  }

  public addToQueue(endpoint: string, method: string, data: any): Promise<void> {
    return new Promise((resolve) => {
      const queueItem: OfflineQueueItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        endpoint,
        method,
        data,
        timestamp: Date.now(),
        retries: 0,
      };

      this.queue.push(queueItem);
      this.saveQueue();
      this.notifyListeners();
      
      console.log('Added to offline queue:', queueItem);
      resolve();
    });
  }

  public async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const successfulItems: string[] = [];
    const failedItems: OfflineQueueItem[] = [];

    for (const item of this.queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
          credentials: 'include',
        });

        if (response.ok) {
          successfulItems.push(item.id);
          console.log('Successfully synced offline item:', item);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to sync item:', item, error);
        
        if (item.retries < this.maxRetries) {
          failedItems.push({...item, retries: item.retries + 1});
        } else {
          console.warn('Max retries reached for item:', item);
        }
      }

      // Add delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update queue with only failed items
    this.queue = failedItems;
    this.saveQueue();
    this.setLastSyncTime();

    this.isSyncing = false;
    this.notifyListeners();

    if (successfulItems.length > 0) {
      console.log(`Successfully synced ${successfulItems.length} offline items`);
    }
  }

  public subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    this.notifyListeners();
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearQueue(): void {
    this.queue = [];
    localStorage.removeItem('offline_queue');
    this.notifyListeners();
    console.log('Offline queue cleared');
  }

  public getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: this.isSyncing,
      lastSyncTime: this.getLastSyncTime(),
    };
  }

  public async forceSync(): Promise<void> {
    await this.processQueue();
  }
}

export interface OfflineStatus {
  isOnline: boolean;
  queueSize: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

// Singleton instance
export const offlineSync = new OfflineSyncManager();
export const offlineSyncManager = offlineSync; // Legacy alias

// React hook for using offline sync in components
import { useState, useEffect } from 'react';

export function useOfflineSync() {
  const [status, setStatus] = useState<OfflineStatus>(offlineSync.getStatus());

  useEffect(() => {
    const unsubscribe = offlineSync.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return {
    ...status,
    addToQueue: offlineSync.addToQueue.bind(offlineSync),
    processQueue: offlineSync.processQueue.bind(offlineSync),
    clearQueue: offlineSync.clearQueue.bind(offlineSync),
    forceSync: offlineSync.forceSync.bind(offlineSync),
  };
}

// Enhanced API request function with offline support
export async function apiRequestWithOffline(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const { method = 'GET', body, ...restOptions } = options;

  // For read operations, try normal request first
  if (method === 'GET') {
    try {
      const response = await fetch(endpoint, options);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }
      throw error;
    }
  }

  // For write operations, handle offline queueing
  if (!navigator.onLine) {
    const data = body ? JSON.parse(body as string) : {};
    await offlineSync.addToQueue(endpoint, method, data);
    return { success: true, offline: true };
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...restOptions.headers,
      },
      body,
      credentials: 'include',
      ...restOptions,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    // If online but request failed, still queue it for retry
    if (navigator.onLine && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const data = body ? JSON.parse(body as string) : {};
      await offlineSync.addToQueue(endpoint, method, data);
      throw new Error('Request failed but queued for retry');
    }
    throw error;
  }
}

// Legacy alias for compatibility
export const offlineCapableRequest = apiRequestWithOffline;