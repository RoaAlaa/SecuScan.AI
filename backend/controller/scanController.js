const prisma = require("../prismaClient");
const {
  createScan,
  listUserScans,
  listPendingScans,
  deleteScan,
} = require("../services/scanService");
const { triggerScanWorkflow } = require("../services/n8nService");
const { normalizeScansInput } = require("../utils/reportUtils");

exports.startScan = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUrl, url: urlField, scans } = req.body;

    const rawUrl = (typeof urlField === "string" && urlField.trim()) || targetUrl;
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return res.status(400).json({ error: "Target URL is required" });
    }

    const url = rawUrl.trim();
    const normalizedScans = normalizeScansInput(scans);
    if (normalizedScans === null) {
      return res.status(400).json({
        error: "Invalid scans. Use one or more of: sqlmap, sstimap, ssrfmap, lfi",
      });
    }

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!account) {
      return res.status(401).json({ error: "User account not found" });
    }

    const { scan } = await createScan({
      targetUrl: url,
      userId,
      email: null,
    });

    triggerScanWorkflow({
      scanId: scan.id,
      targetUrl: url,
      scans: normalizedScans,
      email: account.email,
    }).catch(() => {});

    res.status(201).json({
      scanId: scan.id,
      message: "Scan started. The report will be sent to your account email when finished.",
      reportWillBeSentTo: account.email,
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
