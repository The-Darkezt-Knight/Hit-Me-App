import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const InteractiveButton = ({ onPress, style, children }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
import PostCard from '../../component/PostCard';
import PostComposer from '../../component/PostComposer';
import { useAuth } from '../../context/AuthContext';
import {
  createPost,
  deletePost,
  PRIVACY_PUBLIC,
  subscribeToUserPosts,
  updatePost
} from '../../services/posts';

const colors = {
  background: '#ffffff',
  card: '#ffffff',
  primary: '#000000',
  primaryDark: '#1a1a1a',
  accent: '#f0f0f0',
  accentStrong: '#e0e0e0',
  border: '#eaeaea',
  text: '#111111',
  muted: '#666666',
  soft: '#fafafa'
};

export default function Profile({ navigation }) {
  const { user } = useAuth();
  const introFade = useRef(new Animated.Value(0)).current;
  const introSlide = useRef(new Animated.Value(12)).current;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introFade, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true
      }),
      Animated.timing(introSlide, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true
      })
    ]).start();
  }, [introFade, introSlide]);

  useEffect(() => {
    if (!user?.uid) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserPosts(
      user.uid,
      user.email || '',
      (nextPosts) => {
        setPosts(nextPosts);
        setLoading(false);
      },
      () => {
        setError('Unable to load posts right now.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const introStyle = {
    opacity: introFade,
    transform: [{ translateY: introSlide }]
  };

  const handleCreatePost = async (payload) => {
    if (!user) {
      throw new Error('Please sign in to post.');
    }

    setSubmitting(true);
    try {
      await createPost({
        ...payload,
        authorId: user.uid,
        authorEmail: user.email || 'Unknown'
      });
      setComposerOpen(false);
      setEditingPost(null);
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeImageUrls = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => String(entry).trim()).filter(Boolean);
  };

  const handleUpdatePost = async (payload) => {
    if (!user) {
      throw new Error('Please sign in to post.');
    }

    if (!editingPost?.id) {
      return;
    }

    const nextTopic = payload.topic?.trim?.() || '';
    const nextExplanation = payload.explanation?.trim?.() || '';
    const nextPrivacy = payload.privacy || PRIVACY_PUBLIC;
    const nextImageUrls = normalizeImageUrls(payload.imageUrls);

    const currentTopic = editingPost.topic || '';
    const currentExplanation = editingPost.explanation || '';
    const currentPrivacy = editingPost.privacy || PRIVACY_PUBLIC;
    const currentImageUrls = normalizeImageUrls(editingPost.imageUrls);

    const updates = {};
    if (nextTopic !== currentTopic) {
      updates.topic = nextTopic;
    }
    if (nextExplanation !== currentExplanation) {
      updates.explanation = nextExplanation;
    }
    if (nextPrivacy !== currentPrivacy) {
      updates.privacy = nextPrivacy;
    }
    if (JSON.stringify(nextImageUrls) !== JSON.stringify(currentImageUrls)) {
      updates.imageUrls = nextImageUrls;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No changes to save.');
    }

    setSubmitting(true);
    try {
      await updatePost(editingPost.id, updates);
      setComposerOpen(false);
      setEditingPost(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = (post) => {
    setEditingPost(post);
    setComposerOpen(true);
  };

  const handleDeletePost = async (post) => {
    try {
      await deletePost(post.id);
    } catch (deleteError) {
      Alert.alert(
        'Unable to delete post',
        deleteError?.message || 'Please try again.'
      );
    }
  };

  const handleDeleteRequest = (post) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this post? This action cannot be undone.'
      );
      if (confirmed) {
        handleDeletePost(post);
      }
      return;
    }

    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePost(post)
        }
      ]
    );
  };

  const handleOpenComposer = () => {
    setEditingPost(null);
    setComposerOpen(true);
  };

  const handleCloseComposer = () => {
    setComposerOpen(false);
    setEditingPost(null);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = normalizedQuery
    ? posts.filter((post) => {
        const topic = post.topic || '';
        const explanation = post.explanation || '';
        const author = post.authorEmail || '';
        const haystack = `${topic} ${explanation} ${author}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : posts;

  const feedContent = (
    <View style={styles.feedContent}>
      <View style={styles.profileIntroCard}>
        <View style={styles.profileIntroAccent} />
        <Text style={styles.profileIntroTitle}>Your Profile Feed</Text>
        <Text style={styles.profileIntroText}>
          This space shows every post you created, including private updates.
        </Text>
      </View>

      {error ? <Text style={styles.stateText}>{error}</Text> : null}

      {loading ? (
        <Text style={styles.stateText}>Loading posts...</Text>
      ) : filteredPosts.length ? (
        filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.uid}
            onEdit={handleEditRequest}
            onDelete={handleDeleteRequest}
          />
        ))
      ) : posts.length ? (
        <Text style={styles.stateText}>No posts match your search.</Text>
      ) : (
        <Text style={styles.stateText}>No posts yet. Create one above.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <Animated.View style={[styles.headerBar, introStyle]}>
          <View style={styles.brandBlock}>
            <View style={styles.brandMark} />
            <View>
              <Text style={styles.brandTitle}>Hit-Me</Text>
              <Text style={styles.brandTag}>Social studio</Text>
            </View>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Search people, posts, and rooms"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.headerActions}>
            <InteractiveButton
              style={styles.secondaryButtonSmall}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.secondaryButtonSmallText}>Back home</Text>
            </InteractiveButton>
            <InteractiveButton
              style={styles.primaryButtonSmall}
              onPress={handleOpenComposer}
            >
              <Text style={styles.primaryButtonSmallText}>New post</Text>
            </InteractiveButton>
          </View>
        </Animated.View>

        <Animated.View style={[styles.feedShell, introStyle]}>
          <ScrollView
            style={styles.feedScroll}
            contentContainerStyle={styles.feedScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {feedContent}
          </ScrollView>
        </Animated.View>
      </View>

      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseComposer}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPost ? 'Update post' : 'New post'}
              </Text>
              <InteractiveButton
                style={styles.secondaryButtonSmall}
                onPress={handleCloseComposer}
              >
                <Text style={styles.secondaryButtonSmallText}>Close</Text>
              </InteractiveButton>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <PostComposer
                user={user}
                title={editingPost ? 'Update your post' : 'Create a post'}
                submitLabel={editingPost ? 'Save changes' : 'Post now'}
                initialTopic={editingPost?.topic}
                initialExplanation={editingPost?.explanation}
                initialPrivacy={editingPost?.privacy}
                initialImageUrls={editingPost?.imageUrls}
                resetKey={editingPost?.id || 'new'}
                onSubmit={editingPost ? handleUpdatePost : handleCreatePost}
                busy={submitting}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  shell: {
    flex: 1,
    width: '94%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingVertical: 24,
    gap: 18
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  brandTag: {
    fontSize: 12,
    color: colors.muted,
  },
  searchWrap: {
    flex: 1,
    minWidth: 220,
    maxWidth: 400,
  },
  searchInput: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    backgroundColor: colors.background,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  feedShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center'
  },
  feedScroll: {
    flex: 1
  },
  feedScrollContent: {
    paddingBottom: 40
  },
  feedContent: {
    gap: 18
  },
  profileIntroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 8,
    alignItems: 'center',
  },
  profileIntroAccent: {
    display: 'none',
  },
  profileIntroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background,
  },
  profileIntroText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.accentStrong,
    textAlign: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100
  },
  primaryButtonSmallText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryButtonSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100
  },
  secondaryButtonSmallText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 18
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    paddingBottom: 8
  }
});