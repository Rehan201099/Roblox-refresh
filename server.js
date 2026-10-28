const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

// Melayani file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint API untuk cek cookie
app.post('/api/check', async (req, res) => {
  const { cookie } = req.body;

  if (!cookie) {
    return res.status(400).json({ error: 'Cookie tidak boleh kosong!' });
  }

  try {
    const response = await axios.get('https://users.roblox.com/v1/users/authenticated', {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Jika cookie valid, kembalikan data user Roblox
    return res.json({
      success: true,
      user: {
        id: response.data.id,
        name: response.data.name,
        displayName: response.data.displayName
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Cookie tidak valid atau sudah kedaluwarsa!'
    });
  }
});

// Menangani semua rute halaman ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
