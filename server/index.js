// nonce
// authorize

// obtener la firma erc721
// validar la firma, debe contener el contenido y el nonce
// despues de validarla actualizar el nonce y finalmente conseceder el accesso
// se debe obtener el cid desde el vault y pasarlo a IPFS para hacer el proxy redirection 

const express = require('express');
const viem = require('viem');
const app = express();

// Middleware de autorización
app.get('/auth', (req, res) => {
    // Verificar token o cabecera de autorización (puedes usar JWT, API keys, etc.)
    const authHeader = req.headers['authorization'];

    // nested 721 if nor EOA else ecdsa recover
    // verify if has access the exctracted owner

    if (!authHeader || authHeader !== 'Bearer valid-token') {
        return res.status(401).send('Unauthorized');
    }

    // Si está autorizado, devuelve la ruta con X-Accel-Redirect
    res.setHeader('X-Accel-Redirect', '/secured/resource');
    res.status(200).send();
});

// Puerto donde escucha el middleware
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Middleware Node.js corriendo en http://localhost:${PORT}`);
});
