import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PRIVACY_PRIVATE, PRIVACY_PUBLIC } from '../services/posts';

const colors = {
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

const URL_PATTERN = /^https?:\/\//i;

function parseImageUrls(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isValidUrl(value) {
  return URL_PATTERN.test(value);
}

function formatImageUrls(value) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value.filter(Boolean).join(', ');
}

export default function PostComposer({
  user,
  onSubmit,
  busy,
  title = 'Create a post',
  submitLabel = 'Post now',
  initialTopic = '',
  initialExplanation = '',
  initialPrivacy = PRIVACY_PUBLIC,
  initialImageUrls = [],
  resetKey
}) {
  const initialImageValue = formatImageUrls(initialImageUrls);
  const [topic, setTopic] = useState(initialTopic);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [privacy, setPrivacy] = useState(initialPrivacy || PRIVACY_PUBLIC);
  const [imageInput, setImageInput] = useState(initialImageValue);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBusy = Boolean(busy || submitting);

  useEffect(() => {
    setTopic(initialTopic || '');
    setExplanation(initialExplanation || '');
    setPrivacy(initialPrivacy || PRIVACY_PUBLIC);
    setImageInput(initialImageValue);
    setError('');
  }, [initialTopic, initialExplanation, initialPrivacy, initialImageValue, resetKey]);

  const handleSubmit = async () => {
    const trimmedTopic = topic.trim();
    const trimmedExplanation = explanation.trim();

    if (!user) {
      setError('Please sign in to post.');
      return;
    }

    if (!trimmedTopic) {
      setError('Topic is required.');
      return;
    }

    if (!trimmedExplanation) {
      setError('Explanation is required.');
      return;
    }

    if (!privacy) {
      setError('Privacy is required.');
      return;
    }

    const parsedUrls = parseImageUrls(imageInput);
    const invalidUrls = parsedUrls.filter((url) => !isValidUrl(url));

    if (invalidUrls.length) {
      setError('One or more image URLs are invalid.');
      return;
    }

    if (!onSubmit) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        topic: trimmedTopic,
        explanation: trimmedExplanation,
        privacy,
        imageUrls: parsedUrls
      });
      setTopic('');
      setExplanation('');
      setImageInput('');
      setPrivacy(PRIVACY_PUBLIC);
    } catch (submitError) {
      setError(submitError?.message || 'Unable to create the post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Topic</Text>
        <TextInput
          placeholder="Add a short topic"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Explanation</Text>
        <TextInput
          placeholder="Share the details"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
          value={explanation}
          onChangeText={setExplanation}
          multiline
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Image URLs (optional)</Text>
        <TextInput
          placeholder="Paste image links separated by commas"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={imageInput}
          onChangeText={setImageInput}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Privacy</Text>
        <View style={styles.privacyRow}>
          {[PRIVACY_PUBLIC, PRIVACY_PRIVATE].map((value) => {
            const isSelected = privacy === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.privacyChip,
                  isSelected ? styles.privacyChipActive : null
                ]}
                onPress={() => setPrivacy(value)}
              >
                <Text
                  style={
                    isSelected
                      ? styles.privacyChipTextActive
                      : styles.privacyChipText
                  }
                >
                  {value === PRIVACY_PUBLIC ? 'Public' : 'Private'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, isBusy ? styles.primaryButtonBusy : null]}
        onPress={handleSubmit}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>
          {isBusy ? 'Posting...' : submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'Georgia'
  },
  field: {
    gap: 6,
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'Trebuchet MS'
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    color: colors.text,
    fontFamily: 'Trebuchet MS'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10
  },
  privacyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border
  },
  privacyChipActive: {
    backgroundColor: colors.primary
  },
  privacyChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  privacyChipTextActive: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButtonBusy: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  errorText: {
    color: '#b42318',
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'Trebuchet MS'
  }
});
