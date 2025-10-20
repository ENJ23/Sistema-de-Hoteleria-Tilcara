const http = require('http');

function checkBackend() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reservas/cancelaciones/test',
        method: 'GET'
    };

    console.log('🔍 Verificando si el backend está ejecutándose...');
    console.log('📍 URL: http://localhost:3000/api/reservas/cancelaciones/test');

    const req = http.request(options, (res) => {
        console.log(`✅ Backend respondiendo - Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📄 Response:', data);
        });
    });

    req.on('error', (err) => {
        console.log(`❌ Backend no disponible - Error: ${err.message}`);
        console.log('💡 Asegúrate de que el backend esté ejecutándose en el puerto 3000');
    });

    req.setTimeout(3000, () => {
        console.log('⏰ Timeout - El backend no responde');
        req.destroy();
    });

    req.end();
}

checkBackend();
