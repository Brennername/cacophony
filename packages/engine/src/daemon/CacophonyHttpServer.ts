const config = {
  frontendDistPath: "/path/to/frontend/dist",
  // Other configuration options
};

const httpServer = new CacophonyHttpServer(config);
httpServer.start();