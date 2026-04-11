import express from 'express';
import dotenv from 'dotenv';
import { initWbot } from './libs/wbot'; // Exemplo, vamos chamar a lib principal

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8004;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp_service' });
});

// A rota que receberia um webhook do ATS ou Core
app.post('/api/whatsapp/send', async (req, res) => {
  const { number, message } = req.body;
  try {
    // Integração com a sua lógica WbotServices copiada aqui
    // const wbot = getWbot();
    // await wbot.sendMessage(...)
    res.json({ success: true, message: 'Message queued for sending' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[WHATSAPP-SVC] WhatsApp Omnichannel Service started on port ${PORT}`);
  // initWbot();
});
