import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_PRIVATE, setPostReaction } from '../services/posts';

const colors = {
  card: '#ffffff',
  primary: '#16a34a',
  primaryDark: '#15803d',
  accent: '#dcfce7',
  accentStrong: '#86efac',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#4a5b76',
  soft: '#f8fafc'
};

function formatTimestamp(value) {
  if (!value) {
    return 'Just now';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }

  return 'Just now';
}

function formatReactCount(count) {
  const safeCount = Number.isFinite(count) ? count : 0;
  return `${safeCount} react${safeCount === 1 ? '' : 's'}`;
}

function readInitialReactCount(post) {
  const rawCount = post.reactCount ?? 0;
  const parsedCount = Number(rawCount);
  return Number.isFinite(parsedCount) ? parsedCount : 0;
}

function readReactedBy(post) {
  return Array.isArray(post.reactedBy) ? post.reactedBy : [];
}

export default function PostCard({ post, currentUserId, onEdit, onDelete }) {
  const imageUrls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  const privacyLabel = post.privacy === PRIVACY_PRIVATE ? 'Private' : 'Public';
  const isSingleImage = imageUrls.length === 1;
  const hasProfileIdentity = Boolean(post.authorName && post.authorProfileImage);
  const authorLabel = hasProfileIdentity
    ? post.authorName
    : post.authorEmail || 'Unknown';
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = Boolean(currentUserId && post.authorId === currentUserId);
  const [reactCount, setReactCount] = useState(readInitialReactCount(post));
  const [hasReacted, setHasReacted] = useState(false);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    const reactedBy = readReactedBy(post);
    setReactCount(readInitialReactCount(post));
    setHasReacted(Boolean(currentUserId && reactedBy.includes(currentUserId)));
  }, [post, currentUserId]);

  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    if (onEdit) {
      onEdit(post);
    }
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (onDelete) {
      onDelete(post);
    }
  };

  const handleToggleReact = async () => {
    if (!currentUserId || reacting) {
      return;
    }

    const nextReacted = !hasReacted;
    setReacting(true);
    setHasReacted(nextReacted);
    setReactCount((count) => {
      const nextCount = nextReacted ? count + 1 : count - 1;
      return nextCount < 0 ? 0 : nextCount;
    });

    try {
      await setPostReaction(post.id, currentUserId, nextReacted);
    } catch (error) {
      setHasReacted(hasReacted);
      setReactCount(readInitialReactCount(post));
    } finally {
      setReacting(false);
    }
  };

  return (
    <View style={styles.feedCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          {hasProfileIdentity ? (
            <Image
              source={{ uri: post.authorProfileImage }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : null}
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{authorLabel}</Text>
          <Text style={styles.postRole}>
            {privacyLabel} | {formatTimestamp(post.createdAt)}
          </Text>
        </View>
        <View style={styles.postHeaderActions}>
          {canManage ? (
            <View style={styles.menuWrap}>
              <Pressable style={styles.kebabButton} onPress={handleToggleMenu}>
                <Text style={styles.kebabText}>...</Text>
              </Pressable>
              {menuOpen ? (
                <View style={styles.menuPopover}>
                  <Pressable style={styles.menuItem} onPress={handleEdit}>
                    <Text style={styles.menuItemText}>Update</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.menuItem, styles.menuItemDanger]}
                    onPress={handleDelete}
                  >
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.privacyChip}>
            <Text style={styles.privacyChipText}>{privacyLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.topic}>{post.topic}</Text>
      <Text style={styles.postText}>{post.explanation}</Text>

      {imageUrls.length ? (
        <View style={styles.mediaGrid}>
          {imageUrls.map((url, index) => (
            <Image
              key={`${url}-${index}`}
              source={{ uri: url }}
              style={[styles.mediaImage, isSingleImage && styles.mediaImageSingle]}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}

      <View style={styles.postFooter}>
        <Text style={styles.statText}>{formatReactCount(reactCount)}</Text>
        <Pressable
          style={[
            styles.secondaryButtonSmall,
            hasReacted ? styles.secondaryButtonSmallActive : null
          ]}
          onPress={handleToggleReact}
        >
          <Text
            style={
              hasReacted
                ? styles.secondaryButtonSmallTextActive
                : styles.secondaryButtonSmallText
            }
          >
            {hasReacted ? 'Reacted' : 'React'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentStrong,
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  postMeta: {
    flex: 1
  },
  postHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  menuWrap: {
    position: 'relative'
  },
  kebabButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft
  },
  kebabText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '700',
    marginTop: -2
  },
  menuPopover: {
    position: 'absolute',
    top: 34,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    minWidth: 120,
    paddingVertical: 6,
    zIndex: 10
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuItemText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  menuItemTextDanger: {
    color: '#b42318'
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Trebuchet MS'
  },
  postRole: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Trebuchet MS'
  },
  privacyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentStrong
  },
  privacyChipText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  topic: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    fontFamily: 'Georgia'
  },
  postText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    fontFamily: 'Trebuchet MS'
  },
  mediaGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  mediaImage: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  mediaImageSingle: {
    width: '100%',
    height: 220
  },
  postFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  statText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  secondaryButtonSmall: {
    borderWidth: 1,
    borderColor: colors.accentStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f0fdf4'
  },
  secondaryButtonSmallActive: {
    borderColor: colors.primary,
    backgroundColor: colors.accent
  },
  secondaryButtonSmallText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  secondaryButtonSmallTextActive: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  }
});
