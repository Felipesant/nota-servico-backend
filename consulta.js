import { load } from 'cheerio';

/**
 * @param {string} placa
 * @returns {Object}
 */

export async function consultarPlaca(placa) {
    try {
        console.log("Iniciando requisição para a URL: ", `https://www.tabelafipebrasil.com/placa?placa=${placa}`);
        const proxyUrl = `https://nota-servico-backend.vercel.app/api/placa?placa=${placa}`;
        const req = await fetch(proxyUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "sec-ch-ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "upgrade-insecure-requests": "1",
                "Referer": "https://www.tabelafipebrasil.com/placa",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            method: "GET"
        });

        console.log("Status da resposta: ", req.status);
        const res = await req.text();
        const $ = load(res);

        const table1 = $('.fipeTablePriceDetail');
        const data1 = {};

        console.log("Dados da tabela: ", table1);

        table1.find('tr').each((index, element) => {
            const key = $(element).find('td').first().text().replace(':', '').trim();
            const value = $(element).find('td').last().text().trim();
            data1[key] = value;
        });

        const table2 = $('.fipe-desktop');

        table2.find('tr').each((index, element) => {
            if (index === 0) return;
            const row = {};
            $(element).find('td').each((i, td) => {
                const text = $(td).text().trim();
                if (i === 0) row['Código FIPE'] = text;
                if (i === 1) row['Modelo'] = text;
                if (i === 2) row['Valor'] = text;
            });

            data1['Fipe'] = row;
        });

        if (Object.keys(data1).length === 0) {
            return { error: "Placa não encontrada." }
        }

        return data1;
    } catch (error) {
        console.error("Erro na requisição: ", error.message);
        return { error: "Erro ao consultar a placa. Por favor, tente novamente." }
    }
}
