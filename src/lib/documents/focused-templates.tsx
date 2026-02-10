/**
 * Focused PDF Document Templates
 *
 * Individual document exports for specific sections:
 * - Test Plan
 * - Process Design
 * - Executive Summary
 * - Technical Foundation
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from './types'

// Shared styles for focused documents
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: DOCUMENT_COLORS.white,
    padding: 50,
    paddingBottom: 70,
    fontFamily: 'Helvetica',
    fontSize: DOCUMENT_FONTS.body,
    color: DOCUMENT_COLORS.text,
  },
  coverTop: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  coverAccent: {
    width: 60,
    height: 4,
    backgroundColor: DOCUMENT_COLORS.primary,
    marginBottom: 30,
  },
  coverDocType: {
    fontSize: 11,
    color: DOCUMENT_COLORS.primary,
    letterSpacing: 3,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: DOCUMENT_COLORS.textLight,
    textAlign: 'center',
    marginBottom: 30,
  },
  coverCompany: {
    fontSize: 12,
    color: DOCUMENT_COLORS.primary,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: DOCUMENT_COLORS.border,
  },
  footerText: {
    fontSize: 8,
    color: DOCUMENT_COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: DOCUMENT_COLORS.primary,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 10,
    textAlign: 'justify',
  },
  card: {
    backgroundColor: DOCUMENT_COLORS.background,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: DOCUMENT_COLORS.primary,
  },
  cardSuccess: {
    borderLeftColor: DOCUMENT_COLORS.success,
  },
  cardWarning: {
    borderLeftColor: DOCUMENT_COLORS.warning,
  },
  cardDanger: {
    borderLeftColor: DOCUMENT_COLORS.danger,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginBottom: 4,
  },
  cardContent: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
    lineHeight: 1.4,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DOCUMENT_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: DOCUMENT_COLORS.background,
  },
  tableCell: {
    fontSize: 9,
    color: DOCUMENT_COLORS.text,
    lineHeight: 1.3,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  metricItem: {
    width: '48%',
    marginBottom: 8,
    marginRight: '2%',
    padding: 10,
    backgroundColor: DOCUMENT_COLORS.background,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.primary,
  },
  metricLabel: {
    fontSize: 8,
    color: DOCUMENT_COLORS.textLight,
    marginTop: 2,
  },
  bulletList: {
    marginLeft: 12,
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 12,
    fontSize: 10,
    color: DOCUMENT_COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.5,
  },
  highlightBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    padding: 14,
    marginVertical: 12,
  },
  highlightTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.primary,
    marginBottom: 6,
  },
  highlightContent: {
    fontSize: 9,
    lineHeight: 1.5,
    color: DOCUMENT_COLORS.text,
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  priorityLow: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
})

// ═══════════════════════════════════════════════════════════════════════════════
// TEST PLAN PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface TestPlanData {
  companyName: string
  digitalEmployeeName: string
  testCases: Array<{
    id: string
    name: string
    type: string
    priority: string
    preconditions?: string
    steps: string[]
    expectedResult: string
  }>
  scopeItems: Array<{
    description: string
    classification: string
  }>
}

export function TestPlanPDF({ data }: { data: TestPlanData }) {
  const date = new Date().toISOString().split('T')[0]
  const totalTests = data.testCases.length
  const highPriority = data.testCases.filter(t => t.priority === 'critical' || t.priority === 'high').length
  const scopeInCount = data.scopeItems.filter(s => s.classification === 'IN_SCOPE').length

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Test Plan</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>UAT Test Cases & Coverage</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{totalTests}</Text>
            <Text style={styles.metricLabel}>Total Test Cases</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{highPriority}</Text>
            <Text style={styles.metricLabel}>High Priority</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{scopeInCount}</Text>
            <Text style={styles.metricLabel}>Scope Items</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{date}</Text>
            <Text style={styles.metricLabel}>Generated</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Test Plan</Text>
        </View>
      </Page>

      {/* Test Cases */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Test Cases</Text>

        {data.testCases.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No test cases defined yet. Add test cases in the Test Plan tab.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Test Case</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Priority</Text>
              <Text style={[styles.tableHeaderCell, { width: '48%' }]}>Expected Result</Text>
            </View>
            {data.testCases.map((tc, idx) => (
              <View key={tc.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { width: '5%' }]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{tc.name}</Text>
                <Text style={[styles.tableCell, { width: '12%' }]}>{tc.type}</Text>
                <View style={{ width: '10%' }}>
                  <Text style={
                    tc.priority === 'critical' || tc.priority === 'high'
                      ? styles.priorityHigh
                      : tc.priority === 'medium'
                      ? styles.priorityMedium
                      : styles.priorityLow
                  }>
                    {tc.priority}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { width: '48%' }]}>{tc.expectedResult}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Detailed Test Steps (if more than summary) */}
      {data.testCases.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Detailed Test Steps</Text>

          {data.testCases.slice(0, 8).map((tc, idx) => (
            <View key={tc.id} style={[styles.card, tc.priority === 'critical' || tc.priority === 'high' ? styles.cardWarning : {}]}>
              <Text style={styles.cardTitle}>TC-{idx + 1}: {tc.name}</Text>
              {tc.preconditions && (
                <Text style={[styles.cardContent, { fontStyle: 'italic', marginBottom: 4 }]}>
                  Preconditions: {tc.preconditions}
                </Text>
              )}
              <View style={styles.bulletList}>
                {tc.steps.map((step, stepIdx) => (
                  <View key={stepIdx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>{stepIdx + 1}.</Text>
                    <Text style={styles.bulletText}>{step}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.cardContent, { fontWeight: 'bold' }]}>
                Expected: {tc.expectedResult}
              </Text>
            </View>
          ))}

          {data.testCases.length > 8 && (
            <Text style={[styles.cardContent, { textAlign: 'center', marginTop: 10 }]}>
              ... and {data.testCases.length - 8} additional test cases
            </Text>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
            <Text style={styles.footerText}>Page 3</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS DESIGN PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface ProcessDesignData {
  companyName: string
  digitalEmployeeName: string
  happyPathSteps: Array<{ content: string; structuredData: unknown }>
  exceptions: Array<{ content: string; structuredData: unknown }>
  escalationTriggers: Array<{ content: string; structuredData: unknown }>
  caseTypes: Array<{ content: string; structuredData: unknown }>
  channels: Array<{ content: string }>
  scopeItems: Array<{ description: string; classification: string }>
}

export function ProcessDesignPDF({ data }: { data: ProcessDesignData }) {
  const date = new Date().toISOString().split('T')[0]
  const inScope = data.scopeItems.filter(s => s.classification === 'IN_SCOPE')
  const outOfScope = data.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE')

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Process Design</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>Process Flow & Scope Definition</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.happyPathSteps.length}</Text>
            <Text style={styles.metricLabel}>Process Steps</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.exceptions.length}</Text>
            <Text style={styles.metricLabel}>Exception Paths</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{inScope.length}</Text>
            <Text style={styles.metricLabel}>In Scope</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.channels.length}</Text>
            <Text style={styles.metricLabel}>Channels</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Process Design</Text>
        </View>
      </Page>

      {/* Happy Path */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Process Flow - Happy Path</Text>

        {data.happyPathSteps.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No process steps extracted yet.</Text>
          </View>
        ) : (
          data.happyPathSteps.map((step, idx) => (
            <View key={idx} style={[styles.card, styles.cardSuccess]}>
              <Text style={styles.cardTitle}>Step {idx + 1}</Text>
              <Text style={styles.cardContent}>{step.content}</Text>
            </View>
          ))
        )}

        {/* Case Types */}
        {data.caseTypes.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Case Types</Text>
            <View style={styles.bulletList}>
              {data.caseTypes.map((ct, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{ct.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Channels */}
        {data.channels.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Channels</Text>
            <View style={styles.bulletList}>
              {data.channels.map((ch, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{ch.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Exception Handling */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Exception Handling</Text>

        {data.exceptions.length === 0 && data.escalationTriggers.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No exceptions or escalation triggers defined yet.</Text>
          </View>
        ) : (
          <>
            {data.exceptions.map((exc, idx) => (
              <View key={idx} style={[styles.card, styles.cardWarning]}>
                <Text style={styles.cardTitle}>Exception {idx + 1}</Text>
                <Text style={styles.cardContent}>{exc.content}</Text>
              </View>
            ))}

            {data.escalationTriggers.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Escalation Triggers</Text>
                {data.escalationTriggers.map((esc, idx) => (
                  <View key={idx} style={[styles.card, styles.cardDanger]}>
                    <Text style={styles.cardContent}>{esc.content}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* Scope Summary */}
        <Text style={styles.subsectionTitle}>Scope Summary</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={[styles.card, styles.cardSuccess, { flex: 1 }]}>
            <Text style={styles.cardTitle}>In Scope ({inScope.length})</Text>
            {inScope.slice(0, 5).map((item, idx) => (
              <Text key={idx} style={styles.cardContent}>• {item.description}</Text>
            ))}
          </View>
          <View style={[styles.card, styles.cardDanger, { flex: 1 }]}>
            <Text style={styles.cardTitle}>Out of Scope ({outOfScope.length})</Text>
            {outOfScope.slice(0, 5).map((item, idx) => (
              <Text key={idx} style={styles.cardContent}>• {item.description}</Text>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface ExecutiveSummaryData {
  companyName: string
  digitalEmployeeName: string
  description: string | null
  goals: Array<{ content: string }>
  kpis: Array<{ content: string; structuredData: unknown }>
  stakeholders: Array<{ content: string; structuredData: unknown }>
  volumes: Array<{ content: string; structuredData: unknown }>
  integrationCount: number
  scopeInCount: number
  scopeOutCount: number
}

export function ExecutiveSummaryPDF({ data }: { data: ExecutiveSummaryData }) {
  const date = new Date().toISOString().split('T')[0]

  return (
    <Document>
      {/* Single Page Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Executive Summary</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>{data.description || 'Digital Employee Implementation'}</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.goals.length}</Text>
            <Text style={styles.metricLabel}>Goals Defined</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.kpis.length}</Text>
            <Text style={styles.metricLabel}>KPIs Tracked</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.integrationCount}</Text>
            <Text style={styles.metricLabel}>Integrations</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.scopeInCount}</Text>
            <Text style={styles.metricLabel}>Scope Items</Text>
          </View>
        </View>

        {/* Goals */}
        {data.goals.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Key Goals</Text>
            <View style={styles.bulletList}>
              {data.goals.slice(0, 5).map((goal, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{goal.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* KPIs */}
        {data.kpis.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Key Performance Indicators</Text>
            <View style={styles.bulletList}>
              {data.kpis.slice(0, 5).map((kpi, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{kpi.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Stakeholders */}
        {data.stakeholders.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Key Stakeholders</Text>
            <View style={styles.bulletList}>
              {data.stakeholders.slice(0, 4).map((s, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{s.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Volumes */}
        {data.volumes.length > 0 && (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>Expected Volumes</Text>
            {data.volumes.slice(0, 3).map((v, idx) => (
              <Text key={idx} style={styles.highlightContent}>• {v.content}</Text>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName} | Generated: {date}</Text>
          <Text style={styles.footerText}>Executive Summary</Text>
        </View>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL FOUNDATION PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface TechnicalFoundationData {
  companyName: string
  digitalEmployeeName: string
  integrations: Array<{
    systemName: string
    purpose: string | null
    type: string | null
    authMethod: string | null
    endpoint: string | null
  }>
  dataFields: Array<{ content: string; structuredData: unknown }>
  securityRequirements: Array<{ content: string }>
  complianceRequirements: Array<{ content: string }>
  apiEndpoints: Array<{ content: string; structuredData: unknown }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA & CONVERSATIONAL DESIGN PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface PersonaDesignData {
  companyName: string
  digitalEmployeeName: string
  personaTraits: Array<{ content: string; structuredData: unknown }>
  toneRules: Array<{ content: string; structuredData: unknown }>
  dosAndDonts: Array<{ content: string; structuredData: unknown }>
  exampleDialogues: Array<{ content: string; structuredData: unknown }>
  escalationScripts: Array<{ content: string; structuredData: unknown }>
  edgeCaseResponses: Array<{ content: string; structuredData: unknown }>
  communicationStyles: Array<{ content: string }>
  guardrails: Array<{ content: string; type: string }>
}

export function PersonaDesignPDF({ data }: { data: PersonaDesignData }) {
  const date = new Date().toISOString().split('T')[0]

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Persona & Conversational Design</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>Identity, Tone & Conversation Guidelines</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.personaTraits.length}</Text>
            <Text style={styles.metricLabel}>Persona Traits</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.dosAndDonts.length}</Text>
            <Text style={styles.metricLabel}>Do&apos;s & Don&apos;ts</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.escalationScripts.length}</Text>
            <Text style={styles.metricLabel}>Escalation Scripts</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.exampleDialogues.length}</Text>
            <Text style={styles.metricLabel}>Example Dialogues</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Persona Design</Text>
        </View>
      </Page>

      {/* Personality & Tone */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Personality & Tone of Voice</Text>

        {/* Persona Traits */}
        {data.personaTraits.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Personality Traits</Text>
            {data.personaTraits.map((trait, idx) => {
              const sd = trait.structuredData as Record<string, string> | null
              return (
                <View key={idx} style={[styles.card, styles.cardSuccess]}>
                  <Text style={styles.cardTitle}>{sd?.name || `Trait ${idx + 1}`}</Text>
                  <Text style={styles.cardContent}>{trait.content}</Text>
                  {sd?.examplePhrase && (
                    <Text style={[styles.cardContent, { fontStyle: 'italic', marginTop: 4 }]}>
                      Example: &quot;{sd.examplePhrase}&quot;
                    </Text>
                  )}
                </View>
              )
            })}
          </>
        )}

        {/* Tone Rules */}
        {data.toneRules.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Tone of Voice Rules</Text>
            {data.toneRules.map((rule, idx) => {
              const sd = rule.structuredData as Record<string, string> | null
              return (
                <View key={idx} style={styles.card}>
                  <Text style={styles.cardTitle}>{sd?.aspect || `Rule ${idx + 1}`}</Text>
                  <Text style={styles.cardContent}>{rule.content}</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Communication Style */}
        {data.communicationStyles.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Communication Style</Text>
            <View style={styles.bulletList}>
              {data.communicationStyles.map((cs, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{cs.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {data.personaTraits.length === 0 && data.toneRules.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No persona traits or tone rules extracted yet.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Do's & Don'ts + Guardrails */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Conversation Guidelines</Text>

        {/* Do's & Don'ts */}
        {data.dosAndDonts.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Do&apos;s & Don&apos;ts</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '45%' }]}>Wrong (Don&apos;t)</Text>
                <Text style={[styles.tableHeaderCell, { width: '45%' }]}>Right (Do)</Text>
              </View>
              {data.dosAndDonts.map((item, idx) => {
                const sd = item.structuredData as Record<string, string> | null
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '10%' }]}>{idx + 1}</Text>
                    <Text style={[styles.tableCell, { width: '45%', color: '#991B1B' }]}>
                      {sd?.wrong || '-'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '45%', color: '#065F46' }]}>
                      {sd?.right || item.content}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Guardrails */}
        {data.guardrails.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>What the DE Must NEVER Do</Text>
            {data.guardrails.map((g, idx) => (
              <View key={idx} style={[styles.card, styles.cardDanger]}>
                <Text style={styles.cardContent}>{g.content}</Text>
              </View>
            ))}
          </>
        )}

        {/* Edge Cases */}
        {data.edgeCaseResponses.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Edge Case Handling</Text>
            {data.edgeCaseResponses.map((ec, idx) => {
              const sd = ec.structuredData as Record<string, string> | null
              return (
                <View key={idx} style={[styles.card, styles.cardWarning]}>
                  <Text style={styles.cardTitle}>{sd?.trigger || `Edge Case ${idx + 1}`}</Text>
                  <Text style={styles.cardContent}>{ec.content}</Text>
                </View>
              )
            })}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>

      {/* Escalation Scripts & Example Dialogues */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Escalation & Example Dialogues</Text>

        {/* Escalation Scripts */}
        {data.escalationScripts.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Escalation Scripts</Text>
            {data.escalationScripts.map((script, idx) => {
              const sd = script.structuredData as Record<string, string> | null
              return (
                <View key={idx} style={[styles.card, styles.cardWarning]}>
                  <Text style={styles.cardTitle}>
                    {sd?.context || sd?.trigger || `Script ${idx + 1}`}
                  </Text>
                  <Text style={styles.cardContent}>{script.content}</Text>
                  {sd?.script && sd.script !== script.content && (
                    <View style={[styles.highlightBox, { marginTop: 6, padding: 8 }]}>
                      <Text style={[styles.cardContent, { fontStyle: 'italic' }]}>
                        &quot;{sd.script}&quot;
                      </Text>
                    </View>
                  )}
                </View>
              )
            })}
          </>
        )}

        {/* Example Dialogues */}
        {data.exampleDialogues.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Example Dialogues</Text>
            {data.exampleDialogues.slice(0, 5).map((dialogue, idx) => {
              const sd = dialogue.structuredData as Record<string, unknown> | null
              const scenario = (sd?.scenario as string) || `Dialogue ${idx + 1}`
              const messages = (sd?.messages as Array<{ speaker: string; text: string }>) || []
              return (
                <View key={idx} style={[styles.card, { marginBottom: 10 }]}>
                  <Text style={styles.cardTitle}>{scenario}</Text>
                  {messages.length > 0 ? (
                    messages.slice(0, 6).map((msg, mi) => (
                      <Text key={mi} style={[styles.cardContent, {
                        marginTop: 3,
                        fontWeight: msg.speaker === 'DE' ? 'bold' : 'normal',
                      }]}>
                        {msg.speaker}: {msg.text}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.cardContent}>{dialogue.content}</Text>
                  )}
                </View>
              )
            })}
          </>
        )}

        {data.escalationScripts.length === 0 && data.exampleDialogues.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No escalation scripts or example dialogues extracted yet.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName} | Generated: {date}</Text>
          <Text style={styles.footerText}>Page 4</Text>
        </View>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONITORING FRAMEWORK PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface MonitoringFrameworkData {
  companyName: string
  digitalEmployeeName: string
  monitoringMetrics: Array<{ content: string; structuredData: unknown }>
  kpis: Array<{ content: string; structuredData: unknown }>
  volumes: Array<{ content: string; structuredData: unknown }>
}

export function MonitoringFrameworkPDF({ data }: { data: MonitoringFrameworkData }) {
  const date = new Date().toISOString().split('T')[0]

  // Categorize metrics by perspective
  const userMetrics: typeof data.monitoringMetrics = []
  const operationalMetrics: typeof data.monitoringMetrics = []
  const knowledgeMetrics: typeof data.monitoringMetrics = []
  const financialMetrics: typeof data.monitoringMetrics = []

  for (const m of data.monitoringMetrics) {
    const sd = m.structuredData as Record<string, string> | null
    const perspective = sd?.perspective?.toLowerCase() || ''
    if (perspective.includes('user') || perspective.includes('experience') || perspective.includes('satisfaction')) {
      userMetrics.push(m)
    } else if (perspective.includes('knowledge') || perspective.includes('quality')) {
      knowledgeMetrics.push(m)
    } else if (perspective.includes('financial') || perspective.includes('cost') || perspective.includes('roi')) {
      financialMetrics.push(m)
    } else {
      operationalMetrics.push(m)
    }
  }

  const totalMetrics = data.monitoringMetrics.length + data.kpis.length

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Monitoring Framework</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>KPIs, Dashboards & Reporting</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{totalMetrics}</Text>
            <Text style={styles.metricLabel}>Total Metrics Tracked</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{userMetrics.length}</Text>
            <Text style={styles.metricLabel}>User Experience</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{operationalMetrics.length}</Text>
            <Text style={styles.metricLabel}>Operational</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{date}</Text>
            <Text style={styles.metricLabel}>Generated</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Monitoring Framework</Text>
        </View>
      </Page>

      {/* KPI Definitions */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>KPI Definitions</Text>

        {/* Render KPIs from KPI_TARGET items */}
        {data.kpis.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Key Performance Indicators</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>KPI</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Target</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Owner</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Frequency</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Action if Breached</Text>
              </View>
              {data.kpis.map((kpi, idx) => {
                const sd = kpi.structuredData as Record<string, string> | null
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>
                      {sd?.name || kpi.content.slice(0, 40)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{sd?.target || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{sd?.owner || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{sd?.frequency || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{sd?.actionTrigger || '-'}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Monitoring Metrics by perspective */}
        {data.monitoringMetrics.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Monitoring Metrics</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Metric</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Target</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Perspective</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Owner</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Alert Threshold</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Action</Text>
              </View>
              {data.monitoringMetrics.map((metric, idx) => {
                const sd = metric.structuredData as Record<string, string> | null
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '22%', fontWeight: 'bold' }]}>
                      {sd?.name || metric.content.slice(0, 30)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '13%' }]}>{sd?.target || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '13%' }]}>{sd?.perspective || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '12%' }]}>{sd?.owner || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{sd?.alertThreshold || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{sd?.actionTrigger || '-'}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {data.kpis.length === 0 && data.monitoringMetrics.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No monitoring metrics or KPIs extracted yet.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Volume & Reporting */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Volume Expectations & Reporting</Text>

        {/* Volume expectations */}
        {data.volumes.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Volume Expectations</Text>
            {data.volumes.map((vol, idx) => (
              <View key={idx} style={[styles.card, styles.cardSuccess]}>
                <Text style={styles.cardContent}>{vol.content}</Text>
              </View>
            ))}
          </>
        )}

        {/* Reporting Cycle */}
        <Text style={styles.subsectionTitle}>Recommended Reporting Cycle</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Cadence</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Content</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Audience</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Format</Text>
          </View>
          {[
            { cadence: 'Daily', content: 'Volume, CSAT, escalation rate, top unanswered questions', audience: 'Operations', format: 'Auto-summary' },
            { cadence: 'Weekly', content: 'All operational KPIs, quality samples, knowledge gaps, top 5 improvements', audience: 'Project Team', format: 'Deep-dive meeting' },
            { cadence: 'Monthly', content: 'All 4 KPI perspectives, trend analysis, baseline comparison', audience: 'Management', format: 'PDF report' },
            { cadence: 'Quarterly', content: 'Financial impact analysis, ROI calculation, strategic recommendations', audience: 'Stakeholders', format: 'Business review' },
          ].map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>{row.cadence}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>{row.content}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{row.audience}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{row.format}</Text>
            </View>
          ))}
        </View>

        {/* Alert Configuration */}
        <Text style={styles.subsectionTitle}>Alert Configuration</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightContent}>
            Automated alerts should be configured for: CSAT drops below threshold, hallucination detection, uptime drops, escalation spikes, new uncovered topics, and volume anomalies. Alerts are routed by severity to appropriate team members.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName} | Generated: {date}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLOUT PLAN PDF
// ═══════════════════════════════════════════════════════════════════════════════

interface RolloutPlanData {
  companyName: string
  digitalEmployeeName: string
  launchCriteria: Array<{ content: string; structuredData: unknown }>
  testCases: Array<{
    id: string
    name: string
    type: string
    priority: string
    expectedResult: string
  }>
  kpis: Array<{ content: string; structuredData: unknown }>
  scopeItems: Array<{ description: string; classification: string }>
}

export function RolloutPlanPDF({ data }: { data: RolloutPlanData }) {
  const date = new Date().toISOString().split('T')[0]

  // Categorize launch criteria by phase
  const goNoGoCriteria: typeof data.launchCriteria = []
  const softLaunchCriteria: typeof data.launchCriteria = []
  const otherCriteria: typeof data.launchCriteria = []

  for (const lc of data.launchCriteria) {
    const sd = lc.structuredData as Record<string, string> | null
    const phase = sd?.phase?.toLowerCase() || ''
    if (phase.includes('go') || phase.includes('decision') || phase.includes('full')) {
      goNoGoCriteria.push(lc)
    } else if (phase.includes('soft') || phase.includes('pilot')) {
      softLaunchCriteria.push(lc)
    } else {
      otherCriteria.push(lc)
    }
  }

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Test & Rollout Plan</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>Testing Phases, Launch Criteria & Hypercare</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.testCases.length}</Text>
            <Text style={styles.metricLabel}>Test Cases</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.launchCriteria.length}</Text>
            <Text style={styles.metricLabel}>Launch Criteria</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.kpis.length}</Text>
            <Text style={styles.metricLabel}>KPIs Tracked</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>5</Text>
            <Text style={styles.metricLabel}>Testing Phases</Text>
          </View>
        </View>

        {/* Phase overview */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Testing Phases</Text>
          <Text style={styles.highlightContent}>
            Phase 1: Functional Testing (Engineering) → Phase 2: UAT (Client Team) → Phase 3: Staff Pilot (5-10 Staff) → Phase 4: Soft Launch (Limited Users) → Phase 5: Full Launch (All Users)
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Rollout Plan</Text>
        </View>
      </Page>

      {/* Launch Criteria & Go/No-Go */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Launch Criteria & Go/No-Go</Text>

        {/* Go/No-Go Checklist */}
        {data.launchCriteria.length > 0 ? (
          <>
            {goNoGoCriteria.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Go/No-Go Criteria</Text>
                {goNoGoCriteria.map((lc, idx) => {
                  const sd = lc.structuredData as Record<string, string> | null
                  return (
                    <View key={idx} style={[styles.card, styles.cardDanger]}>
                      <Text style={styles.cardTitle}>{sd?.criterion || `Criterion ${idx + 1}`}</Text>
                      <Text style={styles.cardContent}>{lc.content}</Text>
                      {sd?.owner && (
                        <Text style={[styles.cardContent, { marginTop: 4 }]}>Owner: {sd.owner}</Text>
                      )}
                    </View>
                  )
                })}
              </>
            )}

            {softLaunchCriteria.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Soft Launch Criteria</Text>
                {softLaunchCriteria.map((lc, idx) => {
                  const sd = lc.structuredData as Record<string, string> | null
                  return (
                    <View key={idx} style={[styles.card, styles.cardWarning]}>
                      <Text style={styles.cardTitle}>{sd?.criterion || `Criterion ${idx + 1}`}</Text>
                      <Text style={styles.cardContent}>{lc.content}</Text>
                      {sd?.threshold && (
                        <Text style={[styles.cardContent, { marginTop: 4 }]}>
                          Threshold: {sd.threshold}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </>
            )}

            {otherCriteria.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Additional Launch Criteria</Text>
                {otherCriteria.map((lc, idx) => (
                  <View key={idx} style={styles.card}>
                    <Text style={styles.cardContent}>{lc.content}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No launch criteria extracted yet.</Text>
          </View>
        )}

        {/* KPI Thresholds */}
        {data.kpis.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>KPI Thresholds by Phase</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>KPI</Text>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Soft Launch Target</Text>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Full Launch Target</Text>
              </View>
              {data.kpis.slice(0, 8).map((kpi, idx) => {
                const sd = kpi.structuredData as Record<string, string> | null
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>
                      {sd?.name || kpi.content.slice(0, 30)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '35%' }]}>{sd?.alertThreshold || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '35%' }]}>{sd?.target || '-'}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Hypercare & Risk */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Hypercare & Risk Management</Text>

        {/* Hypercare Protocol */}
        <Text style={styles.subsectionTitle}>Hypercare Protocol (4 Weeks Post-Launch)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Week</Text>
            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Activities</Text>
            <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Focus</Text>
          </View>
          {[
            { week: 'Week 1', activities: 'Daily review all conversations, immediate bugfixes, KB updates', focus: 'Stability & accuracy' },
            { week: 'Week 2', activities: 'Analyze Week 1 data, prompt tuning, KB expansion', focus: 'Optimization' },
            { week: 'Week 3', activities: 'Stability monitoring, staff training if needed', focus: 'Confidence building' },
            { week: 'Week 4', activities: 'Evaluate hypercare period, prepare for transition', focus: 'Handover readiness' },
          ].map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: '15%', fontWeight: 'bold' }]}>{row.week}</Text>
              <Text style={[styles.tableCell, { width: '50%' }]}>{row.activities}</Text>
              <Text style={[styles.tableCell, { width: '35%' }]}>{row.focus}</Text>
            </View>
          ))}
        </View>

        {/* Escalation SLAs */}
        <Text style={styles.subsectionTitle}>Escalation SLAs During Hypercare</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Priority</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Response</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Resolution</Text>
          </View>
          {[
            { priority: 'P1 - Critical', desc: 'Wrong info, security breach, outage', response: '1 hour', resolution: '4 hours' },
            { priority: 'P2 - High', desc: 'Feature degraded, flow broken', response: '4 hours', resolution: '1 business day' },
            { priority: 'P3 - Normal', desc: 'Cosmetic issues, minor gaps', response: '1 business day', resolution: 'Next release' },
          ].map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>{row.priority}</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>{row.desc}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{row.response}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{row.resolution}</Text>
            </View>
          ))}
        </View>

        {/* Kill Switch */}
        <Text style={styles.subsectionTitle}>Kill Switch</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Emergency Disable Procedure</Text>
          <Text style={styles.highlightContent}>
            1. Decision to disable (Immediate) → 2. Disable chat widget/routing (&lt;5 min) → 3. Notify stakeholders (&lt;15 min) → 4. Root cause analysis (&lt;2 hours) → 5. Fix and re-enable decision (Per severity)
          </Text>
          <Text style={[styles.highlightContent, { marginTop: 6 }]}>
            Activate when: Critical hallucination, security breach, consistently wrong information, or complete integration failure with no fallback.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName} | Generated: {date}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>
    </Document>
  )
}

export function TechnicalFoundationPDF({ data }: { data: TechnicalFoundationData }) {
  const date = new Date().toISOString().split('T')[0]

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverTop}>
          <View style={styles.coverAccent} />
          <Text style={styles.coverDocType}>Technical Foundation</Text>
          <Text style={styles.coverTitle}>{data.digitalEmployeeName}</Text>
          <Text style={styles.coverSubtitle}>Integrations & Technical Requirements</Text>
          <Text style={styles.coverCompany}>{data.companyName}</Text>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.integrations.length}</Text>
            <Text style={styles.metricLabel}>System Integrations</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.dataFields.length}</Text>
            <Text style={styles.metricLabel}>Data Fields</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.securityRequirements.length}</Text>
            <Text style={styles.metricLabel}>Security Reqs</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{data.apiEndpoints.length}</Text>
            <Text style={styles.metricLabel}>API Endpoints</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Technical Foundation</Text>
        </View>
      </Page>

      {/* System Integrations */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>System Integrations</Text>

        {data.integrations.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No integrations defined yet.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>System</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Purpose</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Auth</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Endpoint</Text>
            </View>
            {data.integrations.map((int, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{int.systemName}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{int.purpose || '-'}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{int.type || '-'}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{int.authMethod || '-'}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{int.endpoint || '-'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Data Fields */}
        {data.dataFields.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Data Fields</Text>
            <View style={styles.bulletList}>
              {data.dataFields.slice(0, 10).map((field, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{field.content}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* Security & Compliance */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Security & Compliance</Text>

        {/* Security Requirements */}
        {data.securityRequirements.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Security Requirements</Text>
            {data.securityRequirements.map((req, idx) => (
              <View key={idx} style={[styles.card, styles.cardWarning]}>
                <Text style={styles.cardContent}>{req.content}</Text>
              </View>
            ))}
          </>
        )}

        {/* Compliance Requirements */}
        {data.complianceRequirements.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Compliance Requirements</Text>
            {data.complianceRequirements.map((req, idx) => (
              <View key={idx} style={[styles.card, styles.cardDanger]}>
                <Text style={styles.cardContent}>{req.content}</Text>
              </View>
            ))}
          </>
        )}

        {/* API Endpoints */}
        {data.apiEndpoints.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>API Endpoints</Text>
            {data.apiEndpoints.map((api, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.cardContent}>{api.content}</Text>
              </View>
            ))}
          </>
        )}

        {data.securityRequirements.length === 0 &&
         data.complianceRequirements.length === 0 &&
         data.apiEndpoints.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardContent}>No security, compliance, or API requirements extracted yet.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {data.companyName} | Generated: {date}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>
    </Document>
  )
}
