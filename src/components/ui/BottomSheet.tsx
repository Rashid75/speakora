import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { HIT_SLOP, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface BottomSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly subtitle?: string;
  readonly onClose: () => void;
  /** Pinned under the scrolling body - typically a single dismiss button. */
  readonly footer?: React.ReactNode;
  readonly children?: React.ReactNode;
}

/**
 * The pull-up sheet chrome shared by every modal in the app: dimmed backdrop,
 * grabber, title block with a close button, scrolling body, pinned footer.
 *
 * Extracted so the notes drawer, the per-turn feedback sheets and the in-chat
 * settings sheet cannot drift apart - they are the same object to the learner,
 * so they have to look and behave identically.
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: BottomSheetProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            // Lifted clear of the keyboard by hand. The modal's own window
            // ignores the activity's `adjustResize`, so without this a sheet
            // with a text field in it is typed into blind.
            marginBottom: keyboard,
            // The home-indicator inset is meaningless once the keyboard owns
            // that space, so it is dropped rather than added on top.
            paddingBottom: keyboard > 0 ? 16 : Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="title3" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="callout" color="textSecondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Close ${title}`}
            style={[
              styles.close,
              { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill },
            ]}
          >
            <AppText variant="callout" color="textSecondary">
              ✕
            </AppText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { maxHeight: '86%' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  headerText: { flex: 1, gap: 2 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { marginTop: 18 },
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
