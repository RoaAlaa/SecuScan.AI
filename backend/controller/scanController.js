const {
  createScan,
  listUserScans,
  listPendingScans,
  deleteScan,
} = require("../services/scanService");
const { triggerScanWorkflow } = require("../services/n8nService");

exports.startScan = async (req, res) => {
  try {
    const { targetUrl, email } = req.body;
    const userId = req.userId || null;

    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
      return res.status(400).json({ error: "Target URL is required" });
    }

    const url = targetUrl.trim();

    if (!userId && (!email || typeof email !== "string" || !email.trim())) {
      return res.status(400).json({ error: "Email is required for guest scans" });
    }

    const { scan, accessToken, reportWillBeSentTo } = await createScan({
      targetUrl: url,
      userId,
      email: !userId && email ? email.trim() : null,
    });

    triggerScanWorkflow({
      scanId: scan.id,
      targetUrl: url,
      email: !userId && email ? email.trim() : null,
    }).catch(() => {});

    res.status(201).json({
      scanId: scan.id,
      message: "Scan started. The report will be sent to your email when finished.",
      reportWillBeSentTo: reportWillBeSentTo || (req.user && req.user.email) || null,
      reportLink: accessToken
        ? `${process.env.FRONTEND_URL || "http://localhost:5173"}/report/${scan.id}?token=${accessToken}`
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start scan" });
  }
};

exports.getMyScans = async (req, res) => {
  try {
    const userId = req.userId;
    const scans = await listUserScans(userId);
    res.json(scans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scans" });
  }
};

exports.getPendingScans = async (req, res) => {
  try {
    const userId = req.userId;
    const scans = await listPendingScans(userId);
    res.json(scans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending scans" });
  }
};

exports.deleteScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    await deleteScan(id, userId);
    res.status(200).json({ message: "Scan deleted" });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    if (err.statusCode === 403) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete scan" });
  }
};
