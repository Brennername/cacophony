import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

async function main(): Promise<void> {
  const socketPath = process.env.CACOPHONY_IPC_SOCKET || "/tmp/cacophony.sock";
  const httpPort = process.env.PORT_API ? parseInt(process.env.PORT_API, 10) : 24161;
  const frontendDistPath = process.env.FRONTEND_DIST_PATH || "../frontend/dist/frontend/browser";

  const daemon = new CacophonyDaemon({
    socketPath,
    httpPort,
    frontendDistPath
  });

  const handleExit = async () => {
    await daemon.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void handleExit());
  process.on("SIGTERM", () => void handleExit());

  await daemon.start();
}

void main();
