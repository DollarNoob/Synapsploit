import { Ace } from "ace-builds";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScriptSession {
  id: string;
  name: string;
  absolutePath: string | null;
  edited: boolean;
}

interface SessionStore {
  session: ScriptSession | null;
  sessions: ScriptSession[];
  editSessions: { [key: string]: Ace.EditSession };

  setSession: (session: ScriptSession | null) => void;
  addSession: (session: ScriptSession) => void;
  removeSession: (sessionId: string) => void;
  setSessions: (sessions: ScriptSession[]) => void;
  setEdited: (sessionId: string, edited: boolean) => void;
  addEditSession: (sessionId: string, editSession: Ace.EditSession) => void;
  removeEditSession: (sessionId: string) => void;
}

export const useSessionStore = create<SessionStore>()(
  persist((set) => ({
    session: null,
    sessions: [],
    editSessions: {},

    setSession: (session) => set({ session }),
    addSession: (session) => set((state) => ({ sessions: [ ...state.sessions, session ] })),
    removeSession: (sessionId) => set((state) => {
      const newSessions = state.sessions.filter(session => session.id !== sessionId);
      const index = state.sessions.findIndex(session => session.id === sessionId);
      const newSession = newSessions[newSessions.length === index ? newSessions.length - 1 : index];
      return { session: newSession, sessions: newSessions };
    }),
    setSessions: (sessions) => set({ sessions }),
    setEdited: (sessionId, edited) =>
      set((state) => {
        if (state.session?.id === sessionId) {
          const newSession = { ...state.session, edited };
          const newSessions = state.sessions.map(session => {
            if (session.id === sessionId) {
              return newSession;
            } else {
              return session;
            }
          });
          return { session: newSession, sessions: newSessions };
        }

        const newSessions = state.sessions.map(session => {
          if (session.id === sessionId) {
            const newSession = { ...session, edited };
            return newSession;
          } else {
            return session;
          }
        });
        return { sessions: newSessions };
      }),
    addEditSession: (sessionId, editSession) => set((state) => ({ editSessions: { ...state.editSessions, [sessionId]: editSession } })),
    removeEditSession: (sessionId) =>
      set((state) => {
        const newEditSessions = { ...state.editSessions };
        delete newEditSessions[sessionId];
        return { editSessions: newEditSessions };
      })
  }), {
    name: "sessionStore",
    partialize: (state) => ({ session: state.session, sessions: state.sessions })
  })
);

export function saveScript(sessionId: string, script: string) {
  const openRequest = indexedDB.open("ScriptsDatabase", 1);

  openRequest.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;

    if (!db.objectStoreNames.contains("scripts")) db.createObjectStore("scripts");
  };
  openRequest.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const tx = db.transaction("scripts", "readwrite");
    const store = tx.objectStore("scripts");

    store.put(script, sessionId);
  };
}

export function removeScript(sessionId: string) {
  const openRequest = indexedDB.open("ScriptsDatabase", 1);

  openRequest.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;

    if (!db.objectStoreNames.contains("scripts")) db.createObjectStore("scripts");
  };
  openRequest.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const tx = db.transaction("scripts", "readwrite");
    const store = tx.objectStore("scripts");

    store.delete(sessionId);
  };
}

export default useSessionStore;
