const axios = require('axios');

async function testBackendEndpoints() {
    const baseUrl = 'http://localhost:3000/api';
    
    console.log('🔍 Probando endpoints del backend...\n');
    
    // Test 1: Endpoint básico de reservas
    try {
        console.log('1. Probando GET /api/reservas...');
        const response1 = await axios.get(`${baseUrl}/reservas`);
        console.log('✅ GET /api/reservas - Status:', response1.status);
    } catch (error) {
        console.log('❌ GET /api/reservas - Error:', error.response?.status || error.message);
    }
    
    // Test 2: Endpoint de prueba de cancelaciones
    try {
        console.log('2. Probando GET /api/reservas/cancelaciones/test...');
        const response2 = await axios.get(`${baseUrl}/reservas/cancelaciones/test`);
        console.log('✅ GET /api/reservas/cancelaciones/test - Status:', response2.status);
        console.log('   Response:', response2.data);
    } catch (error) {
        console.log('❌ GET /api/reservas/cancelaciones/test - Error:', error.response?.status || error.message);
    }
    
    // Test 3: Endpoint de estadísticas
    try {
        console.log('3. Probando GET /api/reservas/cancelaciones/estadisticas...');
        const response3 = await axios.get(`${baseUrl}/reservas/cancelaciones/estadisticas`);
        console.log('✅ GET /api/reservas/cancelaciones/estadisticas - Status:', response3.status);
        console.log('   Response:', response3.data);
    } catch (error) {
        console.log('❌ GET /api/reservas/cancelaciones/estadisticas - Error:', error.response?.status || error.message);
    }
    
    console.log('\n🏁 Diagnóstico completado');
}

testBackendEndpoints().catch(console.error);
