import { CacophonyDaemon } from "../daemon/CacophonyDaemon.js";

async function main(): Promise<void> {
  const socketPath = process.env.CACOPHONY_IPC_SOCKET || "/tmp/cacophony.sock";
  const daemon = new CacophonyDaemon({ socketPath });

  const handleExit = async () => {
    await daemon.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void handleExit());
  process.on("SIGTERM", () => void handleExit());

  await daemon.start();
}

void main();
