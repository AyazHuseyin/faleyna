// src/utils/eventBus.ts
type EventMap = {
  balanceGuncellendi: void;
  profileGuncellendi: void;

  // 🔔 real-time & unread
  fortuneNew: void;
  unreadRefresh: void;
  fortuneRead: void;

  // 🔌 signalr durum
  signalRConnected: void;
};

type Callback<T> = (data: T) => void;

const listeners: {
  [K in keyof EventMap]?: Callback<EventMap[K]>[];
} = {};

const eventBus = {
  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event]!.push(callback);
  },

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event]!.filter(fn => fn !== callback);
  },

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    if (!listeners[event]) return;
    listeners[event]!.forEach(fn => fn(data));
  },
};

export default eventBus;
