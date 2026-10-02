const daemon = new CacophonyDaemon();
const httpServer = new CacophonyHttpServer(daemon);
httpServer.listen(3000, () => {
  console.log('HTTP Server is running on port 3000');
});