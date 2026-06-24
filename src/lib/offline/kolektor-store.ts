"use client";

import type { Task } from "@/app/kolektor/kolektor-tasks";

const DB_NAME = "netmanage-kolektor";
const DB_VERSION = 1;
const TASKS_KEY = "tasks";
const QUEUE_KEY = "payment-queue";

export type PendingPayment = {
  invoiceId: string;
  metode: string;
  queuedAt: number;
};

type TasksRecord = { tasks: Task[]; namaUsaha: string; savedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveKolektorTasksCache(tasks: Task[], namaUsaha: string) {
  if (typeof indexedDB === "undefined") return;
  const record: TasksRecord = { tasks, namaUsaha, savedAt: Date.now() };
  await kvSet(TASKS_KEY, record);
}

export async function loadKolektorTasksCache(): Promise<TasksRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  return kvGet<TasksRecord>(TASKS_KEY);
}

export async function queueOfflinePayment(invoiceId: string, metode: string) {
  if (typeof indexedDB === "undefined") return;
  const queue = (await kvGet<PendingPayment[]>(QUEUE_KEY)) ?? [];
  queue.push({ invoiceId, metode, queuedAt: Date.now() });
  await kvSet(QUEUE_KEY, queue);
}

export async function loadPaymentQueue(): Promise<PendingPayment[]> {
  if (typeof indexedDB === "undefined") return [];
  return (await kvGet<PendingPayment[]>(QUEUE_KEY)) ?? [];
}

export async function clearPaymentQueue() {
  if (typeof indexedDB === "undefined") return;
  await kvSet(QUEUE_KEY, []);
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
