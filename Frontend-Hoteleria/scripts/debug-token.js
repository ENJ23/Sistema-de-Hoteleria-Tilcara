const http = require('http');

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
                console.log('📄 Login Response:', data);
                if (res.statusCode === 200) {
                    const response = JSON.parse(data);
                    console.log('🔑 Token recibido:', response.token);
                    console.log('📏 Longitud del token:', response.token?.length);
                    console.log('🔍 Primeros 50 caracteres:', response.token?.substring(0, 50));
                    resolve(response.token);
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

async function debugToken() {
    try {
        console.log('🔐 Haciendo login para debuggear token...');
        const token = await login();
        
        if (token) {
            console.log('✅ Token obtenido exitosamente');
        } else {
            console.log('❌ No se obtuvo token');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugToken();
