const http = require('http');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'base_de_datos.json');
const CARAS_FILE = path.join(__dirname, 'caras.json');
const HTML_FILE = path.join(__dirname, 'AhorrosAppMVP.html');

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
if (!fs.existsSync(CARAS_FILE)) fs.writeFileSync(CARAS_FILE, '{}');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/AhorrosAppMVP.html') {
        const html = fs.readFileSync(HTML_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html); return;
    }

    if (pathname === '/aportes' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const nuevoAporte = JSON.parse(body);
                const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
                db.push(nuevoAporte);
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(400); res.end();
            }
        }); return;
    }

    if (pathname.startsWith('/resumen/') && req.method === 'GET') {
        try {
            const avatar = decodeURIComponent(pathname.substring(9));
            const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            const carasDb = JSON.parse(fs.readFileSync(CARAS_FILE, 'utf-8'));

            const totalAportesGlobal = db.filter(a => a.monto > 0).reduce((sum, a) => sum + a.monto, 0);
            const totalPrestamosGlobal = Math.abs(db.filter(a => a.monto < 0).reduce((sum, a) => sum + a.monto, 0));
            const dineroDisponible = totalAportesGlobal - totalPrestamosGlobal;
            const gananciaGlobal = totalPrestamosGlobal * 0.10; // 10% interes
            
            const misAportes = db.filter(a => a.participante === avatar && a.monto > 0).reduce((sum, a) => sum + a.monto, 0);
            const misRetiros = Math.abs(db.filter(a => a.participante === avatar && a.monto < 0).reduce((sum, a) => sum + a.monto, 0));
            
            const porcentaje = totalAportesGlobal > 0 ? (misAportes / totalAportesGlobal) : 0;
            const interesGanado = porcentaje * gananciaGlobal;
            const deuda = misRetiros > 0 ? misRetiros + (misRetiros * 0.10) : 0;

            const balance = (misAportes + interesGanado) - deuda;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                aportesNetos: misAportes, 
                retirosNetos: misRetiros, 
                deuda, 
                interesGanado, 
                balance, 
                dineroDisponible,
                historial: db.filter(a => a.participante === avatar) 
            }));
        } catch(e) {
            res.writeHead(500); res.end();
        }
        return;
    }

    // RESUMEN GLOBAL DE TODOS LOS USUARIOS
    if (pathname === '/resumen-global' && req.method === 'GET') {
        try {
            const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            const carasDb = JSON.parse(fs.readFileSync(CARAS_FILE, 'utf-8'));
            
            const totalAportesGlobal = db.filter(a => a.monto > 0).reduce((sum, a) => sum + a.monto, 0);
            const totalPrestamosGlobal = Math.abs(db.filter(a => a.monto < 0).reduce((sum, a) => sum + a.monto, 0));
            const dineroDisponible = totalAportesGlobal - totalPrestamosGlobal;
            const gananciaGlobal = totalPrestamosGlobal * 0.10;

            const resumenUsuarios = Object.keys(carasDb).map(avatar => {
                const tr = db.filter(a => a.participante === avatar);
                const aportes = tr.filter(a => a.monto > 0).reduce((sum, a) => sum + a.monto, 0);
                const retiros = Math.abs(tr.filter(a => a.monto < 0).reduce((sum, a) => sum + a.monto, 0));
                
                const porcentaje = totalAportesGlobal > 0 ? (aportes / totalAportesGlobal) : 0;
                const interesGanado = porcentaje * gananciaGlobal;
                const deuda = retiros > 0 ? retiros + (retiros * 0.10) : 0;
                const balance = (aportes + interesGanado) - deuda;

                return { avatar, aportes, retiros, deuda, interesGanado, balance, isEncargado: carasDb[avatar].isEncargado };
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                globales: { dineroDisponible, gananciaGlobal, totalAportesGlobal, totalPrestamosGlobal },
                usuarios: resumenUsuarios
            }));
        } catch(e) {
            res.writeHead(500); res.end();
        }
        return;
    }

    // LISTAR PERFILES PARA EL MENU
    if (pathname === '/perfiles' && req.method === 'GET') {
        try {
            const carasDb = JSON.parse(fs.readFileSync(CARAS_FILE, 'utf-8'));
            const perfiles = Object.keys(carasDb).map(avatar => ({
                avatar,
                isEncargado: carasDb[avatar].isEncargado
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(perfiles));
        } catch(e) {
            res.writeHead(500); res.end();
        }
        return;
    }

    // OBTENER CARA (PARA VALIDAR)
    if (pathname.startsWith('/caras/') && req.method === 'GET') {
        const avatar = decodeURIComponent(pathname.substring(7));
        const carasDb = JSON.parse(fs.readFileSync(CARAS_FILE, 'utf-8'));
        if (carasDb[avatar]) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ descriptor: carasDb[avatar].descriptor }));
        } else {
            res.writeHead(404); res.end(JSON.stringify({ error: 'No registrada' }));
        }
        return;
    }

    // GUARDAR NUEVA CARA
    if (pathname === '/caras' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { avatar, descriptor } = JSON.parse(body);
                const carasDb = JSON.parse(fs.readFileSync(CARAS_FILE, 'utf-8'));
                
                // La primera cara registrada se vuelve Encargado automáticamente
                const isEncargado = Object.keys(carasDb).length === 0;
                
                carasDb[avatar] = { descriptor, isEncargado };
                fs.writeFileSync(CARAS_FILE, JSON.stringify(carasDb));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, isEncargado }));
            } catch(e) {
                res.writeHead(400); res.end();
            }
        }); return;
    }

    res.writeHead(404); res.end();
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==============================================`);
    console.log(`✅ Servidor Node.js con Perfiles y Biometria Activo`);
    console.log(`==============================================`);
});
