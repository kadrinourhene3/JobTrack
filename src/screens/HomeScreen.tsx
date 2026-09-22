import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APPLICATION_STATUS_OPTIONS } from '../applicationStatuses';
import { AppCard, FadeIn, IconButton, ProgressBar, SectionHeader } from '../components';
import { useTheme } from '../context';
import type { Application } from '../types/domain';
import type { DashboardData } from '../services/dashboardService';
import { radius, spacing, typography } from '../theme';

export function HomeScreen({ applications, dashboard, demo, firstName, onApplications, onApplication, onAdd, onProductivity, onNotifications }: { applications: Application[]; dashboard: DashboardData; demo: boolean; firstName: string; onApplications: () => void; onApplication: (id: string) => void; onAdd: () => void; onProductivity: () => void; onNotifications: () => void }) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const compact = screenWidth < 360;
  const pipeline = APPLICATION_STATUS_OPTIONS.map(status => ({ ...status, count: applications.filter(item => item.status === status.label).length }));
  const interviews = applications.filter(item => item.status === 'Interview');
  const offers = applications.filter(item => item.status === 'Offer');
  const scheduledInterview = dashboard.upcomingInterviews[0];
  const upcoming = scheduledInterview ? applications.find(item => item.id === scheduledInterview.application_id) : demo ? interviews[0] : undefined;
  const interviewDate = scheduledInterview ? new Date(scheduledInterview.scheduled_at) : demo ? new Date(2026, 8, 14, 10, 30) : new Date();
  const weeklyGoal = dashboard.activeGoals.find(goal => goal.period === 'WEEKLY');
  const goal = weeklyGoal || (demo ? { title: 'Weekly goal', target: 10, current_value: 8 } : null);
  const goalProgress = goal ? Math.min(1, goal.current_value / goal.target) : 0;
  const todayLabel = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeIn>
        <View style={styles.topbar}>
          <View>
            <Text style={[typography.bodyMedium, { color: theme.textSecondary }]}>{todayLabel}</Text>
            <Text style={[typography.screenTitle, { color: theme.textPrimary, marginTop: 4 }]}>Good morning, {firstName}</Text>
          </View>
          <IconButton name="notifications-outline" label="Notifications" onPress={onNotifications} />
        </View>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>Let’s move your career forward.</Text>
      </FadeIn>

      <FadeIn delay={60} style={[styles.overview, { backgroundColor: theme.textPrimary }]}>
        <View style={styles.overviewHeader}>
          <View>
            <Text style={[typography.label, { color: theme.dark ? '#9CA3AF' : '#C2C5CD' }]}>JOB SEARCH PROGRESS</Text>
            <Text style={[typography.sectionTitle, { color: theme.background, marginTop: 5 }]}>{applications.length ? 'Your search is moving' : 'Your search starts here'}</Text>
          </View>
          <View style={[styles.upBadge, { backgroundColor: theme.dark ? '#21462F' : '#29352F' }]}>
            <Ionicons name="trending-up" size={14} color="#58D27A" />
            <Text style={styles.upText}>{demo ? '18%' : 'LIVE'}</Text>
          </View>
        </View>
        <View style={styles.metrics}>
          {[[String(applications.length), 'Applications'], [String(interviews.length), 'Interviews'], [String(offers.length), offers.length === 1 ? 'Offer' : 'Offers']].map(([value, label], i) => (
            <View key={label} style={[styles.metric, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.dark ? '#343A47' : '#34363C' }]}>
              <Text style={[styles.metricValue, { color: theme.background }]}>{value}</Text>
              <Text style={[typography.caption, { color: theme.dark ? '#9CA3AF' : '#C2C5CD' }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.goalLabel}><Text style={[typography.caption, { color: theme.dark ? '#B6BAC3' : '#D2D4DA' }]}>{goal?.title || 'No active goal'}</Text><Text style={[typography.caption, { color: theme.background, fontWeight: '600' }]}>{goal ? `${goal.current_value} / ${goal.target}` : '—'}</Text></View>
        <ProgressBar value={goalProgress * 100} color={theme.primary} height={6} />
      </FadeIn>

      <FadeIn delay={120}>
        <SectionHeader title="Application pipeline" action="View board" onAction={onApplications} />
        <View style={[styles.pipeline, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.pipelineBars}>
            {pipeline.map(item => <View key={item.label} style={[styles.pipelineBar, { backgroundColor: theme[item.colorToken] as string, flex: Math.max(item.count, 2) }]} />)}
          </View>
          <View style={styles.pipelineLabels}>
            {pipeline.map(item => (
              <View key={item.label} style={[styles.pipelineCell, compact && { minWidth: 54 }]}>
                <Text style={[styles.pipelineValue, { color: theme.textPrimary }]}>{item.count}</Text>
                <Text numberOfLines={1} style={[styles.pipelineName, { color: theme.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </FadeIn>

      {upcoming && <FadeIn delay={160}>
        <SectionHeader title="Upcoming interview" />
        <Pressable onPress={() => onApplication(upcoming.id)} style={({ pressed }) => [styles.interview, { backgroundColor: theme.warningMuted, borderColor: theme.dark ? '#62471D' : '#F8D99D', opacity: pressed ? 0.8 : 1 }]}>
          <View style={[styles.dateTile, { backgroundColor: theme.surface }]}>
            <Text style={[typography.label, { color: theme.warning }]}>{interviewDate.toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
            <Text style={[styles.dateNumber, { color: theme.textPrimary }]}>{interviewDate.getDate()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{upcoming.title} interview</Text>
            <Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 2 }]}>{upcoming.company} · {interviewDate.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</Text>
            <View style={styles.interviewMeta}><Ionicons name="videocam-outline" size={14} color={theme.warning} /><Text style={[typography.caption, { color: theme.warning }]}>{scheduledInterview?.meeting_link ? 'Video interview' : 'Interview'} · {scheduledInterview?.duration_minutes || 45} min</Text></View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.warning} />
        </Pressable>
      </FadeIn>}

      <FadeIn delay={200}>
        <SectionHeader title="Recent applications" action="See all" onAction={onApplications} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.xl }}>
          {applications.slice(0, 3).map(item => <AppCard key={item.id} item={item} compact onPress={() => onApplication(item.id)} />)}
        </ScrollView>
      </FadeIn>

      <FadeIn delay={240}>
        <Pressable onPress={onProductivity} style={[styles.weekly, { borderColor: theme.border }]}> 
          <View style={[styles.weeklyIcon, { backgroundColor: theme.primaryMuted }]}><Ionicons name="flag-outline" size={20} color={theme.primary} /></View>
          <View style={{ flex: 1 }}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{goal?.title || 'Weekly goal'}</Text><Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>{goal ? `${Math.max(goal.target - goal.current_value, 0)} remaining to hit your goal` : 'Create a weekly goal to track your progress'}</Text></View>
          <Text style={[typography.cardTitle, { color: theme.primary }]}>{goal ? `${goal.current_value}/${goal.target}` : '—'}</Text>
        </Pressable>
      </FadeIn>
      <FadeIn delay={260}>
        <SectionHeader title="Recommended next actions" />
        <View style={[styles.actionsList, { borderColor: theme.border }]}>
          {(dashboard.nextTasks.length ? dashboard.nextTasks.slice(0, 3).map(task => ({ id: task.id, title: task.title, detail: task.deadline ? new Date(task.deadline).toLocaleDateString() : task.priority })) : demo ? [
            { id: 'demo-followup', title: 'Follow up with Arc', detail: 'Due today' },
            { id: 'demo-portfolio', title: 'Prepare Linear case study', detail: 'Before Monday' },
          ] : [{ id: 'empty-actions', title: 'No next actions yet', detail: 'Add a task to plan your next move' }]).map((action, index, values) => <Pressable onPress={onProductivity} key={action.id} style={[styles.actionItem, index < values.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}><View style={[styles.actionCheck, { borderColor: theme.border }]} /><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{action.title}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{action.detail}</Text></View><Ionicons name="chevron-forward" size={17} color={theme.textSecondary} /></Pressable>)}
        </View>
      </FadeIn>
      <Pressable onPress={onAdd} style={[styles.fab, { backgroundColor: theme.primary }]}><Ionicons name="add" size={26} color="#fff" /></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 124, gap: spacing.xxl },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  overview: { borderRadius: radius.xl, padding: spacing.lg, shadowColor: '#101217', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  upBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 27, borderRadius: radius.pill },
  upText: { color: '#58D27A', fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', marginTop: spacing.xl, marginBottom: spacing.lg },
  metric: { flex: 1, paddingLeft: spacing.md },
  metricValue: { fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4 },
  goalLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  pipeline: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  pipelineBars: { flexDirection: 'row', gap: 3, height: 7, borderRadius: radius.pill, overflow: 'hidden', marginBottom: spacing.lg },
  pipelineBar: { height: 7 },
  pipelineLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  pipelineCell: { alignItems: 'center', flex: 1 },
  pipelineValue: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  pipelineName: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  interview: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateTile: { width: 50, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dateNumber: { fontSize: 21, lineHeight: 24, fontWeight: '700' },
  interviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  weekly: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weeklyIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  fab: { width: 52, height: 52, borderRadius: 18, position: 'absolute', right: spacing.lg, bottom: 96, alignItems: 'center', justifyContent: 'center', shadowColor: '#5B5FEF', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7 },
  actionsList: { borderTopWidth: 1, borderBottomWidth: 1 }, actionItem: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, actionCheck: { width: 20, height: 20, borderRadius: 7, borderWidth: 1.5 },
});
