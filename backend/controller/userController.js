const { getProfile, updateProfile } = require("../services/userService");

exports.getProfile = async (req, res) => {
  try {
    const profile = await getProfile(req.userId);
    res.json(profile);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to load profile" });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;

  try {
    const user = await updateProfile(req.userId, {
      name,
      email,
      currentPassword,
      newPassword,
    });
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
