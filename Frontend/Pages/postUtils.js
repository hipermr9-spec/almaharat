export function normalizeHashtags(value) {
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string' && tag.trim());
  }

  if (typeof value !== 'string') return [];

  // Accept legacy comma-separated values, and JSON arrays saved as strings.
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return normalizeHashtags(parsed);
  } catch {
    // A plain comma-separated string is expected for older posts.
  }

  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function normalizePost(post) {
  return {
    ...post,
    hashtags: normalizeHashtags(post?.hashtags),
  };
}
