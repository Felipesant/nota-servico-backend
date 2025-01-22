import express from 'express';
import cors from 'cors';
import { createLogger, format, transports } from 'winston';
import { createProxyMiddleware } from 'http-proxy-middleware';

process.on('warning', (warning) => {
    console.warn(warning.name);    // 'DeprecationWarning'
    console.warn(warning.message); // The `util._extend` API is deprecated
    console.warn(warning.stack);   // Stack trace
});

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'consulta-fipe.log' })
    ]
});

const app = express();
const port = process.env.PORT || 3000;

// Ative o CORS para todas as rotas
app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

// Middleware para parsing de JSON
app.use(express.json());
// Middleware para parsing de URL-encoded
app.use(express.urlencoded({ extended: true }));

// Configurar o proxy para a API externa
app.use('/api', createProxyMiddleware({
    target: 'https://www.tabelafipebrasil.com',
    changeOrigin: true,
    pathRewrite: {'^/api' : ''},
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Referer', 'https://www.tabelafipebrasil.com/placa');
    }
}));

app.get('/consulta/:placa', async (req, res) => {
    const placa = req.params.placa;
    logger.info(`Consulta recebida para a placa: ${placa}`);

    try {
        // Fazer requisição via proxy
        const proxyUrl = `https://nota-servico-backend.vercel.app/api/placa?placa=${placa}`;
        const reqProxy = await fetch(proxyUrl, { method: 'GET' });

        if (reqProxy.status === 200) {
            const resultado = await reqProxy.json();
            logger.info(`Consulta bem-sucedida para a placa: ${placa}`);
            res.status(200).json({ status: 'success', dados: resultado });
        } else {
            logger.warn(`Nenhum dado encontrado para a placa: ${placa}`);
            res.status(404).json({
                status: 'error',
                message: 'Placa não encontrada ou inválida.'
            });
        }
    } catch (error) {
        logger.error(`Erro ao consultar a placa ${placa}: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Erro ao consultar a placa.'
        });
    }
});

app.listen(port, () => {
    logger.info(`Servidor rodando na porta ${port}`);
});
