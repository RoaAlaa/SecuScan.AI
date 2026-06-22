import { useState, useEffect } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import AuthInput from "../Components/AuthInput/AuthInput";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await api("GET", "/api/users/profile");
        if (!cancelled) {
          setName(data.name || "");
          setEmail(data.email || "");
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await api("PUT", "/api/users/profile", { name, email });
      if (data.user) updateUser(data.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await api("PUT", "/api/users/profile", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-10 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Edit profile</h1>
        <p className="text-sm text-gray-400 mt-1">Update your account details and password</p>
      </div>

      <section className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <AuthInput
            label="Full name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <AuthInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={savingProfile}
            className="self-start bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition"
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      <section className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Password</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <AuthInput
            label="Current password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <AuthInput
            label="New password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <AuthInput
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="self-start bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition"
          >
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      {user && (
        <p className="text-xs text-gray-500 mt-6 text-center">{user.email}</p>
      )}
    </div>
  );
}
