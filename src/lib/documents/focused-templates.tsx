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
