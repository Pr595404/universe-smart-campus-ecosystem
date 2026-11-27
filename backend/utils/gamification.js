const db = require('../config/database');

/**
 * Award XP and unlock matching badges/quests only when an actual user action completes.
 */
function recordActionProgress(userId, actionType, xpAmount = 0) {
  if (!userId) return { xpAwarded: 0, unlockedBadges: [] };

  let totalAwarded = xpAmount;
  const unlockedBadges = [];

  // Check if any quest matches this action_type and hasn't been completed yet
  const matchingQuests = db.prepare('SELECT * FROM quests WHERE action_type = ?').all(actionType);
  for (const quest of matchingQuests) {
    const done = db.prepare('SELECT 1 FROM user_quests WHERE user_id = ? AND quest_id = ?').get(userId, quest.id);
    if (!done) {
      db.prepare('INSERT INTO user_quests (user_id, quest_id) VALUES (?, ?)').run(userId, quest.id);
      totalAwarded += quest.xp_reward;
    }
  }

  // Badge mapping based on actionType
  const badgeSlugMap = {
    event: 'event-explorer',
    collab: 'team-player',
    upload_resource: 'knowledge-sharer',
    project_idea: 'innovation-master'
  };

  const targetSlug = badgeSlugMap[actionType];
  if (targetSlug) {
    const badge = db.prepare('SELECT * FROM badges WHERE slug = ?').get(targetSlug);
    if (badge) {
      const hasBadge = db.prepare('SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badge.id);
      if (!hasBadge) {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
        totalAwarded += badge.xp_reward;
        unlockedBadges.push(badge.name);
      }
    }
  }

  if (totalAwarded > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(totalAwarded, userId);
  }

  // Check Campus Legend badge (>= 500 XP)
  const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
  if (user && user.xp >= 500) {
    const legendBadge = db.prepare("SELECT * FROM badges WHERE slug = 'campus-legend'").get();
    if (legendBadge) {
      const hasLegend = db.prepare('SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, legendBadge.id);
      if (!hasLegend) {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, legendBadge.id);
        unlockedBadges.push(legendBadge.name);
      }
    }
  }

  return { xpAwarded: totalAwarded, unlockedBadges };
}

module.exports = { recordActionProgress };
