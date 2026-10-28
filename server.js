const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

// Melayani file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint API untuk cek cookie + detail akun
app.post('/api/check', async (req, res) => {
  const { cookie } = req.body;

  if (!cookie) {
    return res.status(400).json({ error: 'Cookie tidak boleh kosong!' });
  }

  const authHeader = {
    'Cookie': `.ROBLOSECURITY=${cookie}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };

  try {
    // 1. Cek User Autentikasi Dasar
    const authRes = await axios.get('https://users.roblox.com/v1/users/authenticated', { headers: authHeader });
    const userId = authRes.data.id;
    const username = authRes.data.name;
    const displayName = authRes.data.displayName;

    // Menjalankan request detail secara paralel agar cepat
    const [emailRes, premiumRes, ageRes, securityRes] = await Promise.allSettled([
      // Status Email
      axios.get('https://accountsettings.roblox.com/v1/email', { headers: authHeader }),
      // Status Premium
      axios.get(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`, { headers: authHeader }),
      // Status Verifikasi Umur / ID
      axios.get('https://apis.roblox.com/age-verification-service/v1/registration-status', { headers: authHeader }),
      // Status Keamanan 2FA / PIN
      axios.get('https://2fa.roblox.com/v1/users/' + userId + '/configuration', { headers: authHeader })
    ]);

    // Olah Data Email
    let hasEmail = false;
    let isEmailVerified = false;
    if (emailRes.status === 'fulfilled' && emailRes.data.data) {
      hasEmail = !!emailRes.data.data.emailAddress;
      isEmailVerified = emailRes.data.data.verified || false;
    }

    // Olah Data Premium
    let isPremium = false;
    if (premiumRes.status === 'fulfilled') {
      isPremium = Boolean(premiumRes.data);
    }

    // Olah Data Verifikasi Umur (Age/ID Verification)
    let isAgeVerified = false;
    if (ageRes.status === 'fulfilled' && ageRes.data.data) {
      isAgeVerified = ageRes.data.data.isVerified || false;
    }

    // Olah Data Keamanan / 2FA / Secure
    let isSecure = false;
    let enabled2FA = [];
    if (securityRes.status === 'fulfilled' && securityRes.data.data) {
      const methods = securityRes.data.data.methods || [];
      methods.forEach(m => {
        if (m.enabled) enabled2FA.push(m.mediaType);
      });
      isSecure = enabled2FA.length > 0;
    }

    // Kembalikan Response Lengkap
    return res.json({
      success: true,
      user: {
        id: userId,
        name: username,
        displayName: displayName,
        isPremium: isPremium,
        email: {
          hasEmail: hasEmail,
          isVerified: isEmailVerified
        },
        ageVerified: isAgeVerified,
        security: {
          isSecure: isSecure,
          methods: enabled2FA
        }
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Cookie tidak valid atau sudah kedaluwarsa!'
    });
  }
});

// Menangani rute ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
