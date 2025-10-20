const http = require('http');

function testEstadisticas() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reservas/cancelaciones/estadisticas',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer test-token', // Token de prueba
            'Content-Type': 'application/json'
        }
    };

    console.log('🔍 Probando endpoint de estadísticas...');
    console.log('📍 URL: http://localhost:3000/api/reservas/cancelaciones/estadisticas');

    const req = http.request(options, (res) => {
        console.log(`✅ Estadísticas - Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📄 Response:', data);
        });
    });

    req.on('error', (err) => {
        console.log(`❌ Error: ${err.message}`);
    });

    req.setTimeout(5000, () => {
        console.log('⏰ Timeout');
        req.destroy();
    });

    req.end();
}

testEstadisticas();
