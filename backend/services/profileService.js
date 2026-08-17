const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const DeveloperProfile = require("../models/DeveloperProfile");
const { calculateProfileCompletion } = require("./profileCompletionService");

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;

function cleanString(value, field, maxLength) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const result = value.trim();
  if (result.length > maxLength) throw new Error(`${field} is too long`);
  return result;
}

function validateUrl(value, field) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${field} must be a valid http(s) URL`);
  }
}

function normalizeArray(value, field, maxItems, maxItemLength) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${field} must be an array`);
  return value.map((item) => cleanString(item, field, maxItemLength)).filter(Boolean);
}

function normalizeUsername(value) {
  if (value === undefined) return undefined;
  const username = cleanString(value, "username", 30).toLowerCase();
  if (username && !USERNAME_PATTERN.test(username)) {
    throw new Error("username may contain lowercase letters, numbers, dots, underscores and hyphens");
  }
  return username || undefined;
}

function normalizeProfilePatch(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Profile payload must be an object");
  const allowed = new Set([
    "username", "displayName", "headline", "about", "location", "openToWork",
    "socialLinks", "education", "schoolEducation", "skills", "developerInfo", "projects", "achievements", "certifications", "privacy", "profileVisibility", "resumeVisibility",
  ]);
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`Unsupported profile field: ${unknown[0]}`);

  const patch = {};
  if (body.username !== undefined) patch.username = normalizeUsername(body.username);
  for (const [field, max] of [["displayName", 100], ["headline", 160], ["about", 4000], ["location", 120]]) {
    const value = cleanString(body[field], field, max);
    if (value !== undefined) patch[field] = value;
  }
  if (body.openToWork !== undefined) {
    if (typeof body.openToWork !== "boolean") throw new Error("openToWork must be boolean");
    patch.openToWork = body.openToWork;
  }
  if (body.profileVisibility !== undefined) {
    if (!["public", "private"].includes(body.profileVisibility)) throw new Error("Invalid profile visibility");
    patch.profileVisibility = body.profileVisibility;
  }
  if (body.resumeVisibility !== undefined) {
    if (!["public", "private"].includes(body.resumeVisibility)) throw new Error("Invalid resume visibility");
    patch.resumeVisibility = body.resumeVisibility;
  }
  if (body.socialLinks !== undefined) {
    if (!body.socialLinks || typeof body.socialLinks !== "object" || Array.isArray(body.socialLinks)) throw new Error("socialLinks must be an object");
    patch.socialLinks = {};
    for (const field of ["github", "linkedin", "portfolio"]) {
      if (body.socialLinks[field] !== undefined) patch.socialLinks[field] = validateUrl(cleanString(body.socialLinks[field], `socialLinks.${field}`, 500), `socialLinks.${field}`);
    }
  }
  if (body.education !== undefined) {
    if (!Array.isArray(body.education) || body.education.length > 10) throw new Error("education must contain at most 10 entries");
    patch.education = body.education.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid education entry");
      const result = {};
      for (const [field, max] of [["institution", 200], ["board", 100], ["stream", 100], ["degree", 120], ["field", 120]]) {
        const value = cleanString(entry[field], `education.${field}`, max);
        if (value !== undefined) result[field] = value;
      }
      for (const field of ["startYear", "endYear"]) {
        if (entry[field] === "") { result[field] = null; continue; }
        if (entry[field] !== undefined && entry[field] !== null && (!Number.isInteger(entry[field]) || entry[field] < 1900 || entry[field] > 2200)) throw new Error(`education.${field} is invalid`);
        if (entry[field] !== undefined) result[field] = entry[field];
      }
      if (entry.percentage === "") result.percentage = null;
      if (entry.percentage !== undefined && entry.percentage !== null && (typeof entry.percentage !== "number" || !Number.isFinite(entry.percentage) || entry.percentage < 0 || entry.percentage > 100)) throw new Error("education.percentage is invalid");
      if (entry.percentage !== undefined && entry.percentage !== "") result.percentage = entry.percentage;
      if (entry.reportCardUrl !== undefined) result.reportCardUrl = validateUrl(cleanString(entry.reportCardUrl, "education.reportCardUrl", 500), "education.reportCardUrl");
      if (entry.current !== undefined) {
        if (typeof entry.current !== "boolean") throw new Error("education.current must be boolean");
        result.current = entry.current;
      }
      return result;
    });
  }
  if (body.schoolEducation !== undefined) {
    if (!body.schoolEducation || typeof body.schoolEducation !== "object" || Array.isArray(body.schoolEducation)) throw new Error("schoolEducation must be an object");
    patch.schoolEducation = {};
    for (const [level, fields] of [["tenth", ["school", "board"]], ["twelfth", ["school", "board", "stream"]]]) {
      const entry = body.schoolEducation[level];
      if (entry === undefined) continue;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`schoolEducation.${level} must be an object`);
      const result = {};
      for (const field of fields) {
        const value = cleanString(entry[field], `schoolEducation.${level}.${field}`, 200);
        if (value !== undefined) result[field] = value;
      }
      for (const field of ["year", "percentage"]) {
        if (entry[field] === "") { result[field] = null; continue; }
        if (entry[field] !== undefined && entry[field] !== null && (typeof entry[field] !== "number" || !Number.isFinite(entry[field]) || (field === "year" ? entry[field] < 1900 || entry[field] > 2200 : entry[field] < 0 || entry[field] > 100))) throw new Error(`schoolEducation.${level}.${field} is invalid`);
        if (entry[field] !== undefined) result[field] = entry[field];
      }
      if (entry.reportCardUrl !== undefined) result.reportCardUrl = validateUrl(cleanString(entry.reportCardUrl, `schoolEducation.${level}.reportCardUrl`, 500), `schoolEducation.${level}.reportCardUrl`);
      patch.schoolEducation[level] = result;
    }
  }
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills) || body.skills.length > 50) throw new Error("skills must contain at most 50 entries");
    patch.skills = body.skills.map((entry) => {
      if (typeof entry === "string") return { name: cleanString(entry, "skills.name", 60) };
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid skill entry");
      const name = cleanString(entry.name, "skills.name", 60);
      if (!name) throw new Error("skills.name is required");
      const result = { name };
      if (entry.level !== undefined) result.level = cleanString(entry.level, "skills.level", 30);
      if (entry.years !== undefined && entry.years !== null && (typeof entry.years !== "number" || entry.years < 0 || entry.years > 80)) throw new Error("skills.years is invalid");
      if (entry.years !== undefined) result.years = entry.years;
      return result;
    });
  }
  if (body.developerInfo !== undefined) {
    if (!body.developerInfo || typeof body.developerInfo !== "object" || Array.isArray(body.developerInfo)) throw new Error("developerInfo must be an object");
    patch.developerInfo = {};
    for (const [field, max] of [["primaryRole", 100], ["experienceLevel", 50]]) {
      const value = cleanString(body.developerInfo[field], `developerInfo.${field}`, max);
      if (value !== undefined) patch.developerInfo[field] = value;
    }
    for (const field of ["preferredLanguages", "interests"]) {
      const value = normalizeArray(body.developerInfo[field], `developerInfo.${field}`, 30, 80);
      if (value !== undefined) patch.developerInfo[field] = value;
    }
  }
  if (body.projects !== undefined) {
    if (!Array.isArray(body.projects) || body.projects.length > 20) throw new Error("projects must contain at most 20 entries");
    patch.projects = body.projects.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid project entry");
      const result = {};
      for (const [field, max] of [["title", 160], ["description", 2000]]) {
        const value = cleanString(entry[field], `projects.${field}`, max);
        if (value !== undefined) result[field] = value;
      }
      for (const field of ["liveUrl", "sourceUrl", "imageUrl"]) {
        if (entry[field] !== undefined) result[field] = validateUrl(cleanString(entry[field], `projects.${field}`, 500), `projects.${field}`);
      }
      for (const field of ["startDate", "endDate"]) {
        if (entry[field] === "") { result[field] = null; continue; }
        if (entry[field] !== undefined && entry[field] !== null && Number.isNaN(new Date(entry[field]).getTime())) throw new Error(`projects.${field} is invalid`);
        if (entry[field] !== undefined) result[field] = entry[field] ? new Date(entry[field]) : null;
      }
      if (entry.featured !== undefined) {
        if (typeof entry.featured !== "boolean") throw new Error("projects.featured must be boolean");
        result.featured = entry.featured;
      }
      const technologies = normalizeArray(entry.technologies, "projects.technologies", 30, 60);
      if (technologies !== undefined) result.technologies = technologies;
      return result;
    });
  }
  for (const [field, maxItems] of [["achievements", 30], ["certifications", 30]]) {
    if (body[field] === undefined) continue;
    if (!Array.isArray(body[field]) || body[field].length > maxItems) throw new Error(`${field} must contain at most ${maxItems} entries`);
    patch[field] = body[field].map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Invalid ${field} entry`);
      const result = {};
      const textFields = field === "achievements"
        ? [["title", 160], ["description", 2000], ["issuer", 160]]
        : [["name", 160], ["issuer", 160]];
      for (const [name, max] of textFields) {
        const value = cleanString(entry[name], `${field}.${name}`, max);
        if (value !== undefined) result[name] = value;
      }
      const urlField = field === "achievements" ? "link" : "credentialUrl";
      if (entry[urlField] !== undefined) result[urlField] = validateUrl(cleanString(entry[urlField], `${field}.${urlField}`, 500), `${field}.${urlField}`);
      const dateField = field === "achievements" ? "date" : "issuedAt";
      if (entry[dateField] === "") { result[dateField] = null; return result; }
      if (entry[dateField] !== undefined && entry[dateField] !== null && Number.isNaN(new Date(entry[dateField]).getTime())) throw new Error(`${field}.${dateField} is invalid`);
      if (entry[dateField] !== undefined) result[dateField] = entry[dateField] ? new Date(entry[dateField]) : null;
      return result;
    });
  }
  if (body.privacy !== undefined) {
    if (!body.privacy || typeof body.privacy !== "object" || Array.isArray(body.privacy)) throw new Error("privacy must be an object");
    patch.privacy = {};
    for (const field of ["showEducation", "showStats", "showActivity"]) {
      if (body.privacy[field] !== undefined) {
        if (typeof body.privacy[field] !== "boolean") throw new Error(`privacy.${field} must be boolean`);
        patch.privacy[field] = body.privacy[field];
      }
    }
  }
  return patch;
}

function publicProfile(profile) {
  const value = profile.toObject ? profile.toObject() : profile;
  return {
    username: value.username || "",
    displayName: value.displayName || "",
    headline: value.headline || "",
    about: value.about || "",
    location: value.location || "",
    openToWork: Boolean(value.openToWork),
    avatar: { url: value.avatar?.url || "" },
    banner: { url: value.banner?.url || "" },
    socialLinks: {
      github: value.socialLinks?.github || "",
      linkedin: value.socialLinks?.linkedin || "",
      portfolio: value.socialLinks?.portfolio || "",
    },
    education: value.privacy?.showEducation !== false ? (value.education || []).map(({ institution, board, stream, degree, field, startYear, endYear, current, percentage, reportCardUrl }) => ({ institution, board, stream, degree, field, startYear, endYear, current, percentage, reportCardUrl })) : [],
    schoolEducation: value.privacy?.showEducation !== false ? {
      tenth: { school: value.schoolEducation?.tenth?.school || "", board: value.schoolEducation?.tenth?.board || "", year: value.schoolEducation?.tenth?.year || null, percentage: value.schoolEducation?.tenth?.percentage ?? null, reportCardUrl: value.schoolEducation?.tenth?.reportCardUrl || "" },
      twelfth: { school: value.schoolEducation?.twelfth?.school || "", board: value.schoolEducation?.twelfth?.board || "", stream: value.schoolEducation?.twelfth?.stream || "", year: value.schoolEducation?.twelfth?.year || null, percentage: value.schoolEducation?.twelfth?.percentage ?? null, reportCardUrl: value.schoolEducation?.twelfth?.reportCardUrl || "" },
    } : { tenth: {}, twelfth: {} },
    skills: (value.skills || []).map(({ name, level, years }) => ({ name, level, years })),
    developerInfo: {
      primaryRole: value.developerInfo?.primaryRole || "",
      experienceLevel: value.developerInfo?.experienceLevel || "",
      preferredLanguages: value.developerInfo?.preferredLanguages || [],
      interests: value.developerInfo?.interests || [],
    },
    projects: (value.projects || []).map(({ title, description, technologies, liveUrl, sourceUrl, imageUrl, startDate, endDate, featured }) => ({ title, description, technologies, liveUrl, sourceUrl, imageUrl, startDate, endDate, featured })),
    achievements: (value.achievements || []).map(({ title, description, issuer, date, link }) => ({ title, description, issuer, date, link })),
    certifications: (value.certifications || []).map(({ name, issuer, credentialUrl, issuedAt }) => ({ name, issuer, credentialUrl, issuedAt })),
    resume: value.resumeVisibility === "public" && value.resume?.url ? {
      url: value.resume.url,
      fileName: value.resume.fileName || "Resume",
      uploadedAt: value.resume.uploadedAt || null,
    } : null,
    profileVisibility: value.profileVisibility,
    privacy: { showEducation: value.privacy?.showEducation !== false, showStats: value.privacy?.showStats !== false, showActivity: value.privacy?.showActivity !== false },
  };
}

async function getOrCreateProfile(user) {
  let profile = await DeveloperProfile.findOne({ userId: user._id });
  if (profile) return profile;
  const legacy = await StudentProfile.findOne({ userId: user._id }).lean();
  profile = await DeveloperProfile.create({
    userId: user._id,
    username: user.username || legacy?.username || undefined,
    displayName: user.name || legacy?.fullName || "",
    avatar: { url: user.avatarUrl || legacy?.avatar || "" },
  });
  return profile;
}

async function updateProfile(user, body) {
  const patch = normalizeProfilePatch(body);
  const profile = await getOrCreateProfile(user);
  if (patch.username !== undefined && patch.username !== profile.username) {
    const existing = await User.findOne({ username: patch.username, _id: { $ne: user._id } }).select("_id").lean();
    if (existing) throw new Error("Username is already in use");
    const existingProfile = await DeveloperProfile.findOne({ username: patch.username, userId: { $ne: user._id } }).select("_id").lean();
    if (existingProfile) throw new Error("Username is already in use");
    await User.updateOne({ _id: user._id }, { $set: { username: patch.username } });
  }
  // PATCH is intentionally partial. Merge nested objects so a client updating
  // one social link or developer field cannot erase the other saved fields.
  if (patch.socialLinks) {
    profile.socialLinks = { ...(profile.socialLinks?.toObject?.() || profile.socialLinks || {}), ...patch.socialLinks };
    delete patch.socialLinks;
  }
  if (patch.developerInfo) {
    profile.developerInfo = { ...(profile.developerInfo?.toObject?.() || profile.developerInfo || {}), ...patch.developerInfo };
    delete patch.developerInfo;
  }
  if (patch.schoolEducation) {
    profile.schoolEducation = {
      ...(profile.schoolEducation?.toObject?.() || profile.schoolEducation || {}),
      ...patch.schoolEducation,
      tenth: { ...(profile.schoolEducation?.tenth?.toObject?.() || profile.schoolEducation?.tenth || {}), ...(patch.schoolEducation.tenth || {}) },
      twelfth: { ...(profile.schoolEducation?.twelfth?.toObject?.() || profile.schoolEducation?.twelfth || {}), ...(patch.schoolEducation.twelfth || {}) },
    };
    delete patch.schoolEducation;
  }
  if (patch.privacy) {
    profile.privacy = { ...(profile.privacy?.toObject?.() || profile.privacy || {}), ...patch.privacy };
    delete patch.privacy;
  }
  Object.assign(profile, patch);
  await profile.save();
  return profile;
}

function serializeOwnProfile(profile) {
  return { profile: profile.toObject(), completion: calculateProfileCompletion(profile) };
}

module.exports = { getOrCreateProfile, updateProfile, serializeOwnProfile, publicProfile, normalizeProfilePatch };
