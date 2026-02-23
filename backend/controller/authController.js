const {
  registerUser,
  authenticateUser,
} = require("../services/authService");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await registerUser({ name, email, password });
    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const authResult = await authenticateUser({ email, password });

    if (!authResult) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    res.json(authResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
};