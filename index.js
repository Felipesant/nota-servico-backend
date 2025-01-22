import express from 'express';
import cors from 'cors'; // Importe o pacote cors
import { createLogger, format, transports } from 'winston';
import { consultarPlaca } from './consulta.js'; // Certifique-se de usar o caminho correto
import { createProxyMiddleware } from 'http-proxy-middleware';
import fetch from 'node-fetch';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
  
  app.use(express.json());
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
        const resultado = await consultarPlaca(placa);

        if (resultado && !resultado.error) {
            logger.info(`Consulta bem-sucedida para a placa: ${placa}`);
            setTimeout(() => { res.status(200).json({ status: 'success', dados: resultado }); }, 1);
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

app.get('/testeplaca/:placa', async (req, res) => {
    const placa = req.params.placa;
    logger.info(`Consulta recebida para a placa: ${placa}`);
    await delay(2000);
    try {
        const proxyUrl = `https://nota-servico-backend.vercel.app/api/placa?placa=${placa}`;
        const reqProxy = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "sec-ch-ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "upgrade-insecure-requests": "1",
                "Referer": "https://www.tabelafipebrasil.com/placa",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
        });

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
