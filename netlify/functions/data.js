const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

const ADMIN_ID = process.env.ADMIN_ID || 'fusionia';
const ADMIN_PW = process.env.ADMIN_PW || 'zZ8$ePmy#ZYO';
const DATA_FILE = path.join(__dirname, 'data.json');
const DEFAULT_DATA = JSON.stringify({ 
  cats: [], prods: [], colorMaster: [], 
  nextCatId: 1, nextProdId: 1, nextColorId: 1 
});

const isLocal = !!process.env.NETLIFY_DEV;
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

const verifyAuth = (authHeader) => {
  const expected = `Basic ${Buffer.from(`${ADMIN_ID}:${ADMIN_PW}`).toString('base64')}`;
  return authHeader === expected;
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "POST" && !verifyAuth(event.headers.authorization)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    // 1. ローカル環境
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

    // 2. 本番環境 (Blobs)
    // context.blobs が存在しない場合は、環境変数を使って手動で初期化
    const store = (context.blobs) 
      ? context.blobs.getStore("workwear") 
      : getStore({ 
          name: "workwear",
          siteID: process.env.NETLIFY_SITE_ID,
          token: process.env.NETLIFY_AUTH_TOKEN
        });

    if (event.httpMethod === "GET") {
      const data = await store.get("catalog", { type: "text" });
      return { statusCode: 200, headers, body: data || DEFAULT_DATA };
    }

    if (event.httpMethod === "POST") {
      await store.set("catalog", event.body);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
};
