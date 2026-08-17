const COMPLETION_FIELDS = [
  ["displayName", (profile) => Boolean(profile.displayName)],
  ["headline", (profile) => Boolean(profile.headline)],
  ["about", (profile) => Boolean(profile.about)],
  ["avatar", (profile) => Boolean(profile.avatar?.url)],
  ["socialLinks", (profile) => Boolean(profile.socialLinks?.github || profile.socialLinks?.linkedin || profile.socialLinks?.portfolio)],
  ["education", (profile) => Array.isArray(profile.education) && profile.education.length > 0],
  ["skills", (profile) => Array.isArray(profile.skills) && profile.skills.length > 0],
  ["developerInfo", (profile) => Boolean(profile.developerInfo?.primaryRole || profile.developerInfo?.experienceLevel)],
  ["projects", (profile) => Array.isArray(profile.projects) && profile.projects.some((project) => project?.title)],
  ["achievements", (profile) => Array.isArray(profile.achievements) && profile.achievements.some((achievement) => achievement?.title)],
  ["certifications", (profile) => Array.isArray(profile.certifications) && profile.certifications.some((certification) => certification?.name)],
  ["schoolEducation", (profile) => Boolean(profile.schoolEducation?.tenth?.school || profile.schoolEducation?.twelfth?.school)],
];

function calculateProfileCompletion(profile) {
  const completed = COMPLETION_FIELDS.filter(([, check]) => check(profile)).length;
  const total = COMPLETION_FIELDS.length;
  return {
    percentage: Math.round((completed / total) * 100),
    completed,
    total,
    missing: COMPLETION_FIELDS.filter(([, check]) => !check(profile)).map(([name]) => name),
  };
}

module.exports = { calculateProfileCompletion };
