const http = require('http');

function testEndpoint(path, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            console.log(`✅ ${description} - Status: ${res.statusCode}`);
            resolve({ success: true, status: res.statusCode });
        });

        req.on('error', (err) => {
            console.log(`❌ ${description} - Error: ${err.message}`);
            resolve({ success: false, error: err.message });
        });

        req.setTimeout(5000, () => {
            console.log(`⏰ ${description} - Timeout`);
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });

        req.end();
    });
}

async function testBackend() {
    console.log('🔍 Probando endpoints del backend...\n');
    
    await testEndpoint('/api/reservas', 'GET /api/reservas');
    await testEndpoint('/api/reservas/cancelaciones/test', 'GET /api/reservas/cancelaciones/test');
    await testEndpoint('/api/reservas/cancelaciones/estadisticas', 'GET /api/reservas/cancelaciones/estadisticas');
    
    console.log('\n🏁 Diagnóstico completado');
}

testBackend();
