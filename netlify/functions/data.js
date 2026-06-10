const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

// --- 設定 ---
const ADMIN_ID = process.env.ADMIN_ID || 'fusionia';
const ADMIN_PW = process.env.ADMIN_PW || 'zZ8$ePmy#ZYO';
const DATA_FILE = path.join(__dirname, 'data.json');
const DEFAULT_DATA = JSON.stringify({ 
  cats: [], prods: [], colorMaster: [], 
  nextCatId: 1, nextProdId: 1, nextColorId: 1 
});

const isLocal = !!process.env.NETLIFY_DEV || !process.env.SITE_ID;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

// --- ヘルパー関数 ---
const verifyAuth = (authHeader) => {
  const expected = `Basic ${Buffer.from(`${ADMIN_ID}:${ADMIN_PW}`).toString('base64')}`;
  return authHeader === expected;
};

// --- メインハンドラー ---
exports.handler = async (event) => {
  // 1. 認証チェック
  if (event.httpMethod === "POST" && !verifyAuth(event.headers.authorization)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // 2. ローカル開発環境 (JSONファイル)
  if (isLocal) {
    if (event.httpMethod === "GET") {
      const data = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : DEFAULT_DATA;
      return { statusCode: 200, headers, body: data };
    }
    if (event.httpMethod === "POST") {
      fs.writeFileSync(DATA_FILE, event.body);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  }

  // 3. 本番環境 (Netlify Blobs)
  const store = context.blobs.getStore("workwear");
  
if (event.httpMethod === "GET") {
    // getStore からのデータ取得
    const data = await store.get("catalog", { type: "text" });
    return { statusCode: 200, headers, body: data || DEFAULT_DATA };
  }

  if (event.httpMethod === "POST") {
    await store.set("catalog", event.body);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
};
