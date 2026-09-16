import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useTheme, type Theme } from '@/theme';
import type { ConversationMessage, GrammarIssue, IssueSeverity } from '@/types';

/** Which face of a turn's analysis the sheet is showing. */
export type TurnFeedbackMode = 'grammar' | 'polished';

export interface TurnFeedbackSheetProps {
  readonly visible: boolean;
  readonly mode: TurnFeedbackMode;
  /** Undefined while the sheet is closing and the turn has been cleared. */
  readonly message?: ConversationMessage;
  readonly onClose: () => void;
}

/**
 * Per-reply feedback, opened from the two buttons under a user turn.
 *
 * This is where the product rule is enforced, not softened: the AI never
 * corrects mid-conversation, so nothing in here is pushed at the learner. The
 * transcript shows two quiet buttons, and this only opens when one is tapped.
 *
 * `grammar` lists every mistake found in that whole reply; `polished` shows the
 * same reply rewritten naturally, next to what they actually said.
 */
export function TurnFeedbackSheet({
  visible,
  mode,
  message,
  onClose,
}: TurnFeedbackSheetProps): React.JSX.Element {
  const analysis = message?.analysis;
  const issues = analysis?.grammar ?? [];
  const isGrammar = mode === 'grammar';

  return (
    <BottomSheet
      visible={visible}
      title={isGrammar ? 'Grammar in this reply' : 'A more polished version'}
      subtitle={
        isGrammar
          ? grammarSubtitle(issues.length)
          : 'Your answer tidied up, plus other things you could have said.'
      }
      onClose={onClose}
      footer={
        <Button label="Back to the chat" fullWidth size="lg" variant="ink" onPress={onClose} />
      }
    >
      {!analysis ? (
        <AppText variant="callout" color="textSecondary">
          This reply has not been looked at yet.
        </AppText>
      ) : isGrammar ? (
        <GrammarBody issues={issues} />
      ) : (
        <PolishedBody
          original={message?.text ?? ''}
          polished={analysis.polishedResponse}
          alternatives={analysis.alternativeAnswers}
        />
      )}
    </BottomSheet>
  );
}

const grammarSubtitle = (count: number): string =>
  count === 0
    ? 'Nothing to fix here.'
    : `${count} ${count === 1 ? 'thing' : 'things'} worth a look.`;

function GrammarBody({ issues }: { readonly issues: readonly GrammarIssue[] }): React.JSX.Element {
  const theme = useTheme();

  if (issues.length === 0) {
    return (
      <View
        style={[styles.card, { borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
      >
        <AppText variant="bodyStrong">No grammar mistakes in this one.</AppText>
        <AppText variant="callout" color="textSecondary">
          This reply reads correctly as it is. Keep going.
        </AppText>
      </View>
    );
  }

  return (
    <>
      {issues.map((issue, index) => (
        <GrammarCard key={`${issue.original}-${index}`} issue={issue} theme={theme} />
      ))}
    </>
  );
}

function GrammarCard({
  issue,
  theme,
}: {
  readonly issue: GrammarIssue;
  readonly theme: Theme;
}): React.JSX.Element {
  const tone = severityTone(issue.severity, theme);

  return (
    <View
      style={[styles.card, { borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: tone.background, borderRadius: theme.radius.pill },
        ]}
      >
        {/* The word, not just the colour, carries the severity. */}
        <AppText variant="footnoteStrong" style={{ color: tone.color }}>
          {SEVERITY_LABEL[issue.severity]}
        </AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="body">
          You said “
          <AppText
            variant="body"
            color="textSecondary"
            style={[styles.strike, { textDecorationColor: theme.colors.danger }]}
          >
            {issue.original}
          </AppText>
          ”.
        </AppText>
        <AppText variant="callout" color="textSecondary">
          {issue.explanation}
        </AppText>
      </View>

      <View
        style={[
          styles.suggestion,
          { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.md },
        ]}
      >
        <AppText variant="overline" color="primaryStrong">
          Say it like this
        </AppText>
        <AppText variant="bodyStrong">{issue.correction}</AppText>
      </View>
    </View>
  );
}

function PolishedBody({
  original,
  polished,
  alternatives,
}: {
  readonly original: string;
  readonly polished: string;
  /**
   * Other answers to the same question - not rewordings of this one. Zero, one
   * or two; never assume two.
   */
  readonly alternatives: readonly string[];
}): React.JSX.Element {
  const theme = useTheme();
  const trimmed = polished.trim();
  // An empty or identical rewrite is a real answer, not a missing one - the
  // model was asked to rewrite and found nothing worth changing.
  const unchanged = trimmed.length === 0 || trimmed === original.trim();

  return (
    <>
      <View
        style={[styles.card, { borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}
      >
        <AppText variant="overline" color="textTertiary">
          What you said
        </AppText>
        <AppText variant="body" color="textSecondary">
          {original}
        </AppText>
      </View>

      <View
        style={[
          styles.card,
          {
            borderColor: theme.colors.primarySoftStrong,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.primarySoft,
          },
        ]}
      >
        <AppText variant="overline" color="primaryStrong">
          Polished
        </AppText>
        {unchanged ? (
          <AppText variant="body">
            This already sounds natural — there is nothing here worth rewriting.
          </AppText>
        ) : (
          <AppText variant="bodyStrong">{trimmed}</AppText>
        )}
      </View>

      {/* A different job from the box above. Polished fixes what they said;
          this answers the question a second and third way, which is what
          actually helps someone who could only think of one reply. Rendered
          only when the model produced them, rather than leaving empty slots. */}
      {alternatives.length > 0 ? (
        <View style={styles.alternatives}>
          <AppText variant="overline" color="textTertiary">
            You could also have answered
          </AppText>
          <AppText variant="footnote" color="neutral" style={styles.altIntro}>
            Different answers to the same question, in simple English.
          </AppText>
          {alternatives.map((alternative, index) => (
            <View
              key={alternative}
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            >
              <View style={styles.altHead}>
                <View
                  style={[
                    styles.altNumber,
                    {
                      backgroundColor: theme.colors.successSoft,
                      borderRadius: theme.radius.pill,
                    },
                  ]}
                >
                  <AppText variant="footnoteStrong" style={{ color: theme.colors.successText }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.altText}>
                  {alternative}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

const SEVERITY_LABEL: Readonly<Record<IssueSeverity, string>> = {
  major: 'Worth fixing',
  moderate: 'Small slip',
  minor: 'Minor',
};

const severityTone = (
  severity: IssueSeverity,
  theme: Theme,
): { readonly background: string; readonly color: string } => {
  switch (severity) {
    case 'major':
      return { background: theme.colors.dangerSoft, color: theme.colors.danger };
    case 'moderate':
      return { background: theme.colors.warningSoft, color: theme.colors.warningText };
    case 'minor':
    default:
      return { background: theme.colors.infoSoft, color: theme.colors.infoText };
  }
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 8 },
  badge: {
    height: 24,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { gap: 6 },
  alternatives: { gap: 10 },
  altIntro: { marginTop: -4 },
  altHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  altNumber: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  altText: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
  suggestion: { padding: 12, gap: 4 },
});
