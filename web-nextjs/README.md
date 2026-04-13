# Distributed Chat Web

Frontend Next.js ini dipakai untuk mengetes distributed chat system dengan tampilan yang terinspirasi WhatsApp Web.

## Menjalankan frontend

1. Salin `.env.example` menjadi `.env.local` kalau kamu ingin override base URL.
2. Jalankan backend stack terlebih dulu.
3. Jalankan:

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3010
```

4. Buka `http://localhost:3010`.

## Fitur utama

- Login Google lewat `gateway-dotnet`
- Simpan JWT lokal untuk sesi browser
- Tambah contact manual lalu pilih lawan chat dari sidebar
- Load history conversation via gateway
- Realtime message via SignalR
- Mark as read lewat event backend
- Presence check via `realtime-dotnet`

## Catatan

- Frontend ini sengaja pakai contact manual karena backend belum punya user directory atau search endpoint.
- Untuk test dua akun, paling enak buka satu browser normal dan satu incognito.
