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
  background: '#f0f2f5',
  card: '#ffffff',
  primary: '#0866ff',
  primaryDark: '#0750c4',
  accent: '#e7f3ff',
  accentStrong: '#1877f2',
  border: '#ccd0d5',
  text: '#050505',
  muted: '#65676b',
  soft: '#f0f2f5'
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
            <View style={styles.brandMark}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 24, lineHeight: 28, fontFamily: 'Arial'}}>f</Text>
            </View>
            <View style={styles.searchWrap}>
              <TextInput
                placeholder="Search Hit-Me"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.primaryButtonSmall}
              onPress={handleOpenComposer}
            >
              <Text style={styles.primaryButtonSmallText}>New post</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButtonSmall}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.secondaryButtonSmallText}>Back home</Text>
            </Pressable>
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
              <Pressable
                style={styles.secondaryButtonSmall}
                onPress={handleCloseComposer}
              >
                <Text style={styles.secondaryButtonSmallText}>Close</Text>
              </Pressable>
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
    width: '100%',
    alignSelf: 'center'
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 10
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    display: 'none'
  },
  brandTag: {
    display: 'none'
  },
  searchWrap: {
    flex: 1,
    maxWidth: 240,
    marginLeft: 8
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 16,
    backgroundColor: colors.soft,
    color: colors.text,
    fontSize: 15
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  feedShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    marginTop: 20
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
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    gap: 8
  },
  profileIntroAccent: {
    width: 46,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accentStrong
  },
  profileIntroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Georgia'
  },
  profileIntroText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    fontFamily: 'Trebuchet MS'
  },
  primaryButtonSmall: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  primaryButtonSmallText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14
  },
  secondaryButtonSmall: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  secondaryButtonSmallText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600'
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Trebuchet MS'
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
    fontFamily: 'Georgia'
  },
  modalContent: {
    paddingBottom: 8
  }
});