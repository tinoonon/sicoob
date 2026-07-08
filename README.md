# 🔒 VBV Card Checker - Node.js Version

Checker de cartões de crédito com autenticação 3D Secure (VBV/SecureCode) otimizado para **Vercel**.

## 🚀 Deploy no Vercel

### 1. Método Rápido (Vercel CLI)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
vercel --prod
```

### 2. Método GitHub
1. Faça push para o GitHub
2. Conecte no [Vercel Dashboard](https://vercel.com)
3. Importe o repositório
4. Deploy automático!

## 🔧 Como Usar

### API Endpoint
```
https://seusite.vercel.app/api/checker?lista=NUMERO|MES|ANO|CVV
```

### Interface Web
```
https://seusite.vercel.app
```

### Exemplos de Teste
```bash
# Mastercard Sicredi
?lista=5122672221909912|02|2031|386

# Visa Itaú
?lista=4012345678901234|12|2025|123

# Elo Bradesco  
?lista=5067123456789012|01|2026|456
```

## 📊 Resposta da API

```json
{
  "status": "Aprovada",
  "card": "5122672221909912|02|2031|386",
  "message": "MARIANA, confirme no app Sicredi",
  "info": "[MASTERCARD - SICREDI]", 
  "time": "9s"
}
```

## 🎯 Funcionalidades

✅ **Detecção automática** de marca (Visa, Mastercard, Elo, etc)  
✅ **Identificação do banco** pelo BIN (Itaú, Bradesco, Nubank, etc)  
✅ **Processamento 3D Secure** completo  
✅ **Padrões específicos** para bancos brasileiros  
✅ **Análise inteligente** de mensagens VBV  
✅ **Interface web** responsiva  
✅ **Deploy fácil** no Vercel  

## 🏦 Bancos Suportados

- **Itaú** - Padrões específicos de resposta
- **Bradesco** - Detecção automática  
- **Santander** - Mensagens personalizadas
- **Sicredi** - Suporte completo
- **Nubank** - Identificação por BIN
- **Banco do Brasil** - Padrões BB
- **Caixa** - Mensagens específicas
- **BTG, Inter, C6** - Suporte básico

## 🔐 Segurança

- Criptografia RSA com chave pública PagBank
- Dados não são armazenados
- Timeout de 30 segundos
- Headers de segurança

## 📁 Estrutura do Projeto

```
📦 vbv-checker/
├── 📄 package.json          # Dependências Node.js
├── 📄 vercel.json          # Configuração Vercel
├── 📄 index.html           # Interface web
├── 📁 api/
│   └── 📄 checker.js       # API principal
└── 📄 README.md           # Este arquivo
```

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar localmente  
vercel dev

# Acessar
http://localhost:3000
```

## 📝 Logs

Para debug, descomente esta linha em `api/checker.js`:
```javascript
// console.log("VBV Response:", challengeResponse.data);
```

## ⚡ Performance

- **Timeout**: 30s por requisição
- **Memória**: Otimizada para Vercel
- **Caching**: Cookies automáticos
- **Error Handling**: Completo

---

**Convertido de PHP para Node.js** ✨  
**Ready for Vercel** 🚀