const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'base_de_datos.json');

const server = http.createServer((req, res) => {
    // Configuración CORS para evitar bloqueos del navegador
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/aportes' && req.method === 'GET') {
        let data = '[]';
        if (fs.existsSync(DB_FILE)) {
            data = fs.readFileSync(DB_FILE, 'utf-8');
        } else {
            fs.writeFileSync(DB_FILE, '[]');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
    } 
    else if (req.url === '/aportes' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const aportes = JSON.parse(body);
                // Guardar en el archivo JSON con indentación para que sea fácil de leer
                fs.writeFileSync(DB_FILE, JSON.stringify(aportes, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`✅ Servidor Node.js ejecutándose en http://localhost:${PORT}`);
    console.log(`📁 Base de datos conectada: ${DB_FILE}`);
    console.log(`==============================================`);
    console.log(`Minimiza esta ventana blanca, pero NO la cierres.`);
});
