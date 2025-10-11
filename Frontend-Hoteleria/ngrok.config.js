// Configuración específica para ngrok
module.exports = {
  devServer: {
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 4200,
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws'
    }
  }
};
