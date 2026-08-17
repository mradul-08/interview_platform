const mongoose = require("mongoose");
const DeveloperProfile = require("../models/DeveloperProfile");
const User = require("../models/User");
const { calculateProfileCompletion } = require("../services/profileCompletionService");
const { getOrCreateProfile, updateProfile, serializeOwnProfile, publicProfile } = require("../services/profileService");
const { isConfigured, uploadBuffer, deleteAsset } = require("../services/cloudinary");
const { getProfileStats, getProfileActivity } = require("../services/profileStatsService");
const { emitToUser } = require("../socket");

async function emitProfileUpdated(req, reason, avatarUrl = undefined) {
  const payload = { reason };
  if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl || "";
  emitToUser(req.app.locals.io, req.user._id, "profile:updated", payload);

  if (avatarUrl === undefined || !req.app.locals.io) return;
  const Member = mongoose.models.GeminiStudyGroupMember;
  if (!Member) return;
  const memberships = await Member.find({ userId: req.user._id, status: "APPROVED" }).select("groupId").lean();
  memberships.forEach(({ groupId }) => {
    req.app.locals.io.to(`study-group:${groupId}`).emit("group:profile-updated", {
      groupId: String(groupId),
      userId: String(req.user._id),
      avatarUrl: avatarUrl || "",
    });
  });
}

async function profileResponse(req, profile, includeStats = true) {
  return addResumeDeliveryUrl(req, {
    ...serializeOwnProfile(profile),
    completion: calculateProfileCompletion(profile),
    ...(includeStats ? { stats: await getProfileStats(req.user._id, true) } : {}),
  });
}

function requireUpload(req, res) {
  if (!req.file) {
    res.status(400).json({ message: "A file is required" });
    return false;
  }
  if (!isConfigured()) {
    res.status(503).json({ message: "Profile file storage is not configured" });
    return false;
  }
  return true;
}

function addResumeDeliveryUrl(req, payload) {
  if (payload?.profile?.resume?.url && payload.profile.username) {
    const apiOrigin = `${req.protocol}://${req.get("host")}`;
    payload.profile.resume.url = `${apiOrigin}${req.baseUrl}/resume/${encodeURIComponent(payload.profile.username)}`;
  }
  return payload;
}

async function getMyProfile(req, res) {
  try {
    const profile = await getOrCreateProfile(req.user);
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Unable to load profile" });
  }
}

async function getMyProfileActivity(req, res) {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2200)) return res.status(400).json({ message: "Invalid year" });
    return res.json(await getProfileActivity(req.user._id, { year, date: req.query.date }));
  } catch (error) {
    console.error("Get profile activity error:", error);
    return res.status(500).json({ message: "Unable to load profile activity" });
  }
}

async function getPublicProfileActivity(req, res) {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    const profileQuery = mongoose.isValidObjectId(username) ? { userId: username, profileVisibility: "public" } : { username, profileVisibility: "public" };
    let profile = await DeveloperProfile.findOne(profileQuery).select("userId privacy").lean();
    if (!profile && mongoose.isValidObjectId(username)) {
      const user = await User.findById(username);
      if (user) profile = await getOrCreateProfile(user);
    }
    if (!profile || profile.privacy?.showStats === false || profile.privacy?.showActivity === false) return res.status(404).json({ message: "Activity is not public" });
    const year = req.query.year ? Number(req.query.year) : undefined;
    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2200)) return res.status(400).json({ message: "Invalid year" });
    return res.json(await getProfileActivity(profile.userId, { year }));
  } catch (error) {
    console.error("Get public profile activity error:", error);
    return res.status(500).json({ message: "Unable to load public activity" });
  }
}

async function updateMyProfile(req, res) {
  try {
    const profile = await updateProfile(req.user, req.body);
    emitProfileUpdated(req, "profile-saved");
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    const status = /already in use|must be|is invalid|is too long|Invalid|Unsupported|username may contain|Validation failed/.test(error.message) ? 400 : 500;
    if (status === 500) console.error("Update profile error:", error);
    return res.status(status).json({ message: status === 500 ? "Unable to update profile" : error.message });
  }
}

async function getPublicProfile(req, res) {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    const profileQuery = mongoose.isValidObjectId(username) ? { userId: username, profileVisibility: "public" } : { username, profileVisibility: "public" };
    let profile = await DeveloperProfile.findOne(profileQuery).lean();
    if (!profile && mongoose.isValidObjectId(username)) {
      const user = await User.findById(username);
      if (user) profile = await getOrCreateProfile(user);
    }
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    const stats = profile.privacy?.showStats !== false ? await getProfileStats(profile.userId, profile.privacy?.showActivity !== false) : null;
    return res.json(addResumeDeliveryUrl(req, { profile: publicProfile(profile), completion: calculateProfileCompletion(profile), stats }));
  } catch (error) {
    console.error("Public profile error:", error);
    return res.status(500).json({ message: "Unable to load public profile" });
  }
}

async function deliverPublicResume(req, res) {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    const profile = await DeveloperProfile.findOne({ username, profileVisibility: "public", resumeVisibility: "public" }).select("resume username").lean();
    if (!profile?.resume?.url) return res.status(404).json({ message: "Public resume not found" });
    const upstream = await fetch(profile.resume.url);
    if (!upstream.ok) return res.status(502).json({ message: "Resume storage is unavailable" });
    const file = Buffer.from(await upstream.arrayBuffer());
    const safeName = String(profile.resume.fileName || "resume.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`}"`, "Cache-Control": "public, max-age=300" });
    return res.send(file);
  } catch (error) {
    console.error("Public resume delivery error:", error);
    return res.status(500).json({ message: "Unable to deliver public resume" });
  }
}

async function uploadAvatar(req, res) {
  try {
    if (!requireUpload(req, res)) return;
    const profile = await getOrCreateProfile(req.user);
    const previous = profile.avatar?.publicId;
    const result = await uploadBuffer(req.file.buffer, {
      folder: "codeverse/profiles/avatars",
      public_id: `user-${req.user._id}-${Date.now()}`,
      resource_type: "image",
    });
    profile.avatar = { url: result.secure_url || result.url, publicId: result.public_id };
    await profile.save();
    await User.findByIdAndUpdate(req.user._id, { $set: { avatarUrl: profile.avatar.url } });
    if (previous) await deleteAsset(previous, { resource_type: "image" }).catch(() => {});
    await emitProfileUpdated(req, "avatar-updated", profile.avatar.url);
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    console.error("Avatar upload error:", error);
    if (error.http_code === 401 || /invalid cloud_name|api_key/i.test(error.message || "")) {
      return res.status(503).json({ message: "Cloudinary configuration is invalid. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET." });
    }
    return res.status(500).json({ message: "Unable to upload avatar" });
  }
}

async function uploadResume(req, res) {
  try {
    if (!requireUpload(req, res)) return;
    const profile = await getOrCreateProfile(req.user);
    const previous = profile.resume?.publicId;
    const result = await uploadBuffer(req.file.buffer, {
      folder: "codeverse/profiles/resumes",
      public_id: `user-${req.user._id}-${Date.now()}`,
      resource_type: "image",
      format: "pdf",
    });
    profile.resume = {
      url: result.secure_url || result.url,
      publicId: result.public_id,
      fileName: String(req.file.originalname || "resume.pdf").slice(0, 255),
      uploadedAt: new Date(),
    };
    await profile.save();
    if (previous) {
      await deleteAsset(previous, { resource_type: "raw" }).catch(() => {});
      await deleteAsset(previous, { resource_type: "image" }).catch(() => {});
    }
    emitProfileUpdated(req, "resume-updated");
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    console.error("Resume upload error:", error);
    if (error.http_code === 401 || /invalid cloud_name|api_key/i.test(error.message || "")) {
      return res.status(503).json({ message: "Cloudinary configuration is invalid. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET." });
    }
    return res.status(500).json({ message: "Unable to upload resume" });
  }
}

async function deleteAvatar(req, res) {
  try {
    const profile = await getOrCreateProfile(req.user);
    const previous = profile.avatar?.publicId;
    profile.avatar = { url: "", publicId: "" };
    await profile.save();
    await User.findByIdAndUpdate(req.user._id, { $set: { avatarUrl: "" } });
    if (previous) await deleteAsset(previous, { resource_type: "image" }).catch(() => {});
    await emitProfileUpdated(req, "avatar-removed", "");
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    console.error("Avatar delete error:", error);
    return res.status(500).json({ message: "Unable to remove avatar" });
  }
}

async function deleteResume(req, res) {
  try {
    const profile = await getOrCreateProfile(req.user);
    const previous = profile.resume?.publicId;
    profile.resume = { url: "", publicId: "", fileName: "", uploadedAt: null };
    await profile.save();
    if (previous) {
      await deleteAsset(previous, { resource_type: "raw" }).catch(() => {});
      await deleteAsset(previous, { resource_type: "image" }).catch(() => {});
    }
    emitProfileUpdated(req, "resume-removed");
    return res.json(await profileResponse(req, profile));
  } catch (error) {
    console.error("Resume delete error:", error);
    return res.status(500).json({ message: "Unable to remove resume" });
  }
}

module.exports = { getMyProfile, getMyProfileActivity, getPublicProfileActivity, updateMyProfile, getPublicProfile, deliverPublicResume, uploadAvatar, uploadResume, deleteAvatar, deleteResume };
