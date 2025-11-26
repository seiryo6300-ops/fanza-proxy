// api/fanza.js
// Vercel Serverless Function (Node.js)
// 環境変数: DMM_API_ID, DMM_AFF_ID
import fetch from "node-fetch";

const DMM_BASE = "https://api.dmm.com/affiliate/v3/ItemList";

export default async function handler(req, res) {
  // 1) 基本的な入力検証
  const q = (req.query.q || req.query.keyword || "").toString().trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const hits = Math.min(50, Math.max(5, parseInt(req.query.hits || "20", 10))); // 5-50
  const site = (req.query.site || "fanza").toString();

  // 2) 必須 env 確認
  const API_ID = process.env.DMM_API_ID;
  const AFF_ID = process.env.DMM_AFF_ID;
  if (!API_ID || !AFF_ID) {
    res.status(500).json({ error: "Server misconfiguration: API keys missing" });
    return;
  }

  // 3) 防御: キーワード必須化しないが長すぎる入力を拒否
  if (q.length > 120) {
    res.status(400).json({ error: "keyword too long" });
    return;
  }

  // 4) 組み立て
  const params = new URLSearchParams({
    api_id: API_ID,
    affiliate_id: AFF_ID,
    site: site,
    service: "videoc",
    floor: "videoa",
    hits: String(hits),
    offset: String((page - 1) * hits + 1),
    sort: req.query.sort || "date"
  });

  if (q) params.set("keyword", q);
  if (req.query.gte_date) params.set("gte_date", req.query.gte_date);
  if (req.query.lte_date) params.set("lte_date", req.query.lte_date);

  const url = `${DMM_BASE}?${params.toString()}`;

  try {
    const upstream = await fetch(url, { timeout: 10000 });
    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(502).json({ error: "Upstream error", status: upstream.status, body: text });
      return;
    }
    const j = await upstream.json();

    // 変換: 必要なフィールドだけ抽出して返す
    const items = (j.result?.items || []).map(it => ({
      id: it.content_id,
      title: it.title,
      date: it.date || null,
      maker: it.maker || null,
      genres: (it.genre || []).map(g => g.name).filter(Boolean),
      actresses: (it.performer || []).map(p => p.name).filter(Boolean),
      images: it.image_urls || it.imageURL || {},
      affiliate_url: it.affiliate_url || it.AffiliateURL || null
    }));

    // 5) キャッシュ制御（Vercel CDN にキャッシュさせる）
    // - s-maxage: CDNに保存する秒数（ここでは1時間）
    // - stale-while-revalidate: 再検証しながら古いレスポンスを提供する秒数
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=59");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    res.status(200).json({ total: j.result?.total_count || null, items });
  } catch (err) {
    console.error("fanza proxy error:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
}
