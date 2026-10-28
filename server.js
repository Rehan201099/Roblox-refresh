const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Agar bisa terima input teks panjang

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint Cek Bulk Cookie
app.post('/api/check-bulk', async (req, res) => {
  const { cookies } = req.body; // Array dari cookie

  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.status(400).json({ error: 'Daftar cookie tidak boleh kosong!' });
  }

  // Proses pengecekan satu per satu secara paralel dengan limit aman
  const results = await Promise.all(
    cookies.map(async (cookieItem) => {
      const rawCookie = cookieItem.trim();
      if (!rawCookie) return null;

      // Bersihkan string jika user memasukkan format custom sebelumnya
      const cleanCookie = rawCookie.includes('.ROBLOSECURITY=') 
        ? rawCookie.split('.ROBLOSECURITY=')[1].split(';')[0] 
        : rawCookie;

      try {
        const response = await axios.get('https://users.roblox.com/v1/users/authenticated', {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cleanCookie}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 5000 // Limit waktu 5 detik per cookie biar gak nunggu lama
        });

        return {
          valid: true,
          username: response.data.name,
          userId: response.data.id,
          cookie: cleanCookie
        };
      } catch (err) {
        return {
          valid: false,
          cookie: cleanCookie
        };
      }
    })
  );

  // Filter elemen null jika ada baris kosong
  const filteredResults = results.filter(item => item !== null);

  return res.json({
    success: true,
    results: filteredResults
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
