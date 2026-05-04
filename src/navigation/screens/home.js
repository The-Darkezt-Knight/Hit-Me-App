import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  subscribeToPublicPosts,
  updatePost
} from '../../services/posts';

const colors = {
  background: '#ffffff',
  card: '#ffffff',
  primary: '#0b8bd4',
  primaryDark: '#0a6aa3',
  accent: '#d9f1ff',
  accentStrong: '#b7e4ff',
  border: '#d6e8f6',
  text: '#0f172a',
  muted: '#4a5b76',
  soft: '#eef6ff'
};

export default function Home({ navigation }) {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPublicPosts(
      (nextPosts) => {
        setPosts(nextPosts);
        setLoading(false);
      },
      () => {
        setError('Unable to load posts right now.');
        setLoading(false);
      },
      { debug: __DEV__ }
    );

    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (payload) => {
    if (!user) {
      throw new Error('Please sign in to post.');
    }

    setSubmitting(true);
    try {
      await createPost({
        ...payload,
        authorId: user.uid,
        authorEmail: user.email || 'Unknown',
        authorName: user.fullName?.trim?.() || '',
        authorProfileImage: user.profileImage?.trim?.() || ''
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
        const authorName = post.authorName || '';
        const haystack = `${topic} ${explanation} ${author} ${authorName}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : posts;

  const feedContent = (
    <View style={styles.feedContent}>
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
        <Text style={styles.stateText}>No public posts yet.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        <View style={styles.headerBar}>
          <View style={styles.brandBlock}>
            <View style={styles.brandMark} />
            <View>
              <Text style={styles.brandTitle}>Hit-Me</Text>
              <Text style={styles.brandTag}>Public feed</Text>
            </View>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Search public posts"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.secondaryButtonSmall}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.secondaryButtonSmallText}>Open profile</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButtonSmall}
              onPress={handleOpenComposer}
            >
              <Text style={styles.primaryButtonSmallText}>New post</Text>
            </Pressable>
            <Pressable style={styles.secondaryButtonSmall} onPress={logout}>
              <Text style={styles.secondaryButtonSmallText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.feedShell}>
          <ScrollView
            style={styles.feedScroll}
            contentContainerStyle={styles.feedScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {feedContent}
          </ScrollView>
        </View>
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
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'Georgia'
  },
  brandTag: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Trebuchet MS'
  },
  searchWrap: {
    flex: 1,
    minWidth: 220
  },
  searchInput: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: colors.soft,
    color: colors.text,
    fontFamily: 'Trebuchet MS'
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
  primaryButtonSmall: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  primaryButtonSmallText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'Trebuchet MS'
  },
  secondaryButtonSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  secondaryButtonSmallText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
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
})