// Shim for @telegram-apps/bridge used by @aptos-connect/web-transport.
// Telegram transport is not used in this app, so this is a safe no-op fallback.

export const postEvent = (..._args: unknown[]): void => {
  // no-op
};

const defaultExport = {
  postEvent,
};

export default defaultExport;
