const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint Cek Bulk Cookie + Avatar
app.post('/api/check-bulk', async (req, res) => {
  const { cookies } = req.body;

  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.status(400).json({ error: 'Daftar cookie tidak boleh kosong!' });
  }

  const results = await Promise.all(
    cookies.map(async (cookieItem) => {
      const rawCookie = cookieItem.trim();
      if (!rawCookie) return null;

      const cleanCookie = rawCookie.includes('.ROBLOSECURITY=') 
        ? rawCookie.split('.ROBLOSECURITY=')[1].split(';')[0] 
        : rawCookie;

      try {
        // 1. Cek User Authenticated
        const userRes = await axios.get('https://users.roblox.com/v1/users/authenticated', {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cleanCookie}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          timeout: 5000
        });

        const userId = userRes.data.id;
        const username = userRes.data.name;

        // 2. Ambil Foto Avatar (Headshot)
        let avatarUrl = 'https://tr.rbxcdn.com/30bf806913e0e85e16370ab6409d5a3e/150/150/Avatar/Png'; // Fallback
        try {
          const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`);
          if (thumbRes.data && thumbRes.data.data && thumbRes.data.data[0]) {
            avatarUrl = thumbRes.data.data[0].imageUrl;
          }
        } catch (e) {
          // Abaikan jika thumbnail error
        }

        return {
          valid: true,
          username: username,
          userId: userId,
          avatar: avatarUrl,
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
