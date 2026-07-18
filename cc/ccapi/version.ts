// VITE_APP_VERSION is baked in at build time (see Dockerfile ARG APP_VERSION).
export const CC_VERSION = (import.meta as any).env?.VITE_APP_VERSION ?? "dev";
