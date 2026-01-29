/**
 * PDF Document Template
 *
 * Professional PDF template for DE Design documents using @react-pdf/renderer
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { DEDesignDocument } from './types'
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from './types'

// Register fonts (using system fonts)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
})

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: DOCUMENT_COLORS.white,
    padding: 40,
    fontFamily: 'Inter',
    fontSize: DOCUMENT_FONTS.body,
    color: DOCUMENT_COLORS.text,
  },
  // Cover page
  coverPage: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    backgroundColor: DOCUMENT_COLORS.white,
    padding: 60,
  },
  coverLogo: {
    width: 80,
    height: 80,
    backgroundColor: DOCUMENT_COLORS.primary,
    borderRadius: 16,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogoText: {
    fontSize: 32,
    color: DOCUMENT_COLORS.white,
    fontWeight: 700,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: DOCUMENT_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    color: DOCUMENT_COLORS.textLight,
    marginBottom: 40,
    textAlign: 'center',
  },
  coverMeta: {
    marginTop: 60,
    alignItems: 'center',
  },
  coverMetaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  coverMetaLabel: {
    fontSize: 10,
    color: DOCUMENT_COLORS.textLight,
    width: 80,
  },
  coverMetaValue: {
    fontSize: 10,
    color: DOCUMENT_COLORS.text,
    fontWeight: 500,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 600,
    color: DOCUMENT_COLORS.white,
  },
  // Headers
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_COLORS.border,
    paddingBottom: 10,
    marginBottom: 20,
  },
  pageHeaderTitle: {
    fontSize: 10,
    color: DOCUMENT_COLORS.textLight,
  },
  pageNumber: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: DOCUMENT_COLORS.primary,
  },
  sectionNumber: {
    backgroundColor: DOCUMENT_COLORS.primary,
    color: DOCUMENT_COLORS.white,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionNumberText: {
    fontSize: 12,
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: DOCUMENT_FONTS.heading1,
    fontWeight: 600,
    color: DOCUMENT_COLORS.text,
  },
  subsectionTitle: {
    fontSize: DOCUMENT_FONTS.heading2,
    fontWeight: 600,
    color: DOCUMENT_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  // Content
  paragraph: {
    fontSize: DOCUMENT_FONTS.body,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  bulletList: {
    marginLeft: 16,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 16,
    fontSize: DOCUMENT_FONTS.body,
    color: DOCUMENT_COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: DOCUMENT_FONTS.body,
    lineHeight: 1.5,
  },
  // Tables
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DOCUMENT_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: DOCUMENT_FONTS.small,
    fontWeight: 600,
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
    fontSize: DOCUMENT_FONTS.small,
    color: DOCUMENT_COLORS.text,
  },
  // Cards
  card: {
    backgroundColor: DOCUMENT_COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: DOCUMENT_COLORS.primary,
  },
  cardTitle: {
    fontSize: DOCUMENT_FONTS.body,
    fontWeight: 600,
    color: DOCUMENT_COLORS.text,
    marginBottom: 4,
  },
  cardContent: {
    fontSize: DOCUMENT_FONTS.small,
    color: DOCUMENT_COLORS.textLight,
    lineHeight: 1.5,
  },
  // Scope badges
  inScopeBadge: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
  },
  outScopeBadge: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
  },
  ambiguousBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600,
  },
  // Priority badges
  priorityCritical: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  priorityHigh: { backgroundColor: '#FFEDD5', color: '#9A3412' },
  priorityMedium: { backgroundColor: '#FEF3C7', color: '#92400E' },
  priorityLow: { backgroundColor: '#E0E7FF', color: '#3730A3' },
  // Process flow
  processStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DOCUMENT_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 600,
    color: DOCUMENT_COLORS.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: DOCUMENT_FONTS.body,
    fontWeight: 600,
    color: DOCUMENT_COLORS.text,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: DOCUMENT_FONTS.small,
    color: DOCUMENT_COLORS.textLight,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DOCUMENT_COLORS.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: DOCUMENT_COLORS.textLight,
  },
})

// Helper components
function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
    case 'PUBLISHED':
      return DOCUMENT_COLORS.success
    case 'IN_REVIEW':
      return DOCUMENT_COLORS.warning
    default:
      return DOCUMENT_COLORS.textLight
  }
}

// Main PDF component
export function DEDesignPDF({ data }: { data: DEDesignDocument }) {
  const { metadata, executiveSummary, stakeholders, businessContext, processDesign, scope, technicalRequirements, businessRules, testPlan } = data

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <View style={styles.coverLogo}>
            <Text style={styles.coverLogoText}>DE</Text>
          </View>
          <Text style={styles.coverTitle}>{metadata.title}</Text>
          <Text style={styles.coverSubtitle}>Digital Employee Design Document</Text>

          <View style={styles.coverMeta}>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Company:</Text>
              <Text style={styles.coverMetaValue}>{metadata.company}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>DE Name:</Text>
              <Text style={styles.coverMetaValue}>{metadata.digitalEmployeeName}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Version:</Text>
              <Text style={styles.coverMetaValue}>{metadata.version}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Date:</Text>
              <Text style={styles.coverMetaValue}>{metadata.date}</Text>
            </View>
            <View style={styles.coverMetaRow}>
              <Text style={styles.coverMetaLabel}>Author:</Text>
              <Text style={styles.coverMetaValue}>{metadata.author}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(metadata.status) }]}>
              <Text style={styles.statusText}>{metadata.status}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
          <Text style={styles.pageNumber}>Page 2</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader number={1} title="Executive Summary" />
          <Text style={styles.paragraph}>{executiveSummary.overview}</Text>

          <Text style={styles.subsectionTitle}>Key Objectives</Text>
          <BulletList items={executiveSummary.keyObjectives} />

          {executiveSummary.timeline && (
            <>
              <Text style={styles.subsectionTitle}>Timeline</Text>
              <Text style={styles.paragraph}>{executiveSummary.timeline}</Text>
            </>
          )}
        </View>

        {/* Stakeholders */}
        <View style={styles.section}>
          <SectionHeader number={2} title="Stakeholders" />
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Role</Text>
              <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Contact</Text>
            </View>
            {stakeholders.map((stakeholder, index) => (
              <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, { width: '30%', fontWeight: stakeholder.isKeyDecisionMaker ? 600 : 400 }]}>
                  {stakeholder.name}{stakeholder.isKeyDecisionMaker ? ' ★' : ''}
                </Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>{stakeholder.role}</Text>
                <Text style={[styles.tableCell, { width: '40%' }]}>{stakeholder.email || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Generated by Freeday OCC</Text>
        </View>
      </Page>

      {/* Business Context */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
          <Text style={styles.pageNumber}>Page 3</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader number={3} title="Business Context" />

          {/* Goals */}
          <Text style={styles.subsectionTitle}>Goals & Objectives</Text>
          {businessContext.goals.map((goal, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardTitle}>{goal.title}</Text>
              <Text style={styles.cardContent}>{goal.description}</Text>
            </View>
          ))}

          {/* KPIs */}
          {businessContext.kpis.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Key Performance Indicators</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '40%' }]}>KPI</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Target</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Frequency</Text>
                </View>
                {businessContext.kpis.map((kpi, index) => (
                  <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{kpi.name}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{kpi.frequency || '-'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Volumes */}
          {businessContext.volumes.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Volume Expectations</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Metric</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Value</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Period</Text>
                </View>
                {businessContext.volumes.map((volume, index) => (
                  <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{volume.metric}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{volume.value}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{volume.period}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Generated by Freeday OCC</Text>
        </View>
      </Page>

      {/* Process Design */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
          <Text style={styles.pageNumber}>Page 4</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader number={4} title="Process Design" />

          <Text style={styles.subsectionTitle}>To-Be Process Flow</Text>
          {processDesign.toBeSteps.map((step, index) => (
            <View key={index} style={styles.processStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.name}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                {step.owner && (
                  <Text style={[styles.stepDescription, { marginTop: 2 }]}>Owner: {step.owner}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Exceptions */}
          {processDesign.exceptions.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Exception Handling</Text>
              {processDesign.exceptions.map((exception, index) => (
                <View key={index} style={[styles.card, { borderLeftColor: DOCUMENT_COLORS.warning }]}>
                  <Text style={styles.cardTitle}>{exception.name}</Text>
                  <Text style={styles.cardContent}>{exception.description}</Text>
                  <Text style={[styles.cardContent, { marginTop: 4 }]}>Handling: {exception.handling}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Generated by Freeday OCC</Text>
        </View>
      </Page>

      {/* Scope */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
          <Text style={styles.pageNumber}>Page 5</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader number={5} title="Scope Definition" />

          {/* In Scope */}
          <Text style={styles.subsectionTitle}>In Scope</Text>
          {scope.inScope.map((item, index) => (
            <View key={index} style={[styles.card, { borderLeftColor: DOCUMENT_COLORS.success }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.inScopeBadge}>IN SCOPE</Text>
                {item.skill && (
                  <Text style={[styles.cardContent, { marginLeft: 8 }]}>Skill: {item.skill}</Text>
                )}
              </View>
              <Text style={styles.cardContent}>{item.description}</Text>
              {item.conditions && (
                <Text style={[styles.cardContent, { marginTop: 2, fontStyle: 'italic' }]}>
                  Conditions: {item.conditions}
                </Text>
              )}
            </View>
          ))}

          {/* Out of Scope */}
          {scope.outOfScope.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Out of Scope</Text>
              {scope.outOfScope.map((item, index) => (
                <View key={index} style={[styles.card, { borderLeftColor: DOCUMENT_COLORS.danger }]}>
                  <Text style={styles.outScopeBadge}>OUT OF SCOPE</Text>
                  <Text style={[styles.cardContent, { marginTop: 4 }]}>{item.description}</Text>
                  {item.notes && (
                    <Text style={[styles.cardContent, { marginTop: 2, fontStyle: 'italic' }]}>
                      Note: {item.notes}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {/* Guardrails */}
          {scope.guardrails.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Guardrails</Text>
              {scope.guardrails.map((guardrail, index) => (
                <View key={index} style={[styles.card, { borderLeftColor: guardrail.type === 'NEVER' ? DOCUMENT_COLORS.danger : DOCUMENT_COLORS.warning }]}>
                  <Text style={styles.cardTitle}>{guardrail.type}</Text>
                  <Text style={styles.cardContent}>{guardrail.description}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Generated by Freeday OCC</Text>
        </View>
      </Page>

      {/* Technical Requirements */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
          <Text style={styles.pageNumber}>Page 6</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader number={6} title="Technical Requirements" />

          {/* Integrations */}
          <Text style={styles.subsectionTitle}>System Integrations</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>System</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Purpose</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Connection</Text>
              <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Notes</Text>
            </View>
            {technicalRequirements.integrations.map((integration, index) => (
              <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 500 }]}>{integration.systemName}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{integration.purpose}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{integration.connectionType}</Text>
                <Text style={[styles.tableCell, { width: '35%' }]}>{integration.notes || '-'}</Text>
              </View>
            ))}
          </View>

          {/* Security Requirements */}
          {technicalRequirements.securityRequirements && technicalRequirements.securityRequirements.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Security Requirements</Text>
              <BulletList items={technicalRequirements.securityRequirements} />
            </>
          )}
        </View>

        {/* Business Rules */}
        {businessRules.length > 0 && (
          <View style={styles.section}>
            <SectionHeader number={7} title="Business Rules" />
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Rule</Text>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Condition</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Action</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Priority</Text>
              </View>
              {businessRules.map((rule, index) => (
                <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                  <Text style={[styles.tableCell, { width: '25%', fontWeight: 500 }]}>{rule.name}</Text>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{rule.condition}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{rule.action}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{rule.priority}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Generated by Freeday OCC</Text>
        </View>
      </Page>

      {/* Test Plan */}
      {testPlan && testPlan.testCases.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} - Design Document</Text>
            <Text style={styles.pageNumber}>Page 7</Text>
          </View>

          <View style={styles.section}>
            <SectionHeader number={8} title="Test Plan" />

            {/* Coverage Summary */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={[styles.card, { flex: 1, marginRight: 8, borderLeftColor: DOCUMENT_COLORS.primary }]}>
                <Text style={styles.cardTitle}>{testPlan.coverageSummary.total}</Text>
                <Text style={styles.cardContent}>Total Test Cases</Text>
              </View>
              <View style={[styles.card, { flex: 1, marginRight: 8, borderLeftColor: DOCUMENT_COLORS.success }]}>
                <Text style={styles.cardTitle}>{testPlan.coverageSummary.covered}</Text>
                <Text style={styles.cardContent}>Covered</Text>
              </View>
              <View style={[styles.card, { flex: 1, borderLeftColor: DOCUMENT_COLORS.warning }]}>
                <Text style={styles.cardTitle}>{testPlan.coverageSummary.partial + testPlan.coverageSummary.missing}</Text>
                <Text style={styles.cardContent}>Needs Attention</Text>
              </View>
            </View>

            {/* Test Cases */}
            <Text style={styles.subsectionTitle}>Test Cases</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Name</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { width: '45%' }]}>Expected Result</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Priority</Text>
              </View>
              {testPlan.testCases.slice(0, 15).map((testCase, index) => (
                <View key={index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                  <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{testCase.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{testCase.type}</Text>
                  <Text style={[styles.tableCell, { width: '45%' }]}>{testCase.expectedResult}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{testCase.priority}</Text>
                </View>
              ))}
            </View>
            {testPlan.testCases.length > 15 && (
              <Text style={[styles.cardContent, { textAlign: 'center', marginTop: 8 }]}>
                ... and {testPlan.testCases.length - 15} more test cases
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
            <Text style={styles.footerText}>Generated by Freeday OCC</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}
