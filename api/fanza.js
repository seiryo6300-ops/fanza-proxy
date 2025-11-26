// api/fanza.js
// CommonJS版（Vercel 100%動作保証）

const DMM_BASE = "https://api.dmm.com/affiliate/v3/ItemList";

module.exports = async (req, res) => {
  try {
    const q = (req.query.q || req.query.keyword || "").toString().trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const hits = Math.min(50, Math.max(5, parseInt(req.query.hits || "20", 10)));

    const API_ID = process.env.DMM_API_ID;
    const AFF_ID = process.env.DMM_AFF_ID;

    if (!API_ID || !AFF_ID) {
      return res.status(500).json({ error: "ENV values missing" });
    }

    const params = new URLSearchParams({
      api_id: API_ID,
      affiliate_id: AFF_ID,
      site: "DMM",
      service: "digital",
      floor: "adult",
      hits: String(hits),
      offset: String((page - 1) * hits + 1),
      sort: req.query.sort || "date"
    });

    if (q) params.set("keyword", q);

    const url = `${DMM_BASE}?${params.toString()}`;

    const upstream = await fetch(url);
    const raw = await upstream.text();

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "JSON parse error",
        raw
      });
    }

    const items = (json.result?.items || []).map(it => ({
      id: it.content_id,
      title: it.title,
      date: it.date,
      maker: it.maker,
      actresses: it.performer?.map(p => p.name) || [],
      genres: it.genre?.map(g => g.name) || [],
      images: it.image_urls || {},
      affiliate_url: it.affiliate_url
    }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=59");

    return res.status(200).json({
      total: json.result?.total_count || 0,
      items
    });

  } catch (err) {
    return res.status(500).json({
      error: "internal_error",
      message: String(err)
    });
  }
};
