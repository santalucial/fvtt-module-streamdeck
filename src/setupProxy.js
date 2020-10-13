const { createProxyMiddleware } = require("http-proxy-middleware");
module.exports = function (app) {
  app.use(
    "/socket.io",
    createProxyMiddleware({
      target: "https://lucasanta.homepc.it:8100/socket.io",
      changeOrigin: true,
      ws: true,
    })
  );
  app.use(
    "/join",
    createProxyMiddleware({
      target: "https://lucasanta.homepc.it:8100",
      changeOrigin: true,
    })
  );
  app.use(
    "/tokens",
    createProxyMiddleware({
      target: "https://lucasanta.homepc.it:8100",
      changeOrigin: true,
    })
  );
  app.use(
    "/ui",
    createProxyMiddleware({
      target: "https://lucasanta.homepc.it:8100",
      changeOrigin: true,
    })
  );
//   app.use(
//     "/sockjs-node",
//     createProxyMiddleware({
//       target: "wss://localhost:3000",
//       ws: true,
//     })
//   );
};
