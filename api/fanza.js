export default async function handler(req, res) {
  const {
    api_id = process.env.API_ID,
    affiliate_id = process.env.AFFILIATE_ID,
    hits = 10,
    sort = "date",
    genre = "",
  } = req.query;

  // 必須パラメータチェック
  if (!api_id || !affiliate_id) {
    return res.status(400).json({ error: "Missing API_ID or AFFILIATE_ID" });
  }

  // FANZA API URL（動画の正しいパラメータ構成）
  const url = `https://api.dmm.com/affiliate/v3/ItemList?api_id=${api_id}&affiliate_id=${affiliate_id}&site=DMM&service=adult&floor=videoa&hits=${hits}&sort=${sort}&article=genre&genre=${genre}&output=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Server Error", detail: err.message });
  }
}
