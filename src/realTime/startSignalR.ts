// src/realTime/startSignalR.ts
import * as signalR from '@microsoft/signalr';
import eventBus from '../utils/eventBus';
import { getToken } from '../utils/storage';

const HUB_BASE = 'https://api.faleyna.online';
const HUB_PATH = '/hubs/notify';

// Sunucuda Context.UserIdentifier üzerinden user grubuna almak için
// parametresiz join kullandığımız varsayım (yoksa try/catch zaten yutacak).
const JOIN_GROUP_METHOD = 'JoinUserGroup';

// Retry zamanlaması (onclose için)
const RETRY_MS_ONCLOSE = 8000;
const RETRY_MS_NOTOKEN = 5000;

let connection: signalR.HubConnection | null = null;
let starting = false;

// --- helpers

async function resolveJwt(): Promise<string | null> {
  try {
    const t = await getToken();
    if (t && t.length > 10) return t.replace(/^Bearer\s+/i, '').trim();
  } catch {}
  return null;
}

function safeEmitConnected() {
  // Sayfalar bağlantı açıldığını bilsin
  eventBus.emit('signalRConnected', undefined as any);
}

// Backend'in kullanıcıyı aldığı gruba katıl (varsa)
async function tryJoinUserGroup(conn: signalR.HubConnection) {
  try {
    // Parametresiz çağrı – server tarafında Context.UserIdentifier ile çözümleniyordur.
    await conn.invoke(JOIN_GROUP_METHOD);
  } catch {
    // Sunucuda bu method yoksa sessiz geç.
  }
}

// Fortune ile ilgili tüm muhtemel event adlarını dinle (geriye dönük)
function wireServerEvents(conn: signalR.HubConnection) {
  const fortuneReadyEvents = ['fortuneReady', 'FortuneReady', 'fortuneReadyV2'];
  const unreadChangedEvents = ['unreadChanged', 'UnreadChanged'];

  // Fortune hazır olduğunda listeleri tazele
  for (const ev of fortuneReadyEvents) {
    conn.off(ev); // yinelenmeyi önle
    conn.on(ev, (_payload: any) => {
      eventBus.emit('fortuneNew', undefined as any);
      eventBus.emit('unreadRefresh', undefined as any);
    });
  }

  // Unread değiştiğinde rozetleri tazele
  for (const ev of unreadChangedEvents) {
    conn.off(ev);
    conn.on(ev, (_payload: any) => {
      eventBus.emit('unreadRefresh', undefined as any);
    });
  }
}

function shouldReuseConnection(conn: signalR.HubConnection | null) {
  if (!conn) return false;
  // Eğer bağlantı kapalıysa, yeniden kurmak daha güvenli
  return conn.state !== signalR.HubConnectionState.Disconnected;
}

// --- public API

export async function startSignalR(): Promise<void> {
  // Eğer zaten çalışan bir bağlantı varsa çık.
  if (shouldReuseConnection(connection) || starting) return;

  starting = true;

  // Token guard: token yoksa hemen bağlanmayı ertele.
  const firstJwt = await resolveJwt();
  if (!firstJwt) {
    starting = false;
    setTimeout(() => {
      startSignalR().catch(() => {});
    }, RETRY_MS_NOTOKEN);
    return;
  }

  // Varsa önceki kapalı bağlantıyı at.
  if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
    try { await connection.stop(); } catch {}
    connection = null;
  }

  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${HUB_BASE}${HUB_PATH}`, {
      // accessTokenFactory her çağrıda storage'tan taze token çeker.
      accessTokenFactory: async () => {
        const jwt = await resolveJwt();
        if (!jwt) {
          // Boş token ile ölü bağlantı kurmamak için hata fırlatıyoruz.
          throw new Error('No JWT available');
        }
        return jwt;
      },
      withCredentials: false, // CORS cookie yok
      // transport seçmiyoruz -> WS, SSE/LP fallback otomatik
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .configureLogging(signalR.LogLevel.None) // Tüm SignalR log'larını kapat
    .build();

  // Lifecycle
  conn.onreconnecting((_e) => {
    // Silent reconnection
  });

  conn.onreconnected(async (_id) => {
    // Yeniden bağlanınca grupları tekrar katıl ve bağlı bilgisini yayınla
    await tryJoinUserGroup(conn);
    safeEmitConnected();
  });

  conn.onclose((e) => {
    connection = null;
    starting = false;
    setTimeout(() => {
      startSignalR().catch(() => {});
    }, RETRY_MS_ONCLOSE);
  });

  // Server → Client event kablolaması
  wireServerEvents(conn);

  try {
    await conn.start();
    connection = conn;

    // İlk bağlantıda grup katılımı ve connected sinyali
    await tryJoinUserGroup(conn);
    safeEmitConnected();
  } catch (err: any) {
    try {
      await conn.stop();
    } catch {}
    connection = null;
    setTimeout(() => {
      starting = false;
      startSignalR().catch(() => {});
    }, RETRY_MS_ONCLOSE * 2);
    return;
  } finally {
    // Başarılı başlangıçta da, hata halinde de starting'i serbest bırak.
    starting = false;
  }
}

export async function stopSignalR(): Promise<void> {
  if (!connection) return;
  try {
    await connection.stop();
  } catch {}
  connection = null;
}
