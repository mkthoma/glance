import { createSidebarController, type SidebarController } from "../sidebar";
import type { SidebarSide } from "../shared/types";

const HOST_ID = "glance-extension-host";

let controller: SidebarController | null = null;

function applyHostPosition(host: HTMLElement, side: SidebarSide) {
  const safeSide: SidebarSide = side === "left" ? "left" : "right";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.bottom = "0";
  host.style.width = "360px";
  host.style.zIndex = "2147483647";
  host.style.transition = "transform 200ms ease-out";
  host.style[safeSide] = "0";
  host.style[safeSide === "left" ? "right" : "left"] = "auto";
}

export function getSidebarController(): SidebarController | null {
  return controller;
}

export function removeSidebar(): void {
  document.getElementById(HOST_ID)?.remove();
  controller = null;
}

export function ensureSidebar(options: {
  side: SidebarSide;
  onClose: () => void;
  onOpenSettings: () => void;
  onAsk: (question: string) => Promise<void>;
}): SidebarController {
  const existingHost = document.getElementById(HOST_ID);
  if (existingHost && controller) {
    applyHostPosition(existingHost, options.side);
    return controller;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  applyHostPosition(host, options.side);
  document.documentElement.append(host);

  const shadowRoot = host.attachShadow({ mode: "closed" });
  controller = createSidebarController({
    shadowRoot,
    onClose: options.onClose,
    onOpenSettings: options.onOpenSettings,
    onAsk: options.onAsk
  });

  return controller;
}
