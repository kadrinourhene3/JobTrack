import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FadeIn, PrimaryButton, ProgressBar, SectionHeader, type ToastType } from '../components';
import { useTheme } from '../context';
import { friendlyError } from '../lib/errors';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  AIService,
  getJobMatchHistory,
  getResumeAnalysisHistory,
  type JobMatchRecord,
  type ResumeAnalysisRecord,
} from '../services/aiService';
import { abandonSession, addMessage, createSession, type AIInterviewSession } from '../services/aiInterviewService';
import { getCoverLetters, saveCoverLetter, type CoverLetterRecord } from '../services/coverLetterService';
import { getResumeDocuments, pickAndUploadDocument, type StoredDocument } from '../services/documentService';
import { useAuthStore } from '../stores/authStore';
import { radius, spacing, typography } from '../theme';
import type { Application, InterviewFeedbackResult, JobMatchResult, ResumeAnalysisResult, TailoredResumeResult } from '../types/domain';
import { prepareNextQuestion } from '../utils/interviewCoachState';

type Tool = 'home' | 'resume' | 'match' | 'cover' | 'coach';
type Toast = (message: string, type?: ToastType) => void;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !error.message.startsWith('SUPABASE_')) return error.message;
  return friendlyError(error, fallback);
}

export function AICareerScreen({ applications, onToast }: { applications: Application[]; onToast: Toast }) {
  const theme = useTheme();
  const authStatus = useAuthStore(state => state.status);
  const [tool, setTool] = useState<Tool>('home');
  const [resumes, setResumes] = useState<StoredDocument[]>([]);
  const [resumeHistory, setResumeHistory] = useState<ResumeAnalysisRecord[]>([]);
  const [matchHistory, setMatchHistory] = useState<JobMatchRecord[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterRecord[]>([]);
  const [contextError, setContextError] = useState('');

  const refreshContext = useCallback(async () => {
    if (authStatus !== 'authenticated' || !isSupabaseConfigured) return;
    try {
      const [nextResumes, nextResumeHistory, nextMatchHistory, nextLetters] = await Promise.all([
        getResumeDocuments(), getResumeAnalysisHistory(), getJobMatchHistory(), getCoverLetters(),
      ]);
      setResumes(nextResumes);
      setResumeHistory(nextResumeHistory);
      setMatchHistory(nextMatchHistory);
      setCoverLetters(nextLetters);
      setContextError('');
    } catch (error) {
      setContextError(errorMessage(error, 'Your saved AI data could not be loaded.'));
    }
  }, [authStatus]);

  useEffect(() => { void refreshContext(); }, [refreshContext]);

  const addResume = (document: StoredDocument) => setResumes(current => [document, ...current.filter(item => item.id !== document.id)]);
  const tools = [
    { title: 'Resume Analyzer', copy: 'Get an ATS-ready score and clear improvements.', icon: 'document-text-outline', tone: theme.primary, bg: theme.primaryMuted, action: () => setTool('resume') },
    { title: 'Job Match', copy: 'See how your experience maps to a selected role.', icon: 'git-compare-outline', tone: theme.success, bg: theme.successMuted, action: () => setTool('match') },
    { title: 'Cover Letter', copy: 'Create a tailored, authentic first draft.', icon: 'create-outline', tone: theme.warning, bg: theme.warningMuted, action: () => setTool('cover') },
    { title: 'Interview Coach', copy: 'Practice for a selected role and get feedback.', icon: 'chatbubbles-outline', tone: theme.info, bg: theme.infoMuted, action: () => setTool('coach') },
  ] as const;

  if (tool === 'resume') return <ResumeAnalyzer resumes={resumes} history={resumeHistory} onResumeAdded={addResume} onRefresh={refreshContext} onBack={() => setTool('home')} onToast={onToast} />;
  if (tool === 'match') return <JobMatch applications={applications} resumes={resumes} history={matchHistory} analyzedDocumentIds={new Set(resumeHistory.map(item => item.documentId))} onResumeAdded={addResume} onRefresh={refreshContext} onBack={() => setTool('home')} onToast={onToast} />;
  if (tool === 'cover') return <CoverLetter applications={applications} resumes={resumes} history={coverLetters} onResumeAdded={addResume} onRefresh={refreshContext} onBack={() => setTool('home')} onToast={onToast} />;
  if (tool === 'coach') return <Coach applications={applications} onBack={() => setTool('home')} onToast={onToast} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeIn>
        <View style={[styles.sparkle, { backgroundColor: theme.primaryMuted }]}><Ionicons name="sparkles" size={20} color={theme.primary} /></View>
        <Text style={[typography.screenTitle, { color: theme.textPrimary, marginTop: spacing.md }]}>AI Career Assistant</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs, maxWidth: 350 }]}>Improve your applications using your saved profile, resumes, and opportunities.</Text>
      </FadeIn>
      {contextError ? <InlineError message={contextError} onRetry={refreshContext} /> : null}
      <FadeIn delay={80} style={{ gap: spacing.sm }}>
        {tools.map(item => <Pressable key={item.title} onPress={item.action} style={({ pressed }) => [styles.tool, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}><View style={[styles.toolIcon, { backgroundColor: item.bg }]}><Ionicons name={item.icon} size={23} color={item.tone} /></View><View style={{ flex: 1 }}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text><Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 3 }]}>{item.copy}</Text></View><Ionicons name="arrow-forward" size={20} color={theme.textSecondary} /></Pressable>)}
      </FadeIn>
      {authStatus === 'demo' ? <View style={[styles.notice, { backgroundColor: theme.infoMuted }]}><Ionicons name="information-circle-outline" size={20} color={theme.info} /><Text style={[typography.bodyMedium, { color: theme.textSecondary, flex: 1 }]}>AI testing uses the authenticated Edge Function. Sign in to a Supabase-backed account to run the server-side mock provider.</Text></View> : null}
      {authStatus === 'authenticated' ? <FadeIn delay={140}><SectionHeader title="Saved AI activity" /><View style={[styles.activity, { borderTopColor: theme.border }]}><View style={[styles.activityIcon, { backgroundColor: theme.successMuted }]}><Ionicons name="checkmark" size={18} color={theme.success} /></View><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{resumeHistory.length + matchHistory.length + coverLetters.length} saved results</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{resumes.length} uploaded {resumes.length === 1 ? 'resume' : 'resumes'}</Text></View></View></FadeIn> : null}
    </ScrollView>
  );
}

function ResumeAnalyzer({ resumes, history, onResumeAdded, onRefresh, onBack, onToast }: { resumes: StoredDocument[]; history: ResumeAnalysisRecord[]; onResumeAdded: (document: StoredDocument) => void; onRefresh: () => Promise<void>; onBack: () => void; onToast: Toast }) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [historical, setHistorical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = resumes.find(item => item.id === selectedId);

  const upload = async () => {
    if (!isSupabaseConfigured) return onToast('Connect Supabase and sign in before uploading a resume', 'error');
    setBusy(true); setError('');
    try {
      const document = await pickAndUploadDocument('RESUME');
      if (document) { onResumeAdded(document); setSelectedId(document.id); onToast('Resume uploaded'); }
    } catch (uploadError) {
      const message = errorMessage(uploadError, 'Resume upload failed.'); setError(message); onToast(message, 'error');
    } finally { setBusy(false); }
  };

  const analyze = async () => {
    if (!selectedId || busy) return;
    setBusy(true); setError(''); setResult(null); setHistorical(false);
    try {
      const next = await AIService.analyzeResume({ documentId: selectedId });
      setResult(next); await onRefresh(); onToast('Resume analysis completed');
    } catch (analysisError) {
      const message = errorMessage(analysisError, 'Resume analysis is temporarily unavailable.'); setError(message); onToast(message, 'error');
    } finally { setBusy(false); }
  };

  if (result || busy) return <ResumeResult result={result} documentName={selected?.name} historical={historical} busy={busy} onBack={() => { if (busy) return; setResult(null); }} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <ToolHeader title="Resume analysis" onBack={onBack} />
      <Intro title="Analyze a resume" copy="Choose an existing resume or upload a new CV. Your result will be saved to your account." />
      <ResumePicker resumes={resumes} selectedId={selectedId} onSelect={id => { setSelectedId(id); setError(''); }} onUpload={upload} busy={busy} />
      {error ? <InlineError message={error} onRetry={selectedId ? analyze : upload} /> : null}
      <PrimaryButton title="Analyze resume" icon="sparkles" disabled={!selectedId || busy} onPress={analyze} />
      {history.length ? <View><SectionHeader title="Previous analyses" />{history.slice(0, 5).map(item => <HistoryRow key={item.id} title={resumes.find(document => document.id === item.documentId)?.name || 'Saved resume analysis'} detail={`${item.overallScore}% · ${new Date(item.createdAt).toLocaleDateString()}`} onPress={() => { setSelectedId(item.documentId); setHistorical(true); setResult(item); }} />)}</View> : null}
    </ScrollView>
  );
}

function ResumeResult({ result, documentName, historical, busy, onBack }: { result: ResumeAnalysisResult | null; documentName?: string; historical: boolean; busy: boolean; onBack: () => void }) {
  const theme = useTheme();
  const metrics = result ? [['Impact', result.impact], ['ATS compatibility', result.atsCompatibility], ['Keywords', result.keywords], ['Readability', result.readability]] as const : [];
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><ToolHeader title="Resume analysis" onBack={onBack} />{busy || !result ? <LoadingState icon="document-text-outline" title="Analyzing your resume…" copy="Reviewing impact, keywords, readability, and ATS compatibility." /> : <><FadeIn><View style={styles.scoreSection}><Text style={[typography.label, { color: theme.textSecondary }]}>{historical ? 'PREVIOUS RESUME SCORE' : 'RESUME SCORE'}</Text><ScoreRing value={result.overallScore} label={result.overallScore >= 80 ? 'Excellent' : result.overallScore >= 65 ? 'Good' : 'Needs work'} /><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', maxWidth: 320 }]}>{documentName || 'Selected resume'} · Analysis based on your authenticated career context.</Text></View></FadeIn><MetricsCard metrics={metrics} /><InsightSection icon="checkmark-circle-outline" title="Strengths" tone={theme.success} bg={theme.successMuted} items={result.strengths} /><InsightSection icon="arrow-up-circle-outline" title="Areas to improve" tone={theme.warning} bg={theme.warningMuted} items={result.weaknesses} /><InsightSection icon="key-outline" title="Missing keywords" tone={theme.primary} bg={theme.primaryMuted} chips={result.missingKeywords} /><InsightSection icon="bulb-outline" title="Recommendations" tone={theme.info} bg={theme.infoMuted} items={result.recommendations} /></>}</ScrollView>;
}

function JobMatch({ applications, resumes, history, analyzedDocumentIds, onResumeAdded, onRefresh, onBack, onToast }: { applications: Application[]; resumes: StoredDocument[]; history: JobMatchRecord[]; analyzedDocumentIds: Set<string>; onResumeAdded: (document: StoredDocument) => void; onRefresh: () => Promise<void>; onBack: () => void; onToast: Toast }) {
  const theme = useTheme();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [historical, setHistorical] = useState(false);
  const [tailored, setTailored] = useState<TailoredResumeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState('');
  const application = applications.find(item => item.id === applicationId);

  const upload = async () => {
    if (!isSupabaseConfigured) return onToast('Connect Supabase and sign in before uploading a resume', 'error');
    setBusy(true); setError('');
    try { const document = await pickAndUploadDocument('RESUME'); if (document) { onResumeAdded(document); setDocumentId(document.id); onToast('Resume uploaded'); } }
    catch (uploadError) { const message = errorMessage(uploadError, 'Resume upload failed.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const analyze = async () => {
    if (!applicationId || !documentId || busy) return;
    setBusy(true); setError(''); setResult(null); setTailored(null); setHistorical(false);
    try { const next = await AIService.matchJob({ applicationId, documentId }); setResult(next); await onRefresh(); onToast('Job match analysis completed'); }
    catch (matchError) { const message = errorMessage(matchError, 'Job match is temporarily unavailable.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const tailor = async () => {
    if (!applicationId || !documentId || !result || tailoring) return;
    setTailoring(true); setError(''); setTailored(null);
    try { setTailored(await AIService.tailorResume({ applicationId, documentId, jobMatch: result })); onToast('Resume tailoring recommendations are ready'); }
    catch (tailorError) { const message = errorMessage(tailorError, 'Resume tailoring is temporarily unavailable.'); setError(message); onToast(message, 'error'); }
    finally { setTailoring(false); }
  };

  if (busy) return <ScrollView contentContainerStyle={styles.content}><ToolHeader title="Job match" onBack={onBack} /><LoadingState icon="git-compare-outline" title="Calculating your match…" copy="Comparing the selected resume with the selected application." /></ScrollView>;
  if (result && application) return <MatchResult result={result} application={application} historical={historical} tailored={tailored} tailoring={tailoring} error={error} onBack={() => { setResult(null); setTailored(null); setError(''); }} onTailor={tailor} />;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <ToolHeader title="Job match" onBack={onBack} />
      <Intro title="Compare your resume" copy="Select the exact application and resume you want to analyze." />
      <ApplicationPicker applications={applications} selectedId={applicationId} onSelect={id => { setApplicationId(id); setError(''); }} />
      <ResumePicker resumes={resumes} selectedId={documentId} onSelect={id => { setDocumentId(id); setError(''); }} onUpload={upload} busy={busy} analysisDocumentIds={analyzedDocumentIds} />
      {error ? <InlineError message={error} onRetry={applicationId && documentId ? analyze : undefined} /> : null}
      <PrimaryButton title="Start analysis" icon="sparkles" disabled={!applicationId || !documentId || busy} onPress={analyze} />
      {history.length ? <View><SectionHeader title="Previous matches" />{history.slice(0, 5).map(item => { const app = applications.find(candidate => candidate.id === item.applicationId); return <HistoryRow key={item.id} title={app ? `${app.title} at ${app.company}` : 'Historical job match'} detail={`${item.overallMatch}% · ${new Date(item.createdAt).toLocaleDateString()}`} onPress={app && item.documentId ? () => { setApplicationId(app.id); setDocumentId(item.documentId); setHistorical(true); setResult(item); } : undefined} />; })}</View> : null}
    </ScrollView>
  );
}

function MatchResult({ result, application, historical, tailored, tailoring, error, onBack, onTailor }: { result: JobMatchResult; application: Application; historical: boolean; tailored: TailoredResumeResult | null; tailoring: boolean; error: string; onBack: () => void; onTailor: () => void }) {
  const theme = useTheme();
  const categories = [['Skills', result.skillsMatch], ['Experience', result.experienceMatch], ['Education', result.educationMatch], ['Keywords', result.keywordsMatch]] as const;
  const rating = result.overallMatch >= 80 ? 'Strong match' : result.overallMatch >= 60 ? 'Good foundation' : 'Needs tailoring';
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><ToolHeader title="Job match" onBack={onBack} /><FadeIn><View style={[styles.matchHero, { backgroundColor: theme.primaryMuted }]}>{historical ? <Text style={[typography.label, { color: theme.textSecondary }]}>HISTORICAL RESULT</Text> : null}<Text style={[styles.matchValue, { color: theme.primary }]}>{result.overallMatch}%</Text><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{rating}</Text><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>{application.title} at {application.company}</Text></View></FadeIn><MetricsCard metrics={categories} /><InsightSection icon="checkmark-circle-outline" title="Matched skills" tone={theme.success} bg={theme.successMuted} chips={result.matchedSkills} /><InsightSection icon="alert-circle-outline" title="Skills to develop" tone={theme.warning} bg={theme.warningMuted} chips={result.missingSkills} /><InsightSection icon="key-outline" title="Important keywords" tone={theme.info} bg={theme.infoMuted} chips={result.importantKeywords} /><InsightSection icon="bulb-outline" title="Recommended improvements" tone={theme.primary} bg={theme.primaryMuted} items={result.recommendedChanges} />{error ? <InlineError message={error} onRetry={onTailor} /> : null}<PrimaryButton title={tailoring ? 'Tailoring…' : tailored ? 'Regenerate recommendations' : 'Tailor my resume'} icon="sparkles" disabled={tailoring} onPress={onTailor} />{tailoring ? <LoadingState icon="create-outline" title="Tailoring recommendations…" copy={`Adapting guidance for ${application.title} at ${application.company}.`} /> : tailored ? <TailoredResumeEditor result={tailored} /> : null}</ScrollView>;
}

function TailoredResumeEditor({ result }: { result: TailoredResumeResult }) {
  const theme = useTheme();
  const initial = useMemo(() => [
    ['Skills to emphasize', result.skillsToEmphasize], ['Keywords to add', result.keywordsToAdd],
    ['Summary improvements', result.summaryImprovements], ['Experience bullets to improve', result.experienceBullets],
    ['Technologies to mention', result.technologiesToMention], ['Missing keywords', result.missingKeywords],
    ['Suggested wording', result.suggestedWording],
  ] as const, [result]);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(initial.map(([title, values]) => [title, values.join('\n• ')])));
  return <FadeIn style={[styles.letter, { backgroundColor: theme.surface, borderColor: theme.border }]}><View><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>Editable tailoring plan</Text><Text style={[typography.caption, { color: theme.textSecondary, marginTop: 3 }]}>Your original resume is not modified.</Text></View>{initial.map(([title]) => <View key={title}><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>{title.toUpperCase()}</Text><TextInput value={drafts[title] || ''} onChangeText={value => setDrafts(current => ({ ...current, [title]: value }))} multiline style={[styles.resultEditor, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]} /></View>)}</FadeIn>;
}

function CoverLetter({ applications, resumes, history, onResumeAdded, onRefresh, onBack, onToast }: { applications: Application[]; resumes: StoredDocument[]; history: CoverLetterRecord[]; onResumeAdded: (document: StoredDocument) => void; onRefresh: () => Promise<void>; onBack: () => void; onToast: Toast }) {
  const theme = useTheme();
  const profile = useAuthStore(state => state.profile);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [tone, setTone] = useState('PROFESSIONAL');
  const [length, setLength] = useState('MEDIUM');
  const [strengths, setStrengths] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const application = applications.find(item => item.id === applicationId);
  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  const upload = async () => {
    if (!isSupabaseConfigured) return onToast('Connect Supabase and sign in before uploading a resume', 'error');
    setBusy(true); setError('');
    try { const document = await pickAndUploadDocument('RESUME'); if (document) { onResumeAdded(document); setDocumentId(document.id); onToast('Resume uploaded'); } }
    catch (uploadError) { const message = errorMessage(uploadError, 'Resume upload failed.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    if (!applicationId || busy) return;
    setBusy(true); setError(''); setContent('');
    try {
      const result = await AIService.generateCoverLetter({ applicationId, ...(documentId ? { documentId } : {}), tone, length, keyStrengths: strengths.split(',').map(value => value.trim()).filter(Boolean) });
      setContent(result.content); onToast('Cover letter generated');
    } catch (generationError) { const message = errorMessage(generationError, 'Cover letter generation is temporarily unavailable.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!content || !applicationId || busy) return;
    setBusy(true); setError('');
    try { await saveCoverLetter({ applicationId, resumeDocumentId: documentId || undefined, title: `${application?.company || 'Application'} cover letter`, tone, length, keyStrengths: strengths.split(',').map(value => value.trim()).filter(Boolean), content }); await onRefresh(); onToast('Cover letter saved'); }
    catch (saveError) { const message = errorMessage(saveError, 'Cover letter could not be saved.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await Clipboard.setStringAsync(content); onToast('Cover letter copied'); }
    catch (copyError) { onToast(errorMessage(copyError, 'Cover letter could not be copied.'), 'error'); }
  };

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><ToolHeader title="Cover letter" onBack={onBack} /><Intro title="Create a tailored draft" copy="Choose an application, configure the draft, then edit it before saving." /><ApplicationPicker applications={applications} selectedId={applicationId} onSelect={id => { setApplicationId(id); setContent(''); setError(''); }} /><View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>OPTIONAL RESUME CONTEXT</Text><ResumePicker resumes={resumes} selectedId={documentId} onSelect={setDocumentId} onUpload={upload} busy={busy} allowNone /></View><Choice label="TONE" values={['PROFESSIONAL', 'CONFIDENT', 'CONCISE', 'ENTHUSIASTIC']} selected={tone} onSelect={setTone} /><Choice label="LENGTH" values={['SHORT', 'MEDIUM', 'LONG']} selected={length} onSelect={setLength} /><View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>KEY STRENGTHS</Text><TextInput value={strengths} onChangeText={setStrengths} multiline placeholder="Optional — e.g. skills or achievements you want emphasized" placeholderTextColor={theme.textSecondary} style={[styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary }]} /></View>{profileName ? <Text style={[typography.caption, { color: theme.textSecondary }]}>Signature: {profileName}</Text> : <Text style={[typography.caption, { color: theme.warning }]}>Add your name in Profile before generating a signed letter.</Text>}{error ? <InlineError message={error} onRetry={applicationId ? generate : undefined} /> : null}<PrimaryButton title={busy ? 'Generating…' : content ? 'Regenerate draft' : 'Generate cover letter'} icon="sparkles" disabled={busy || !applicationId} onPress={generate} />{content ? <FadeIn style={[styles.letter, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.letterHeader}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>Generated draft</Text><Pressable accessibilityLabel="Copy cover letter" onPress={copy}><Ionicons name="copy-outline" size={20} color={theme.primary} /></Pressable></View><TextInput value={content} onChangeText={setContent} multiline style={[typography.body, { color: theme.textPrimary, minHeight: 250, textAlignVertical: 'top' }]} /><PrimaryButton title={busy ? 'Saving…' : 'Save cover letter'} icon="bookmark-outline" disabled={busy} onPress={save} /></FadeIn> : null}{history.length ? <View><SectionHeader title="Saved letters" />{history.slice(0, 5).map(letter => <HistoryRow key={letter.id} title={letter.title} detail={`Saved ${new Date(letter.updated_at).toLocaleDateString()}`} onPress={() => { setApplicationId(letter.application_id); setDocumentId(letter.resume_document_id); setTone(letter.tone); setLength(letter.length); setStrengths(letter.key_strengths.join(', ')); setContent(letter.content); setError(''); }} />)}</View> : null}</ScrollView>;
}

function Coach({ applications, onBack, onToast }: { applications: Application[]; onBack: () => void; onToast: Toast }) {
  const theme = useTheme();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState('TECHNICAL');
  const [difficulty, setDifficulty] = useState<AIInterviewSession['difficulty']>('INTERMEDIATE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [focus, setFocus] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedbackResult | null>(null);
  const [retryNextQuestion, setRetryNextQuestion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const application = applications.find(item => item.id === applicationId);
  const interviewLabel = `${interviewType.charAt(0)}${interviewType.slice(1).toLowerCase()} Interview`;

  const start = async () => {
    if (!applicationId || busy) return;
    setBusy(true); setError(''); setFeedback(null); setAnswer(''); setRetryNextQuestion(false);
    let createdSessionId: string | null = null;
    try {
      const session = await createSession(applicationId, interviewLabel, difficulty);
      createdSessionId = session.id;
      const next = await AIService.getInterviewQuestion({ applicationId, sessionId: session.id, interviewType: interviewLabel, difficulty });
      await addMessage(session.id, 'ASSISTANT', next.question, { focus: next.focus });
      setSessionId(session.id); setQuestion(next.question); setFocus(next.focus); onToast('Interview practice started');
    } catch (startError) { if (createdSessionId) { try { await abandonSession(createdSessionId); } catch { /* Preserve the original start error. */ } } const message = errorMessage(startError, 'Interview practice could not be started.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!applicationId || !sessionId || !question || busy) return;
    if (answer.trim().length < 20) return onToast('Add a more complete answer before requesting feedback', 'error');
    setBusy(true); setError(''); setFeedback(null); setRetryNextQuestion(false);
    try {
      const result = await AIService.getInterviewFeedback({ applicationId, sessionId, question, answer, interviewType: interviewLabel, difficulty });
      await addMessage(sessionId, 'USER', answer);
      await addMessage(sessionId, 'FEEDBACK', result.suggestion, result);
      setFeedback(result); onToast('Interview feedback is ready');
    } catch (feedbackError) { const message = errorMessage(feedbackError, 'Interview feedback is temporarily unavailable.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  const nextQuestion = async () => {
    if (!applicationId || !sessionId || busy) return;
    const transition = prepareNextQuestion({ applicationId, sessionId, question, answer, feedback, retryNextQuestion });
    setBusy(true); setError(''); setAnswer(transition.answer); setFeedback(transition.feedback); setRetryNextQuestion(transition.retryNextQuestion);
    try {
      const next = await AIService.getInterviewQuestion({ applicationId: transition.applicationId, sessionId: transition.sessionId, interviewType: interviewLabel, difficulty, previousQuestion: transition.question });
      await addMessage(sessionId, 'ASSISTANT', next.question, { focus: next.focus });
      setQuestion(next.question); setFocus(next.focus); setRetryNextQuestion(false);
    } catch (questionError) { const message = errorMessage(questionError, 'The next interview question is temporarily unavailable.'); setError(message); onToast(message, 'error'); }
    finally { setBusy(false); }
  };

  if (!sessionId || !application) return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><ToolHeader title="Interview coach" onBack={onBack} /><Intro title="Configure your practice" copy="Select the application and interview type before starting." /><ApplicationPicker applications={applications} selectedId={applicationId} onSelect={id => { setApplicationId(id); setError(''); }} /><Choice label="INTERVIEW TYPE" values={['TECHNICAL', 'BEHAVIORAL', 'SYSTEM DESIGN', 'CULTURE']} selected={interviewType} onSelect={setInterviewType} /><Choice label="DIFFICULTY" values={['BEGINNER', 'INTERMEDIATE', 'ADVANCED']} selected={difficulty} onSelect={value => setDifficulty(value as AIInterviewSession['difficulty'])} />{error ? <InlineError message={error} onRetry={start} /> : null}<PrimaryButton title={busy ? 'Starting…' : 'Start interview'} icon="chatbubbles-outline" disabled={busy || !applicationId} onPress={start} /></ScrollView>;

  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={[styles.content, { paddingBottom: 190 }]}><ToolHeader title="Interview coach" onBack={onBack} /><View style={styles.coachIntro}><View style={[styles.aiAvatar, { backgroundColor: theme.primary }]}><Ionicons name="sparkles" size={17} color="#fff" /></View><View><Text style={[typography.caption, { color: theme.textSecondary }]}>AI COACH · {application.title.toUpperCase()}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{application.company} · {interviewLabel}</Text></View></View><View style={[styles.aiMessage, { backgroundColor: theme.surface, borderColor: theme.border }]}>{focus ? <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.xs }]}>{focus.toUpperCase()}</Text> : null}<Text style={[typography.body, { color: theme.textPrimary }]}>{question}</Text></View><View style={[styles.answerBox, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}><TextInput value={answer} onChangeText={setAnswer} editable={!busy} multiline placeholder="Write your answer with situation, action, and result…" placeholderTextColor={theme.textSecondary} style={[typography.body, { color: theme.textPrimary, minHeight: 120, textAlignVertical: 'top' }]} /></View>{error ? <InlineError message={error} onRetry={retryNextQuestion || feedback ? nextQuestion : submit} /> : null}{feedback ? <View style={[styles.feedback, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.feedbackHeader}><Ionicons name="analytics-outline" size={20} color={theme.primary} /><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>Answer feedback</Text></View><View style={styles.feedbackScores}>{[['Clarity', feedback.clarity], ['Relevance', feedback.relevance], ['Structure', feedback.structure], ['Impact', feedback.impact]].map(([label, score]) => <View key={label} style={{ flex: 1 }}><Text style={[styles.feedbackValue, { color: theme.textPrimary }]}>{score}<Text style={[typography.caption, { color: theme.textSecondary }]}>/10</Text></Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{label}</Text></View>)}</View><InsightSection icon="checkmark-circle-outline" title="Strengths" tone={theme.success} bg={theme.successMuted} items={feedback.strengths} /><InsightSection icon="arrow-up-circle-outline" title="Improvements" tone={theme.warning} bg={theme.warningMuted} items={feedback.improvements} /><Text style={[typography.bodyMedium, { color: theme.textPrimary, marginTop: spacing.sm }]}>Suggested improvement</Text><Text style={[typography.body, { color: theme.textSecondary, marginTop: 3 }]}>{feedback.suggestion}</Text></View> : null}</ScrollView><View style={[styles.coachAction, { backgroundColor: theme.background, borderTopColor: theme.border }]}><PrimaryButton title={busy ? 'Working…' : retryNextQuestion ? 'Retry question' : feedback ? 'Next question' : 'Submit answer'} icon={retryNextQuestion || feedback ? 'arrow-forward' : 'sparkles'} disabled={busy} onPress={retryNextQuestion || feedback ? nextQuestion : submit} /></View></View>;
}

function ApplicationPicker({ applications, selectedId, onSelect }: { applications: Application[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const theme = useTheme();
  return <View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>APPLICATION</Text>{applications.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>{applications.map(application => <Pressable key={application.id} onPress={() => onSelect(application.id)} style={[styles.selectionCard, { backgroundColor: selectedId === application.id ? theme.primaryMuted : theme.surface, borderColor: selectedId === application.id ? theme.primary : theme.border }]}><Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.textPrimary }]}>{application.title}</Text><Text numberOfLines={1} style={[typography.caption, { color: theme.textSecondary }]}>{application.company}</Text></Pressable>)}</ScrollView> : <EmptyHint text="Add an application before using this feature." />}</View>;
}

function ResumePicker({ resumes, selectedId, onSelect, onUpload, busy, analysisDocumentIds, allowNone = false }: { resumes: StoredDocument[]; selectedId: string | null; onSelect: (id: string | null) => void; onUpload: () => void; busy: boolean; analysisDocumentIds?: Set<string>; allowNone?: boolean }) {
  const theme = useTheme();
  return <View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>RESUME</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>{allowNone ? <Pressable onPress={() => onSelect(null)} style={[styles.selectionCard, { backgroundColor: selectedId === null ? theme.primaryMuted : theme.surface, borderColor: selectedId === null ? theme.primary : theme.border }]}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>No resume</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Profile context only</Text></Pressable> : null}{resumes.map(document => <Pressable key={document.id} onPress={() => onSelect(document.id)} style={[styles.selectionCard, { backgroundColor: selectedId === document.id ? theme.primaryMuted : theme.surface, borderColor: selectedId === document.id ? theme.primary : theme.border }]}><Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.textPrimary }]}>{document.name}</Text><Text style={[typography.caption, { color: analysisDocumentIds?.has(document.id) ? theme.success : theme.textSecondary }]}>{analysisDocumentIds?.has(document.id) ? 'Existing analysis' : formatFileSize(document.size_bytes)}</Text></Pressable>)}<Pressable disabled={busy} onPress={onUpload} style={[styles.uploadCard, { borderColor: theme.primary, opacity: busy ? 0.55 : 1 }]}><Ionicons name="cloud-upload-outline" size={19} color={theme.primary} /><Text style={[typography.bodyMedium, { color: theme.primary }]}>{busy ? 'Uploading…' : 'Upload CV'}</Text></Pressable></ScrollView></View>;
}

function ToolHeader({ title, onBack }: { title: string; onBack: () => void }) { const theme = useTheme(); return <View style={styles.toolHeader}><Pressable accessibilityLabel="Back" onPress={onBack} style={[styles.back, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="arrow-back" size={20} color={theme.textPrimary} /></Pressable><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{title}</Text><View style={{ width: 44 }} /></View>; }
function Intro({ title, copy }: { title: string; copy: string }) { const theme = useTheme(); return <View><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>{copy}</Text></View>; }
function ScoreRing({ value, label }: { value: number; label: string }) { const theme = useTheme(); return <View style={[styles.ring, { borderColor: theme.primaryMuted }]}><View style={[styles.ringArc, { borderTopColor: theme.primary, borderRightColor: theme.primary, borderBottomColor: theme.primary }]}><Text style={[styles.scoreValue, { color: theme.textPrimary }]}>{value}</Text><Text style={[typography.label, { color: theme.success }]}>{label.toUpperCase()}</Text></View></View>; }
function LoadingState({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) { const theme = useTheme(); return <View style={styles.scoreSection}><Ionicons name={icon} size={28} color={theme.primary} /><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>{copy}</Text></View>; }
function MetricsCard({ metrics }: { metrics: readonly (readonly [string, number])[] }) { const theme = useTheme(); return <FadeIn delay={80}><View style={[styles.metricsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>{metrics.map(([name, value], index) => <View key={name} style={[styles.metricRow, index < metrics.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}><View style={{ flex: 1 }}><View style={styles.metricLabel}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>{name}</Text><Text style={[typography.bodyMedium, { color: theme.textSecondary }]}>{value}%</Text></View><ProgressBar value={value} /></View></View>)}</View></FadeIn>; }
function InsightSection({ icon, title, tone, bg, items, chips }: { icon: keyof typeof Ionicons.glyphMap; title: string; tone: string; bg: string; items?: string[]; chips?: string[] }) { const theme = useTheme(); if (!items?.length && !chips?.length) return null; return <FadeIn delay={120}><View style={styles.insightTitle}><View style={[styles.smallIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={tone} /></View><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text></View>{items?.map(item => <View key={item} style={styles.bulletRow}><View style={[styles.bullet, { backgroundColor: tone }]} /><Text style={[typography.body, { color: theme.textSecondary, flex: 1 }]}>{item}</Text></View>)}{chips?.length ? <View style={styles.chips}>{chips.map(chip => <View key={chip} style={[styles.chip, { backgroundColor: bg }]}><Text style={[typography.bodyMedium, { color: tone }]}>{chip}</Text></View>)}</View> : null}</FadeIn>; }
function Choice({ label, values, selected, onSelect }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void }) { const theme = useTheme(); return <View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>{values.map(value => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, { backgroundColor: value === selected ? theme.primaryMuted : theme.surface, borderColor: value === selected ? theme.primary : theme.border }]}><Text style={[typography.caption, { color: value === selected ? theme.primary : theme.textSecondary, fontWeight: '600' }]}>{value}</Text></Pressable>)}</ScrollView></View>; }
function InlineError({ message, onRetry }: { message: string; onRetry?: () => void | Promise<void> }) { const theme = useTheme(); return <View style={[styles.error, { backgroundColor: theme.dangerMuted }]}><Ionicons name="alert-circle-outline" size={19} color={theme.danger} /><Text style={[typography.bodyMedium, { color: theme.danger, flex: 1 }]}>{message}</Text>{onRetry ? <Pressable onPress={() => void onRetry()}><Text style={[typography.bodyMedium, { color: theme.danger, fontWeight: '700' }]}>Retry</Text></Pressable> : null}</View>; }
function EmptyHint({ text }: { text: string }) { const theme = useTheme(); return <View style={[styles.notice, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="information-circle-outline" size={19} color={theme.textSecondary} /><Text style={[typography.bodyMedium, { color: theme.textSecondary, flex: 1 }]}>{text}</Text></View>; }
function HistoryRow({ title, detail, onPress }: { title: string; detail: string; onPress?: () => void }) { const theme = useTheme(); return <Pressable disabled={!onPress} onPress={onPress} style={[styles.historyRow, { borderBottomColor: theme.border }]}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.textPrimary }]}>{title}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{detail}</Text></View>{onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}</Pressable>; }
function formatFileSize(size: number | null): string { if (!size) return 'Uploaded resume'; return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.xxl },
  sparkle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tool: { minHeight: 92, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toolIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  activity: { borderTopWidth: 1, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activityIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  error: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scoreSection: { alignItems: 'center', gap: spacing.md },
  ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 14, padding: 5 },
  ringArc: { flex: 1, borderRadius: 78, borderWidth: 7, borderLeftColor: 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  scoreValue: { fontSize: 47, lineHeight: 52, fontWeight: '700', letterSpacing: -1.5, transform: [{ rotate: '18deg' }] },
  metricsCard: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  metricRow: { paddingVertical: spacing.md },
  metricLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  insightTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  smallIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: radius.pill },
  matchHero: { borderRadius: radius.xl, alignItems: 'center', padding: spacing.xxl },
  matchValue: { fontSize: 56, lineHeight: 64, letterSpacing: -2, fontWeight: '700' },
  choice: { height: 38, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  textArea: { minHeight: 96, borderRadius: radius.md, borderWidth: 1, padding: spacing.md, fontSize: 15, textAlignVertical: 'top' },
  letter: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  letterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultEditor: { minHeight: 80, borderRadius: radius.md, borderWidth: 1, padding: spacing.sm, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  pickerRow: { gap: spacing.xs, paddingRight: spacing.lg },
  selectionCard: { width: 190, minHeight: 64, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, justifyContent: 'center' },
  uploadCard: { minWidth: 126, minHeight: 64, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 3 },
  historyRow: { minHeight: 58, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachIntro: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  aiMessage: { alignSelf: 'flex-start', maxWidth: '92%', borderRadius: 18, borderBottomLeftRadius: 5, padding: spacing.md, borderWidth: 1 },
  answerBox: { borderRadius: 18, borderBottomRightRadius: 5, padding: spacing.md, borderWidth: 1 },
  feedback: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  feedbackScores: { flexDirection: 'row', marginTop: spacing.lg },
  feedbackValue: { fontSize: 21, fontWeight: '700' },
  coachAction: { position: 'absolute', left: 0, right: 0, bottom: 76, padding: spacing.lg, borderTopWidth: 1 },
});
