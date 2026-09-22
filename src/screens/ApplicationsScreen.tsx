import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APPLICATION_STATUS_OPTIONS } from '../applicationStatuses';
import { AppCard, FadeIn, IconButton, StatusBadge } from '../components';
import { useTheme } from '../context';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Application, ApplicationStatus, DisplayStatus } from '../types/domain';
import { radius, spacing, typography } from '../theme';

type ApplicationFilter = 'All' | DisplayStatus;
const filters: ApplicationFilter[] = ['All', ...APPLICATION_STATUS_OPTIONS.map(option => option.label)];

export function ApplicationsScreen({ applications, loading, error, onApplication, onAdd, onRetry, onStatusChange }: { applications: Application[]; loading: boolean; error: string | null; onApplication: (id: string) => void; onAdd: () => void; onRetry: () => void; onStatusChange: (id: string, status: ApplicationStatus) => void }) {
  const theme = useTheme();
  const [view, setView] = useState<'list' | 'board'>('list');
  const [filter, setFilter] = useState<ApplicationFilter>('All');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [priority, setPriority] = useState('All');
  const [mode, setMode] = useState('All');
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState<'newest' | 'company'>('newest');
  const debouncedQuery = useDebouncedValue(query);
  const shown = useMemo(() => applications.filter(a => {
    const appliedAt = a.applicationDate ? new Date(a.applicationDate).getTime() : Date.now();
    return (filter === 'All' || a.status === filter) && (priority === 'All' || a.priority === priority) && (mode === 'All' || a.mode === mode) && (!salaryOnly || Boolean(a.salary)) && (!recentOnly || Date.now() - appliedAt <= 30 * 86_400_000) && `${a.company} ${a.title} ${a.location} ${a.recruiterName || ''}`.toLowerCase().includes(debouncedQuery.toLowerCase());
  }).sort((a, b) => sort === 'company' ? a.company.localeCompare(b.company) : 0), [applications, filter, priority, mode, salaryOnly, recentOnly, sort, debouncedQuery]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FadeIn>
          <View style={styles.header}><View><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>Applications</Text><Text style={[typography.body, { color: theme.textSecondary, marginTop: 3 }]}>{applications.length} {applications.length === 1 ? 'opportunity' : 'opportunities'} in your pipeline</Text></View><IconButton name="add" label="Add application" onPress={onAdd} /></View>
          <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="search-outline" size={19} color={theme.textSecondary} /><TextInput value={query} onChangeText={setQuery} placeholder="Company, role, location or recruiter" placeholderTextColor={theme.textSecondary} style={[styles.searchInput, { color: theme.textPrimary }]} /><Pressable onPress={() => setAdvancedOpen(value => !value)} style={[styles.shortcut, { backgroundColor: advancedOpen ? theme.primaryMuted : theme.surfaceSecondary }]}><Ionicons name="options-outline" size={15} color={advancedOpen ? theme.primary : theme.textSecondary} /></Pressable></View>
          {advancedOpen && <View style={[styles.advanced, { backgroundColor: theme.surface, borderColor: theme.border }]}><FilterLine label="Priority" values={['All', 'High', 'Medium', 'Low']} selected={priority} onSelect={setPriority} /><FilterLine label="Work mode" values={['All', 'Remote', 'Hybrid', 'On-site']} selected={mode} onSelect={setMode} /><View style={styles.quickFilters}><Pressable onPress={() => setSalaryOnly(value => !value)} style={[styles.quickFilter, { backgroundColor: salaryOnly ? theme.primaryMuted : theme.surfaceSecondary }]}><Ionicons name="cash-outline" size={15} color={salaryOnly ? theme.primary : theme.textSecondary} /><Text style={[typography.caption, { color: salaryOnly ? theme.primary : theme.textSecondary }]}>Salary listed</Text></Pressable><Pressable onPress={() => setRecentOnly(value => !value)} style={[styles.quickFilter, { backgroundColor: recentOnly ? theme.primaryMuted : theme.surfaceSecondary }]}><Ionicons name="calendar-outline" size={15} color={recentOnly ? theme.primary : theme.textSecondary} /><Text style={[typography.caption, { color: recentOnly ? theme.primary : theme.textSecondary }]}>Last 30 days</Text></Pressable></View></View>}
          <View style={styles.controlRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: filter === item ? theme.textPrimary : theme.surface, borderColor: filter === item ? theme.textPrimary : theme.border }]}><Text style={[typography.bodyMedium, { color: filter === item ? theme.background : theme.textSecondary }]}>{item}</Text></Pressable>)}
            </ScrollView>
            <View style={[styles.viewToggle, { backgroundColor: theme.surfaceSecondary }]}>{(['list', 'board'] as const).map(item => <Pressable key={item} onPress={() => setView(item)} style={[styles.toggleButton, view === item && { backgroundColor: theme.surface }]}><Ionicons name={item === 'list' ? 'list' : 'albums-outline'} size={18} color={view === item ? theme.primary : theme.textSecondary} /></Pressable>)}</View>
          </View>
        </FadeIn>

        {error ? <Pressable onPress={onRetry} style={[styles.errorState, { backgroundColor: theme.dangerMuted }]}><Ionicons name="cloud-offline-outline" size={20} color={theme.danger} /><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.danger }]}>Applications could not be refreshed</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Tap to try again.</Text></View></Pressable> : null}
        {loading ? <LoadingCards /> : view === 'list' ? (
          <FadeIn delay={80}>
            <View style={styles.resultsTitle}><Text style={[typography.label, { color: theme.textSecondary }]}>{shown.length} RESULTS</Text><Pressable onPress={() => setSort(value => value === 'newest' ? 'company' : 'newest')}><Text style={[typography.caption, { color: theme.textSecondary }]}>{sort === 'newest' ? 'Newest first' : 'Company A–Z'}</Text></Pressable></View>
            {shown.map(item => <AppCard key={item.id} item={item} onPress={() => onApplication(item.id)} />)}
            {shown.length === 0 && <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}><Ionicons name="briefcase-outline" size={28} color={theme.primary} /></View><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>No applications found</Text><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>Try another search or add a new opportunity to your pipeline.</Text></View>}
          </FadeIn>
        ) : <Kanban applications={shown} onApplication={onApplication} onStatusChange={onStatusChange} />}
      </ScrollView>
    </View>
  );
}

function Kanban({ applications, onApplication, onStatusChange }: { applications: Application[]; onApplication: (id: string) => void; onStatusChange: (id: string, status: ApplicationStatus) => void }) {
  const theme = useTheme();
  const byStatus = (status: string) => applications.filter(item => item.status === status);
  const pipeline = APPLICATION_STATUS_OPTIONS;
  return (
    <FadeIn delay={80}>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.md }]}>Swipe horizontally to explore your pipeline.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
        {pipeline.map(stage => (
          <View key={stage.label} style={[styles.column, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <View style={styles.columnHeader}><StatusBadge status={stage.label} /><Text style={[typography.label, { color: theme.textSecondary }]}>{byStatus(stage.label).length}</Text></View>
            {byStatus(stage.label).map(item => <MiniCard key={item.id} item={item} onPress={() => onApplication(item.id)} onAdvance={stage.nextValue ? () => onStatusChange(item.id, stage.nextValue) : undefined} />)}
            {byStatus(stage.label).length === 0 && <View style={[styles.dropZone, { borderColor: theme.border }]}><Text style={[typography.caption, { color: theme.textSecondary }]}>No applications</Text></View>}
          </View>
        ))}
      </ScrollView>
    </FadeIn>
  );
}

function MiniCard({ item, onPress, onAdvance }: { item: Application; onPress: () => void; onAdvance?: () => void }) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.miniCard, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 }]}><View style={styles.miniTop}><View style={[styles.miniLogo, { backgroundColor: item.logoColor }]}><Text style={styles.miniLogoText}>{item.initials}</Text></View><Ionicons name="ellipsis-horizontal" size={17} color={theme.textSecondary} /></View><Text numberOfLines={2} style={[typography.cardTitle, { color: theme.textPrimary, marginTop: spacing.sm }]}>{item.title}</Text><Text style={[typography.caption, { color: theme.textSecondary, marginTop: 3 }]}>{item.company}</Text><View style={[styles.miniFooter, { borderTopColor: theme.border }]}><Text style={[typography.caption, { color: theme.textSecondary }]}>{item.age}</Text>{onAdvance && <Pressable accessibilityLabel="Move to next stage" onPress={event => { event.stopPropagation(); onAdvance(); }} hitSlop={8} style={styles.advance}><Ionicons name="arrow-forward" size={14} color={theme.primary} /></Pressable>}</View></Pressable>;
}

function LoadingCards() { const theme = useTheme(); return <View>{[0, 1, 2].map(item => <View key={item} style={[styles.loadingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.loadingLogo, { backgroundColor: theme.surfaceSecondary }]} /><View style={{ flex: 1, gap: spacing.xs }}><View style={[styles.loadingLine, { backgroundColor: theme.surfaceSecondary, width: '72%' }]} /><View style={[styles.loadingLine, { backgroundColor: theme.surfaceSecondary, width: '45%' }]} /></View></View>)}</View>; }
function FilterLine({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) { const theme = useTheme(); return <View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>{label.toUpperCase()}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>{values.map(value => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.miniFilter, { borderColor: selected === value ? theme.primary : theme.border, backgroundColor: selected === value ? theme.primaryMuted : theme.surface }]}><Text style={[typography.caption, { color: selected === value ? theme.primary : theme.textSecondary }]}>{value}</Text></Pressable>)}</ScrollView></View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { height: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  searchInput: { flex: 1, height: '100%', fontSize: 15 },
  shortcut: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  controlRow: { flexDirection: 'row', marginVertical: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  filters: { gap: spacing.xs, paddingRight: spacing.xs },
  filter: { height: 36, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  viewToggle: { flexDirection: 'row', borderRadius: radius.sm, padding: 3 },
  toggleButton: { width: 32, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultsTitle: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl, gap: spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  column: { width: 254, minHeight: 450, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, marginRight: spacing.sm },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xxs, marginBottom: spacing.sm },
  miniCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  miniTop: { flexDirection: 'row', justifyContent: 'space-between' },
  miniLogo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniLogoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  miniFooter: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  dropZone: { height: 80, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  advance: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  errorState: { borderRadius: radius.md, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  loadingCard: { height: 116, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  loadingLogo: { width: 46, height: 46, borderRadius: 13 }, loadingLine: { height: 13, borderRadius: 7 },
  advanced: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, marginTop: spacing.sm }, miniFilter: { height: 32, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' }, quickFilters: { flexDirection: 'row', gap: spacing.xs }, quickFilter: { height: 34, borderRadius: radius.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5 },
});
