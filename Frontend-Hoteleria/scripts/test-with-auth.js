const http = require('http');

// Función para hacer login y obtener token
function login() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            email: 'encargado@hostal.com',
            password: '123456'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    resolve(response.accessToken); // Cambiar de 'token' a 'accessToken'
                } else {
                    reject(new Error(`Login failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

// Función para probar endpoint con token
function testWithToken(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/reservas/cancelaciones',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('🔍 Probando endpoint con autenticación...');

        const req = http.request(options, (res) => {
            console.log(`✅ Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📄 Response:', data);
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Error: ${err.message}`);
            reject(err);
        });

        req.setTimeout(5000, () => {
            console.log('⏰ Timeout');
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function testAuthenticated() {
    try {
        console.log('🔐 Haciendo login...');
        const token = await login();
        console.log('✅ Login exitoso, token obtenido');
        
        console.log('🔍 Probando endpoint autenticado...');
        await testWithToken(token);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAuthenticated();
