import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APPLICATION_STATUS_OPTIONS } from '../applicationStatuses';
import { FadeIn, ProgressBar, SectionHeader } from '../components';
import { useTheme } from '../context';
import type { Application } from '../types/domain';
import { radius, spacing, typography } from '../theme';

export function AnalyticsScreen({ applications }: { applications: Application[] }) {
  const theme = useTheme();
  const now = new Date();
  const monthlyCounts = Array.from({ length: 12 }, (_, offset) => {
    const target = new Date(now.getFullYear(), now.getMonth() - 11 + offset, 1);
    return applications.filter(item => { const date = item.applicationDate ? new Date(item.applicationDate) : now; return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear(); }).length;
  });
  const largestMonth = Math.max(...monthlyCounts, 1);
  const bars = monthlyCounts.map(value => Math.max(6, (value / largestMonth) * 100));
  const interviewCount = applications.filter(item => ['Interview', 'Offer'].includes(item.status)).length;
  const interviewRate = applications.length ? Math.round((interviewCount / applications.length) * 100) : 0;
  const statusCounts = APPLICATION_STATUS_OPTIONS.map(status => ({ ...status, count: applications.filter(item => item.status === status.label).length }));
  const sourceCounts = [...applications.reduce((result, item) => result.set(item.source || 'Direct', (result.get(item.source || 'Direct') || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeIn><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>Analytics</Text><Text style={[typography.body, { color: theme.textSecondary, marginTop: 3 }]}>A clear view of what’s working.</Text></FadeIn>
      <FadeIn delay={60} style={[styles.mainMetric, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View><Text style={[typography.label, { color: theme.textSecondary }]}>INTERVIEW RATE</Text><View style={styles.rateRow}><Text style={[styles.rate, { color: theme.textPrimary }]}>{interviewRate}%</Text><View style={[styles.growth, { backgroundColor: theme.successMuted }]}><Ionicons name="analytics-outline" size={13} color={theme.success} /><Text style={[typography.caption, { color: theme.success, fontWeight: '600' }]}>Live pipeline</Text></View></View><Text style={[typography.body, { color: theme.textSecondary }]}>{interviewCount} applications reached an interview or offer.</Text></View>
        <View style={[styles.rateIcon, { backgroundColor: theme.primaryMuted }]}><Ionicons name="trending-up-outline" size={26} color={theme.primary} /></View>
      </FadeIn>
      <FadeIn delay={110}>
        <SectionHeader title="Applications trend" action="Last 12 weeks" />
        <View style={[styles.chart, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.chartHeader}><View><Text style={[styles.chartTotal, { color: theme.textPrimary }]}>{applications.length}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Total applications</Text></View><View style={styles.legend}><View style={[styles.legendDot, { backgroundColor: theme.primary }]} /><Text style={[typography.caption, { color: theme.textSecondary }]}>Applications</Text></View></View>
          <View style={styles.bars}>{bars.map((height, index) => <View key={index} style={styles.barCell}><View style={[styles.bar, { height: `${height}%`, backgroundColor: index === bars.length - 2 ? theme.primary : theme.primaryMuted }]} /></View>)}</View>
          <View style={styles.axis}><Text style={[typography.caption, { color: theme.textSecondary }]}>Jun</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Jul</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Aug</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Sep</Text></View>
        </View>
      </FadeIn>
      <FadeIn delay={150}>
        <SectionHeader title="Status distribution" />
        <View style={styles.statusLayout}>
          <View style={[styles.donut, { borderColor: theme.surfaceSecondary }]}><View style={[styles.donutAccent, { borderTopColor: theme.primary, borderRightColor: theme.info, borderBottomColor: theme.warning }]}><Text style={[styles.donutValue, { color: theme.textPrimary }]}>{applications.length}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>TOTAL</Text></View></View>
          <View style={styles.statusLegend}>{statusCounts.map(status => <View key={status.value} style={styles.statusRow}><View style={[styles.legendDot, { backgroundColor: theme[status.colorToken] as string }]} /><Text style={[typography.bodyMedium, { color: theme.textSecondary, flex: 1 }]}>{status.label}</Text><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{status.count}</Text></View>)}</View>
        </View>
      </FadeIn>
      <FadeIn delay={190}>
        <SectionHeader title="Source performance" />
        <View style={{ gap: spacing.md }}>{sourceCounts.length ? sourceCounts.map(([name, count]) => <View key={name}><View style={styles.sourceTop}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{name}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{count} {count === 1 ? 'application' : 'applications'}</Text></View><ProgressBar value={(count / Math.max(applications.length, 1)) * 100} /></View>) : <Text style={[typography.body, { color: theme.textSecondary }]}>Source performance will appear after you add applications.</Text>}</View>
      </FadeIn>
      <FadeIn delay={230} style={[styles.insight, { backgroundColor: theme.primaryMuted }]}><View style={[styles.insightIcon, { backgroundColor: theme.primary }]}><Ionicons name="sparkles" size={16} color="#fff" /></View><View style={{ flex: 1 }}><Text style={[typography.label, { color: theme.primary }]}>AI INSIGHT</Text><Text style={[typography.body, { color: theme.textPrimary, marginTop: 5 }]}>{sourceCounts[0] ? `${sourceCounts[0][0]} is currently your strongest application source with ${sourceCounts[0][1]} tracked opportunities.` : 'Add application sources to unlock personalized performance insights.'}</Text></View></FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.xxl },
  mainMetric: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs }, rate: { fontSize: 42, lineHeight: 49, fontWeight: '700', letterSpacing: -1.4 },
  growth: { height: 28, paddingHorizontal: 9, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 3 }, rateIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chart: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md }, chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, chartTotal: { fontSize: 24, lineHeight: 29, fontWeight: '700' }, legend: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 7, height: 7, borderRadius: 4 },
  bars: { height: 145, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: spacing.lg }, barCell: { flex: 1, height: '100%', justifyContent: 'flex-end' }, bar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 }, axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  statusLayout: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxl }, donut: { width: 128, height: 128, borderRadius: 64, borderWidth: 13, padding: 5 }, donutAccent: { flex: 1, borderRadius: 52, borderWidth: 7, borderLeftColor: 'transparent', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-25deg' }] }, donutValue: { fontSize: 27, fontWeight: '700', transform: [{ rotate: '25deg' }] }, statusLegend: { flex: 1, gap: spacing.sm }, statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }, insight: { borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm }, insightIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
