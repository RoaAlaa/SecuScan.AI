const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return user;
}

async function updateProfile(userId, { name, email, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const data = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      const err = new Error("Name cannot be empty");
      err.statusCode = 400;
      throw err;
    }
    if (trimmed !== user.name) data.name = trimmed;
  }

  if (email !== undefined) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      const err = new Error("Email cannot be empty");
      err.statusCode = 400;
      throw err;
    }
    if (normalized !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: normalized } });
      if (taken) {
        const err = new Error("Email is already in use");
        err.statusCode = 409;
        throw err;
      }
      data.email = normalized;
    }
  }

  if (newPassword !== undefined && newPassword !== "") {
    if (!currentPassword) {
      const err = new Error("Current password is required to set a new password");
      err.statusCode = 400;
      throw err;
    }
    if (newPassword.length < 8) {
      const err = new Error("New password must be at least 8 characters");
      err.statusCode = 400;
      throw err;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 401;
      throw err;
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    const err = new Error("No changes to save");
    err.statusCode = 400;
    throw err;
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true },
  });
}

module.exports = { getProfile, updateProfile };
