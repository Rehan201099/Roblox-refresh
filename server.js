const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/check', async (req, res) => {
  const { cookie } = req.body;

  if (!cookie) {
    return res.status(400).json({ error: 'Cookie tidak boleh kosong!' });
  }

  try {
    const authHeader = {
      'Cookie': `.ROBLOSECURITY=${cookie}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };

    // 1. Cek Autentikasi Utama (ID, Username, DisplayName)
    const authRes = await axios.get('https://users.roblox.com/v1/users/authenticated', { headers: authHeader });
    const userId = authRes.data.id;
    const username = authRes.data.name;
    const displayName = authRes.data.displayName;

    // 2. Cek Robux
    let robuxBalance = 0;
    try {
      const robuxRes = await axios.get(`https://economy.roblox.com/v1/users/${userId}/currency`, { headers: authHeader });
      robuxBalance = robuxRes.data.robux || 0;
    } catch (e) {
      robuxBalance = 'Gagal memuat';
    }

    // 3. Cek Status Premium
    let isPremium = false;
    try {
      const premiumRes = await axios.get(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`, { headers: authHeader });
      isPremium = Boolean(premiumRes.data);
    } catch (e) {
      isPremium = false;
    }

    // 4. Cek Trade (Inbound Count)
    let tradeStatus = 'Aman / Kosong';
    try {
      const tradeRes = await axios.get('https://trades.roblox.com/v1/trades/inbound/count', { headers: authHeader });
      const inboundCount = tradeRes.data.count || 0;
      tradeStatus = `Inbound: ${inboundCount}`;
    } catch (e) {
      tradeStatus = 'Tidak tersedia';
    }

    return res.json({
      success: true,
      user: {
        id: userId,
        name: username,
        displayName: displayName,
        robux: robuxBalance,
        isPremium: isPremium,
        trade: tradeStatus
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Cookie tidak valid atau sudah kedaluwarsa!'
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
