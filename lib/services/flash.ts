import { writable } from "svelte/store";
import { uniqueId } from "../utilities/unique-id";

export interface FlashMessage {
  id: string;
  type: "success" | "alert" | "info";
  message: string;
}

const { subscribe, update } = writable<FlashMessage[]>([]);
const FLASH_TIMEOUT_MS = 4000;

const push = (type: FlashMessage["type"], message: string) => {
  const id = uniqueId();
  update((messages) => [...messages, { id, type, message }]);
  window.setTimeout(() => {
    update((messages) => messages.filter((msg) => msg.id !== id));
  }, FLASH_TIMEOUT_MS);
};

export const flashMessages = {
  subscribe,
  success: (message: string) => push("success", message),
  alert: (message: string) => push("alert", message),
  info: (message: string) => push("info", message),
  remove: (id: string) => update(m => m.filter(msg => msg.id !== id))
};
