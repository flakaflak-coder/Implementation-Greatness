/**
 * Professional PDF Document Template
 *
 * Comprehensive, client-facing PDF template for DE Design documents
 * Designed to create a "WOW" factor with extensive narratives and professional presentation
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { DEDesignDocument, GeneratedDocumentContent } from './types'
import { DOCUMENT_COLORS, DOCUMENT_FONTS } from './types'

// Enhanced styles for professional presentation
const styles = StyleSheet.create({
  // Base page
  page: {
    flexDirection: 'column',
    backgroundColor: DOCUMENT_COLORS.white,
    padding: 50,
    paddingBottom: 70,
    fontFamily: 'Helvetica',
    fontSize: DOCUMENT_FONTS.body,
    color: DOCUMENT_COLORS.text,
  },

  // Cover page styles
  coverPage: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    backgroundColor: DOCUMENT_COLORS.white,
    padding: 0,
  },
  coverTop: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 120,
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
    fontSize: 36,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 400,
  },
  coverSubtitle: {
    fontSize: 16,
    color: DOCUMENT_COLORS.textLight,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverCompany: {
    fontSize: 14,
    color: DOCUMENT_COLORS.primary,
    fontWeight: 'bold',
    marginTop: 20,
  },
  coverBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: DOCUMENT_COLORS.border,
    paddingTop: 20,
    marginTop: 'auto',
  },
  coverMeta: {
    flexDirection: 'column',
  },
  coverMetaLabel: {
    fontSize: 8,
    color: DOCUMENT_COLORS.textLight,
    marginBottom: 2,
  },
  coverMetaValue: {
    fontSize: 10,
    color: DOCUMENT_COLORS.text,
  },
  coverStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  coverStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.white,
  },

  // Page header & footer
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_COLORS.border,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderAccent: {
    width: 3,
    height: 20,
    backgroundColor: DOCUMENT_COLORS.primary,
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
  },
  pageNumber: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
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

  // Section styles
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: DOCUMENT_COLORS.primary,
  },
  sectionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.primary,
    marginRight: 12,
    minWidth: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_COLORS.border,
  },

  // Content styles
  paragraph: {
    fontSize: 10,
    lineHeight: 1.7,
    marginBottom: 12,
    textAlign: 'justify',
  },
  paragraphLarge: {
    fontSize: 11,
    lineHeight: 1.7,
    marginBottom: 14,
    textAlign: 'justify',
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: DOCUMENT_COLORS.primary,
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 30,
    lineHeight: 1.6,
  },
  bulletList: {
    marginLeft: 15,
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 15,
    fontSize: 10,
    color: DOCUMENT_COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.6,
  },

  // Card styles
  card: {
    backgroundColor: DOCUMENT_COLORS.background,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 9,
    color: DOCUMENT_COLORS.primary,
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
    lineHeight: 1.5,
  },

  // Table styles
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: DOCUMENT_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt: {
    backgroundColor: DOCUMENT_COLORS.background,
  },
  tableCell: {
    fontSize: 9,
    color: DOCUMENT_COLORS.text,
    lineHeight: 1.4,
  },

  // Special styles
  highlightBox: {
    backgroundColor: '#EEF2FF', // Light indigo
    borderRadius: 8,
    padding: 16,
    marginVertical: 15,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.primary,
    marginBottom: 8,
  },
  highlightContent: {
    fontSize: 10,
    lineHeight: 1.6,
    color: DOCUMENT_COLORS.text,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
  },
  metricItem: {
    width: '48%',
    marginBottom: 10,
    marginRight: '2%',
    padding: 12,
    backgroundColor: DOCUMENT_COLORS.background,
    borderRadius: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.primary,
  },
  metricLabel: {
    fontSize: 8,
    color: DOCUMENT_COLORS.textLight,
    marginTop: 2,
  },

  // Risk matrix styles
  riskBadgeLow: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  riskBadgeMedium: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  riskBadgeHigh: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Phase timeline
  phaseContainer: {
    marginVertical: 15,
  },
  phaseItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  phaseNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DOCUMENT_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.white,
  },
  phaseContent: {
    flex: 1,
    paddingTop: 4,
  },
  phaseName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 9,
    color: DOCUMENT_COLORS.textLight,
    lineHeight: 1.5,
    marginBottom: 6,
  },

  // TOC styles
  tocContainer: {
    marginTop: 60,
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DOCUMENT_COLORS.text,
    marginBottom: 30,
    textAlign: 'center',
  },
  tocItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  tocNumber: {
    width: 25,
    fontSize: 10,
    color: DOCUMENT_COLORS.primary,
    fontWeight: 'bold',
  },
  tocText: {
    flex: 1,
    fontSize: 10,
    color: DOCUMENT_COLORS.text,
  },
  tocPage: {
    fontSize: 10,
    color: DOCUMENT_COLORS.textLight,
  },
  tocDots: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_COLORS.border,
    borderStyle: 'dotted',
    marginHorizontal: 8,
    marginBottom: 4,
  },
})

// Helper components
function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNumber}>{number.toString().padStart(2, '0')}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null
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

function getRiskBadgeStyle(level: string) {
  switch (level) {
    case 'Low':
      return styles.riskBadgeLow
    case 'High':
      return styles.riskBadgeHigh
    default:
      return styles.riskBadgeMedium
  }
}

// Main PDF component
export function DEDesignPDF({ data }: { data: DEDesignDocument }) {
  const { metadata, stakeholders, businessContext, processDesign, scope, technicalRequirements, businessRules, testPlan } = data
  const gen = data._generated as GeneratedDocumentContent | undefined

  let pageNum = 1

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* COVER PAGE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={[styles.page, { padding: 50 }]}>
        <View style={styles.coverPage}>
          <View style={styles.coverTop}>
            <View style={styles.coverAccent} />
            <Text style={styles.coverDocType}>Digital Employee Design Document</Text>
            <Text style={styles.coverTitle}>{metadata.digitalEmployeeName}</Text>
            <Text style={styles.coverSubtitle}>Comprehensive Design Specification</Text>
            <Text style={styles.coverCompany}>{metadata.company}</Text>
          </View>

          <View style={styles.coverBottom}>
            <View style={styles.coverMeta}>
              <Text style={styles.coverMetaLabel}>VERSION</Text>
              <Text style={styles.coverMetaValue}>{metadata.version}</Text>
            </View>
            <View style={styles.coverMeta}>
              <Text style={styles.coverMetaLabel}>DATE</Text>
              <Text style={styles.coverMetaValue}>{metadata.date}</Text>
            </View>
            <View style={styles.coverMeta}>
              <Text style={styles.coverMetaLabel}>PREPARED BY</Text>
              <Text style={styles.coverMetaValue}>{metadata.author}</Text>
            </View>
            <View style={[styles.coverStatus, { backgroundColor: getStatusColor(metadata.status) }]}>
              <Text style={styles.coverStatusText}>{metadata.status}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TABLE OF CONTENTS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.tocContainer}>
          <Text style={styles.tocTitle}>Contents</Text>

          {[
            { num: '', title: 'Executive One-Pager', page: '3' },
            { num: '01', title: 'Executive Summary', page: '4' },
            { num: '02', title: 'Current State Analysis', page: '6' },
            { num: '03', title: 'Future State Vision', page: '8' },
            { num: '04', title: 'Process Design', page: '10' },
            { num: '05', title: 'Scope & Boundaries', page: '13' },
            { num: '06', title: 'Technical Foundation', page: '15' },
            { num: '07', title: 'Risk Assessment', page: '17' },
            { num: '08', title: 'Implementation Approach & Training', page: '18' },
            { num: '09', title: 'Success Metrics', page: '21' },
            { num: '10', title: 'Conclusion & Next Steps', page: '22' },
            { num: '', title: 'Quick Reference Card', page: '23' },
            { num: '', title: 'Appendix: Test Plan', page: '24' },
          ].map((item, idx) => (
            <View key={idx} style={styles.tocItem}>
              <Text style={styles.tocNumber}>{item.num}</Text>
              <Text style={styles.tocText}>{item.title}</Text>
              <View style={styles.tocDots} />
              <Text style={styles.tocPage}>{item.page}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE ONE-PAGER (Standalone summary for leadership) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {gen?.executiveOnePager && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={styles.pageHeaderAccent} />
              <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Executive One-Pager</Text>
            </View>
            <Text style={styles.pageNumber}>Page 3</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 20 }]}>
              Executive One-Pager
            </Text>

            {/* Headline */}
            <Text style={[styles.quote, { marginBottom: 25 }]}>
              {gen.executiveOnePager.headline}
            </Text>

            {/* Problem & Solution */}
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
              <View style={[styles.card, styles.cardWarning, { flex: 1 }]}>
                <Text style={styles.cardTitle}>The Challenge</Text>
                <Text style={styles.cardContent}>{gen.executiveOnePager.problem}</Text>
              </View>
              <View style={[styles.card, styles.cardSuccess, { flex: 1 }]}>
                <Text style={styles.cardTitle}>The Solution</Text>
                <Text style={styles.cardContent}>{gen.executiveOnePager.solution}</Text>
              </View>
            </View>

            {/* Key Benefits */}
            <Text style={styles.subsectionTitle}>Key Benefits & Metrics</Text>
            <View style={styles.metricGrid}>
              {gen.executiveOnePager.keyBenefits.slice(0, 6).map((b, idx) => (
                <View key={idx} style={styles.metricItem}>
                  <Text style={styles.metricValue}>{b.metric}</Text>
                  <Text style={styles.metricLabel}>{b.benefit}</Text>
                </View>
              ))}
            </View>

            {/* Timeline & Investment */}
            <View style={{ flexDirection: 'row', gap: 15, marginTop: 15 }}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitle}>Timeline</Text>
                <Text style={styles.cardContent}>{gen.executiveOnePager.timeline}</Text>
              </View>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitle}>Investment</Text>
                <Text style={styles.cardContent}>{gen.executiveOnePager.investment}</Text>
              </View>
            </View>

            {/* Bottom Line */}
            <View style={[styles.highlightBox, { marginTop: 20 }]}>
              <Text style={styles.highlightTitle}>The Bottom Line</Text>
              <Text style={styles.highlightContent}>{gen.executiveOnePager.bottomLine}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
            <Text style={styles.footerText}>Page 3</Text>
          </View>
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: EXECUTIVE SUMMARY */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page {gen?.executiveOnePager ? 4 : 3}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={1} title="Executive Summary" />

          {/* Opening statement */}
          {gen?.executiveSummary?.opening && (
            <Text style={styles.quote}>"{gen.executiveSummary.opening}"</Text>
          )}

          {/* Overview */}
          {gen?.executiveSummary?.overview ? (
            <Text style={styles.paragraphLarge}>{gen.executiveSummary.overview}</Text>
          ) : (
            <Text style={styles.paragraph}>
              This document outlines the comprehensive design specifications for {metadata.digitalEmployeeName},
              a Digital Employee being implemented for {metadata.company}.
            </Text>
          )}

          {/* Value Proposition */}
          {gen?.executiveSummary?.valueProposition && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Value Proposition</Text>
              <Text style={styles.highlightContent}>{gen.executiveSummary.valueProposition}</Text>
            </View>
          )}

          {/* Key Objectives */}
          <Text style={styles.subsectionTitle}>Key Objectives</Text>
          <BulletList items={gen?.executiveSummary?.keyObjectives || businessContext.goals.map(g => g.title)} />

          {/* Expected Outcomes */}
          {gen?.executiveSummary?.expectedOutcomes && gen.executiveSummary.expectedOutcomes.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Expected Outcomes</Text>
              <View style={styles.metricGrid}>
                {gen.executiveSummary.expectedOutcomes.slice(0, 6).map((outcome, idx) => (
                  <View key={idx} style={styles.metricItem}>
                    <Text style={styles.bulletText}>{outcome}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>

      {/* Executive Summary continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Executive Summary</Text>
          </View>
          <Text style={styles.pageNumber}>Page 4</Text>
        </View>

        {/* Stakeholders summary */}
        <View style={styles.sectionContainer}>
          <Text style={styles.subsectionTitle}>Project Stakeholders</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Role</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Contact</Text>
            </View>
            {stakeholders.slice(0, 8).map((s, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { width: '35%', fontWeight: s.isKeyDecisionMaker ? 'bold' : 'normal' }]}>
                  {s.name}{s.isKeyDecisionMaker ? ' ★' : ''}
                </Text>
                <Text style={[styles.tableCell, { width: '35%' }]}>{s.role}</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>{s.email || '-'}</Text>
              </View>
            ))}
          </View>

          {/* Business metrics */}
          <Text style={styles.subsectionTitle}>Business Metrics Overview</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Goals Defined</Text>
              <Text style={styles.metricValue}>{businessContext.goals.length}</Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>KPIs Tracked</Text>
              <Text style={styles.metricValue}>{businessContext.kpis.length}</Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Process Steps</Text>
              <Text style={styles.metricValue}>{processDesign.toBeSteps.length}</Text>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Integrations</Text>
              <Text style={styles.metricValue}>{technicalRequirements.integrations.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 4</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: CURRENT STATE ANALYSIS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 5</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={2} title="Current State Analysis" />

          {gen?.currentStateAnalysis?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.currentStateAnalysis.introduction}</Text>
          )}

          {/* Challenges */}
          {gen?.currentStateAnalysis?.challenges && gen.currentStateAnalysis.challenges.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Key Challenges Identified</Text>
              {gen.currentStateAnalysis.challenges.map((c, idx) => (
                <View key={idx} style={[styles.card, styles.cardWarning]}>
                  <Text style={styles.cardTitle}>{c.challenge}</Text>
                  <Text style={styles.cardContent}>Impact: {c.impact}</Text>
                  <Text style={styles.cardContent}>Frequency: {c.frequency}</Text>
                </View>
              ))}
            </>
          )}

          {/* Inefficiencies */}
          {gen?.currentStateAnalysis?.inefficiencies && (
            <>
              <Text style={styles.subsectionTitle}>Process Inefficiencies</Text>
              <Text style={styles.paragraph}>{gen.currentStateAnalysis.inefficiencies}</Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 5</Text>
        </View>
      </Page>

      {/* Current State continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Current State Analysis</Text>
          </View>
          <Text style={styles.pageNumber}>Page 6</Text>
        </View>

        <View style={styles.sectionContainer}>
          {/* Opportunity Cost */}
          {gen?.currentStateAnalysis?.opportunityCost && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>The Cost of Status Quo</Text>
              <Text style={styles.highlightContent}>{gen.currentStateAnalysis.opportunityCost}</Text>
            </View>
          )}

          {/* Volume context */}
          {businessContext.volumes.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Current Volume Metrics</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Metric</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Volume</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Period</Text>
                </View>
                {businessContext.volumes.map((v, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '40%' }]}>{v.metric}</Text>
                    <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>{v.value}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{v.period}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 6</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: FUTURE STATE VISION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 7</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={3} title="Future State Vision" />

          {gen?.futureStateVision?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.futureStateVision.introduction}</Text>
          )}

          {gen?.futureStateVision?.transformationNarrative && (
            <>
              <Text style={styles.subsectionTitle}>The Transformation</Text>
              <Text style={styles.paragraph}>{gen.futureStateVision.transformationNarrative}</Text>
            </>
          )}

          {/* Day in the life */}
          {gen?.futureStateVision?.dayInTheLife && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>A Day in the Life</Text>
              <Text style={styles.highlightContent}>{gen.futureStateVision.dayInTheLife}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 7</Text>
        </View>
      </Page>

      {/* Future State benefits */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Future State Vision</Text>
          </View>
          <Text style={styles.pageNumber}>Page 8</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.subsectionTitle}>Expected Benefits</Text>
          {gen?.futureStateVision?.benefits && gen.futureStateVision.benefits.length > 0 ? (
            gen.futureStateVision.benefits.map((b, idx) => (
              <View key={idx} style={[styles.card, styles.cardSuccess]}>
                <Text style={styles.cardTitle}>{b.benefit}</Text>
                <Text style={styles.cardContent}>{b.description}</Text>
                {b.metric && (
                  <Text style={[styles.cardSubtitle, { marginTop: 6 }]}>Measured by: {b.metric}</Text>
                )}
              </View>
            ))
          ) : (
            businessContext.goals.map((g, idx) => (
              <View key={idx} style={[styles.card, styles.cardSuccess]}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Text style={styles.cardContent}>{g.description}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 8</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: PROCESS DESIGN */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 9</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={4} title="Process Design" />

          {gen?.processAnalysis?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.processAnalysis.introduction}</Text>
          )}

          {gen?.processAnalysis?.processOverview && (
            <>
              <Text style={styles.subsectionTitle}>Process Overview</Text>
              <Text style={styles.paragraph}>{gen.processAnalysis.processOverview}</Text>
            </>
          )}

          {/* Process Flow Summary */}
          {gen?.processFlowSummary && (
            <>
              <View style={[styles.highlightBox, { marginBottom: 15 }]}>
                <Text style={styles.highlightTitle}>Happy Path Flow</Text>
                <Text style={styles.highlightContent}>{gen.processFlowSummary.happyPathFlow}</Text>
                {gen.processFlowSummary.escalationFlow && (
                  <>
                    <Text style={[styles.highlightTitle, { marginTop: 12 }]}>Escalation Path</Text>
                    <Text style={styles.highlightContent}>{gen.processFlowSummary.escalationFlow}</Text>
                  </>
                )}
              </View>

              {/* Decision Points */}
              {gen.processFlowSummary.decisionPoints && gen.processFlowSummary.decisionPoints.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Key Decision Points</Text>
                  {gen.processFlowSummary.decisionPoints.map((dp, idx) => (
                    <View key={idx} style={[styles.card, styles.cardWarning, { marginBottom: 8 }]}>
                      <Text style={styles.cardTitle}>{dp.point}</Text>
                      <Text style={styles.cardContent}>Criteria: {dp.criteria}</Text>
                      <View style={{ marginTop: 6 }}>
                        {dp.options.map((opt, i) => (
                          <Text key={i} style={styles.cardContent}>→ {opt}</Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {/* Process steps */}
          <Text style={styles.subsectionTitle}>Process Flow</Text>
          <View style={styles.phaseContainer}>
            {processDesign.toBeSteps.slice(0, 6).map((step, idx) => (
              <View key={idx} style={styles.phaseItem}>
                <View style={styles.phaseNumber}>
                  <Text style={styles.phaseNumberText}>{step.stepNumber}</Text>
                </View>
                <View style={styles.phaseContent}>
                  <Text style={styles.phaseName}>{step.name}</Text>
                  <Text style={styles.phaseDescription}>{step.description}</Text>
                  {step.owner && (
                    <Text style={[styles.phaseDescription, { fontStyle: 'italic' }]}>Owner: {step.owner}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 9</Text>
        </View>
      </Page>

      {/* Process Design continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Process Design</Text>
          </View>
          <Text style={styles.pageNumber}>Page 10</Text>
        </View>

        <View style={styles.sectionContainer}>
          {gen?.processAnalysis?.stepByStepNarrative && (
            <>
              <Text style={styles.subsectionTitle}>Detailed Process Narrative</Text>
              <Text style={styles.paragraph}>{gen.processAnalysis.stepByStepNarrative}</Text>
            </>
          )}

          {gen?.processAnalysis?.automationBenefits && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Automation Benefits</Text>
              <Text style={styles.highlightContent}>{gen.processAnalysis.automationBenefits}</Text>
            </View>
          )}

          {/* Exception handling */}
          {processDesign.exceptions.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Exception Handling</Text>
              {gen?.processAnalysis?.exceptionHandlingApproach && (
                <Text style={styles.paragraph}>{gen.processAnalysis.exceptionHandlingApproach}</Text>
              )}
              {processDesign.exceptions.slice(0, 4).map((exc, idx) => (
                <View key={idx} style={[styles.card, styles.cardWarning]}>
                  <Text style={styles.cardTitle}>{exc.name}</Text>
                  <Text style={styles.cardContent}>{exc.description}</Text>
                  <Text style={[styles.cardContent, { marginTop: 4 }]}>Resolution: {exc.handling}</Text>
                </View>
              ))}
            </>
          )}

          {gen?.processAnalysis?.humanMachineCollaboration && (
            <>
              <Text style={styles.subsectionTitle}>Human-Machine Collaboration</Text>
              <Text style={styles.paragraph}>{gen.processAnalysis.humanMachineCollaboration}</Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 10</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: SCOPE & BOUNDARIES */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 11</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={5} title="Scope & Boundaries" />

          {gen?.scopeAnalysis?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.scopeAnalysis.introduction}</Text>
          )}

          {/* In Scope */}
          <Text style={styles.subsectionTitle}>In Scope</Text>
          {gen?.scopeAnalysis?.inScopeRationale && (
            <Text style={styles.paragraph}>{gen.scopeAnalysis.inScopeRationale}</Text>
          )}
          {scope.inScope.slice(0, 6).map((item, idx) => (
            <View key={idx} style={[styles.card, styles.cardSuccess]}>
              <Text style={styles.cardContent}>{item.description}</Text>
              {item.skill && <Text style={styles.cardSubtitle}>Skill: {item.skill}</Text>}
              {item.conditions && (
                <Text style={[styles.cardContent, { fontStyle: 'italic', marginTop: 4 }]}>
                  Conditions: {item.conditions}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 11</Text>
        </View>
      </Page>

      {/* Scope continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Scope & Boundaries</Text>
          </View>
          <Text style={styles.pageNumber}>Page 12</Text>
        </View>

        <View style={styles.sectionContainer}>
          {/* Out of Scope */}
          {scope.outOfScope.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Out of Scope</Text>
              {gen?.scopeAnalysis?.outOfScopeRationale && (
                <Text style={styles.paragraph}>{gen.scopeAnalysis.outOfScopeRationale}</Text>
              )}
              {scope.outOfScope.slice(0, 5).map((item, idx) => (
                <View key={idx} style={[styles.card, styles.cardDanger]}>
                  <Text style={styles.cardContent}>{item.description}</Text>
                  {item.notes && (
                    <Text style={[styles.cardContent, { fontStyle: 'italic', marginTop: 4 }]}>
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
              <Text style={styles.subsectionTitle}>Operational Guardrails</Text>
              {gen?.scopeAnalysis?.guardrailsExplanation && (
                <Text style={styles.paragraph}>{gen.scopeAnalysis.guardrailsExplanation}</Text>
              )}
              {scope.guardrails.map((g, idx) => (
                <View key={idx} style={[styles.card, g.type === 'NEVER' ? styles.cardDanger : styles.cardWarning]}>
                  <Text style={styles.cardTitle}>{g.type}</Text>
                  <Text style={styles.cardContent}>{g.description}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 12</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: TECHNICAL FOUNDATION */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 13</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={6} title="Technical Foundation" />

          {gen?.technicalFoundation?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.technicalFoundation.introduction}</Text>
          )}

          {gen?.technicalFoundation?.architectureOverview && (
            <>
              <Text style={styles.subsectionTitle}>Architecture Overview</Text>
              <Text style={styles.paragraph}>{gen.technicalFoundation.architectureOverview}</Text>
            </>
          )}

          {/* Integrations */}
          <Text style={styles.subsectionTitle}>System Integrations</Text>
          {gen?.technicalFoundation?.integrationStrategy && (
            <Text style={styles.paragraph}>{gen.technicalFoundation.integrationStrategy}</Text>
          )}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>System</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Purpose</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Connection</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Notes</Text>
            </View>
            {technicalRequirements.integrations.map((int, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{int.systemName}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{int.purpose}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{int.connectionType}</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>{int.notes || '-'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 13</Text>
        </View>
      </Page>

      {/* Technical continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Technical Foundation</Text>
          </View>
          <Text style={styles.pageNumber}>Page 14</Text>
        </View>

        <View style={styles.sectionContainer}>
          {gen?.technicalFoundation?.dataFlowNarrative && (
            <>
              <Text style={styles.subsectionTitle}>Data Flow</Text>
              <Text style={styles.paragraph}>{gen.technicalFoundation.dataFlowNarrative}</Text>
            </>
          )}

          {gen?.technicalFoundation?.securityApproach && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Security & Compliance</Text>
              <Text style={styles.highlightContent}>{gen.technicalFoundation.securityApproach}</Text>
            </View>
          )}

          {/* Security requirements list */}
          {technicalRequirements.securityRequirements && technicalRequirements.securityRequirements.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Security Requirements</Text>
              <BulletList items={technicalRequirements.securityRequirements} />
            </>
          )}

          {/* Business rules */}
          {businessRules.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Business Rules</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Rule</Text>
                  <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Condition</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Action</Text>
                  <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Priority</Text>
                </View>
                {businessRules.slice(0, 6).map((rule, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{rule.name}</Text>
                    <Text style={[styles.tableCell, { width: '35%' }]}>{rule.condition}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{rule.action}</Text>
                    <Text style={[styles.tableCell, { width: '10%' }]}>{rule.priority}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 14</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7: RISK ASSESSMENT */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 15</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={7} title="Risk Assessment" />

          {gen?.riskAssessment?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.riskAssessment.introduction}</Text>
          )}

          {/* Risk table */}
          {gen?.riskAssessment?.risks && gen.riskAssessment.risks.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Identified Risks & Mitigations</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Risk</Text>
                  <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Likelihood</Text>
                  <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Impact</Text>
                  <Text style={[styles.tableHeaderCell, { width: '46%' }]}>Mitigation Strategy</Text>
                </View>
                {gen.riskAssessment.risks.map((risk, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>{risk.risk}</Text>
                    <View style={{ width: '12%' }}>
                      <Text style={getRiskBadgeStyle(risk.likelihood)}>{risk.likelihood}</Text>
                    </View>
                    <View style={{ width: '12%' }}>
                      <Text style={getRiskBadgeStyle(risk.impact)}>{risk.impact}</Text>
                    </View>
                    <Text style={[styles.tableCell, { width: '46%' }]}>{risk.mitigation}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {gen?.riskAssessment?.overallRiskPosture && (
            <View style={[styles.highlightBox, { marginTop: 20 }]}>
              <Text style={styles.highlightTitle}>Overall Risk Assessment</Text>
              <Text style={styles.highlightContent}>{gen.riskAssessment.overallRiskPosture}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 15</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 8: IMPLEMENTATION APPROACH */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 16</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={8} title="Implementation Approach" />

          {gen?.implementationApproach?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.implementationApproach.introduction}</Text>
          )}

          {/* Phases */}
          {gen?.implementationApproach?.phases && gen.implementationApproach.phases.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Implementation Phases</Text>
              <View style={styles.phaseContainer}>
                {gen.implementationApproach.phases.map((phase, idx) => (
                  <View key={idx} style={styles.phaseItem}>
                    <View style={styles.phaseNumber}>
                      <Text style={styles.phaseNumberText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.phaseContent}>
                      <Text style={styles.phaseName}>{phase.phase}</Text>
                      <Text style={styles.phaseDescription}>{phase.description}</Text>
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <View style={{ marginTop: 6 }}>
                          <Text style={[styles.phaseDescription, { fontWeight: 'bold' }]}>Deliverables:</Text>
                          {phase.deliverables.map((d, i) => (
                            <Text key={i} style={styles.phaseDescription}>• {d}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 16</Text>
        </View>
      </Page>

      {/* Implementation continued */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Implementation Approach</Text>
          </View>
          <Text style={styles.pageNumber}>Page 17</Text>
        </View>

        <View style={styles.sectionContainer}>
          {/* Success factors */}
          {gen?.implementationApproach?.successFactors && gen.implementationApproach.successFactors.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Critical Success Factors</Text>
              <BulletList items={gen.implementationApproach.successFactors} />
            </>
          )}

          {/* Change management */}
          {gen?.implementationApproach?.changeManagement && (
            <>
              <Text style={styles.subsectionTitle}>Change Management</Text>
              <Text style={styles.paragraph}>{gen.implementationApproach.changeManagement}</Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 19</Text>
        </View>
      </Page>

      {/* Training Plan Page */}
      {gen?.implementationApproach?.trainingPlan && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={styles.pageHeaderAccent} />
              <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Training Plan</Text>
            </View>
            <Text style={styles.pageNumber}>Page 20</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.subsectionTitle}>Training Plan</Text>

            {gen.implementationApproach.trainingPlan.overview && (
              <Text style={styles.paragraph}>{gen.implementationApproach.trainingPlan.overview}</Text>
            )}

            {/* Training Sessions */}
            {gen.implementationApproach.trainingPlan.sessions && gen.implementationApproach.trainingPlan.sessions.length > 0 && (
              <>
                <Text style={[styles.subsectionTitle, { fontSize: 11 }]}>Training Sessions</Text>
                {gen.implementationApproach.trainingPlan.sessions.map((session, idx) => (
                  <View key={idx} style={[styles.card, { marginBottom: 10 }]}>
                    <Text style={styles.cardTitle}>{session.topic}</Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 4 }}>
                      <Text style={styles.cardContent}>Audience: {session.audience}</Text>
                      <Text style={styles.cardContent}>Duration: {session.duration}</Text>
                    </View>
                    <Text style={[styles.cardContent, { marginTop: 4 }]}>
                      Delivery: {session.deliveryMethod}
                    </Text>
                    {session.keyContent && session.keyContent.length > 0 && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={[styles.cardContent, { fontWeight: 'bold' }]}>Key Content:</Text>
                        {session.keyContent.map((content, i) => (
                          <Text key={i} style={styles.cardContent}>• {content}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Training Materials */}
            {gen.implementationApproach.trainingPlan.materials && gen.implementationApproach.trainingPlan.materials.length > 0 && (
              <>
                <Text style={[styles.subsectionTitle, { fontSize: 11 }]}>Training Materials</Text>
                <BulletList items={gen.implementationApproach.trainingPlan.materials} />
              </>
            )}

            {/* Support Plan */}
            {gen.implementationApproach.trainingPlan.supportPlan && (
              <View style={styles.highlightBox}>
                <Text style={styles.highlightTitle}>Ongoing Support</Text>
                <Text style={styles.highlightContent}>{gen.implementationApproach.trainingPlan.supportPlan}</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
            <Text style={styles.footerText}>Page 20</Text>
          </View>
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 9: SUCCESS METRICS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 18</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={9} title="Success Metrics" />

          {gen?.successMetrics?.introduction && (
            <Text style={styles.paragraphLarge}>{gen.successMetrics.introduction}</Text>
          )}

          {/* KPIs */}
          {businessContext.kpis.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Key Performance Indicators</Text>
              {gen?.successMetrics?.kpiNarrative && (
                <Text style={styles.paragraph}>{gen.successMetrics.kpiNarrative}</Text>
              )}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '40%' }]}>KPI</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Target</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Frequency</Text>
                </View>
                {businessContext.kpis.map((kpi, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>{kpi.name}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>
                      {kpi.target}{kpi.unit ? ` ${kpi.unit}` : ''}
                    </Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{kpi.frequency || 'Monthly'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {gen?.successMetrics?.measurementApproach && (
            <>
              <Text style={styles.subsectionTitle}>Measurement Approach</Text>
              <Text style={styles.paragraph}>{gen.successMetrics.measurementApproach}</Text>
            </>
          )}

          {gen?.successMetrics?.reportingCadence && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Reporting Cadence</Text>
              <Text style={styles.highlightContent}>{gen.successMetrics.reportingCadence}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 18</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 10: CONCLUSION & NEXT STEPS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageHeaderAccent} />
            <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Design Document</Text>
          </View>
          <Text style={styles.pageNumber}>Page 19</Text>
        </View>

        <View style={styles.sectionContainer}>
          <SectionHeader number={10} title="Conclusion & Next Steps" />

          {gen?.conclusion?.summary && (
            <Text style={styles.paragraphLarge}>{gen.conclusion.summary}</Text>
          )}

          {gen?.conclusion?.callToAction && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightTitle}>Call to Action</Text>
              <Text style={styles.highlightContent}>{gen.conclusion.callToAction}</Text>
            </View>
          )}

          {/* Next steps */}
          {gen?.conclusion?.nextSteps && gen.conclusion.nextSteps.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Recommended Next Steps</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Action</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Owner</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Timeline</Text>
                </View>
                {gen.conclusion.nextSteps.map((ns, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.tableCell, { width: '50%' }]}>{ns.step}</Text>
                    <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{ns.owner}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{ns.timeline}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Closing statement */}
          {gen?.conclusion?.closingStatement && (
            <Text style={[styles.quote, { marginTop: 30 }]}>"{gen.conclusion.closingStatement}"</Text>
          )}

          {/* Document info */}
          <View style={[styles.card, { marginTop: 30, borderLeftColor: DOCUMENT_COLORS.textLight }]}>
            <Text style={styles.cardTitle}>Document Information</Text>
            <Text style={styles.cardContent}>
              This design document was prepared by {metadata.author} using AI-enhanced content generation.
              All information should be reviewed for accuracy before final approval.
            </Text>
            <Text style={[styles.cardContent, { marginTop: 8 }]}>
              Version: {metadata.version} | Completeness: {metadata.completenessScore}% | Status: {metadata.status}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
          <Text style={styles.footerText}>Page 19</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* QUICK REFERENCE CARD */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {gen?.quickReference && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={styles.pageHeaderAccent} />
              <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Quick Reference</Text>
            </View>
            <Text style={styles.pageNumber}>Page 23</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 10 }]}>
              Quick Reference Card
            </Text>
            <Text style={[styles.paragraph, { textAlign: 'center', marginBottom: 20 }]}>
              {gen.quickReference.purpose}
            </Text>

            {/* Can Do / Cannot Do */}
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
              <View style={[styles.card, styles.cardSuccess, { flex: 1 }]}>
                <Text style={styles.cardTitle}>✓ What {gen.quickReference.agentName} CAN Do</Text>
                {gen.quickReference.canDo.map((item, idx) => (
                  <Text key={idx} style={[styles.cardContent, { marginTop: 4 }]}>• {item}</Text>
                ))}
              </View>
              <View style={[styles.card, styles.cardDanger, { flex: 1 }]}>
                <Text style={styles.cardTitle}>✗ What {gen.quickReference.agentName} CANNOT Do</Text>
                {gen.quickReference.cannotDo.map((item, idx) => (
                  <Text key={idx} style={[styles.cardContent, { marginTop: 4 }]}>• {item}</Text>
                ))}
              </View>
            </View>

            {/* Escalation Triggers */}
            <Text style={styles.subsectionTitle}>When to Escalate</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Trigger</Text>
                <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Action</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>How</Text>
              </View>
              {gen.quickReference.escalationTriggers.map((trigger, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{trigger.trigger}</Text>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{trigger.action}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{trigger.contactMethod}</Text>
                </View>
              ))}
            </View>

            {/* Key Contacts */}
            <Text style={styles.subsectionTitle}>Key Contacts</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {gen.quickReference.keyContacts.map((contact, idx) => (
                <View key={idx} style={[styles.card, { width: '48%' }]}>
                  <Text style={styles.cardTitle}>{contact.role}</Text>
                  <Text style={[styles.cardContent, { fontWeight: 'bold' }]}>{contact.name}</Text>
                  <Text style={styles.cardContent}>{contact.responsibility}</Text>
                </View>
              ))}
            </View>

            {/* Quick Tips */}
            {gen.quickReference.quickTips && gen.quickReference.quickTips.length > 0 && (
              <View style={[styles.highlightBox, { marginTop: 15 }]}>
                <Text style={styles.highlightTitle}>💡 Quick Tips</Text>
                {gen.quickReference.quickTips.map((tip, idx) => (
                  <Text key={idx} style={[styles.highlightContent, { marginTop: 4 }]}>• {tip}</Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
            <Text style={styles.footerText}>Page 23</Text>
          </View>
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* APPENDIX: TEST PLAN (if exists) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {testPlan && testPlan.testCases.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={styles.pageHeaderAccent} />
              <Text style={styles.pageHeaderTitle}>{metadata.digitalEmployeeName} | Appendix</Text>
            </View>
            <Text style={styles.pageNumber}>Page 20</Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Appendix A: Test Plan Summary</Text>

            {/* Coverage summary */}
            <View style={{ flexDirection: 'row', marginVertical: 15, gap: 10 }}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.metricValue}>{testPlan.coverageSummary.total}</Text>
                <Text style={styles.metricLabel}>Total Test Cases</Text>
              </View>
              <View style={[styles.card, styles.cardSuccess, { flex: 1 }]}>
                <Text style={styles.metricValue}>{testPlan.coverageSummary.covered}</Text>
                <Text style={styles.metricLabel}>Covered</Text>
              </View>
              <View style={[styles.card, styles.cardWarning, { flex: 1 }]}>
                <Text style={styles.metricValue}>{testPlan.coverageSummary.partial + testPlan.coverageSummary.missing}</Text>
                <Text style={styles.metricLabel}>Needs Attention</Text>
              </View>
            </View>

            {/* Test cases table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Test Case</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Expected Result</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Priority</Text>
              </View>
              {testPlan.testCases.slice(0, 12).map((tc, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { width: '5%' }]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>{tc.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{tc.type}</Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{tc.expectedResult}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{tc.priority}</Text>
                </View>
              ))}
            </View>

            {testPlan.testCases.length > 12 && (
              <Text style={[styles.cardContent, { textAlign: 'center', marginTop: 10 }]}>
                ... and {testPlan.testCases.length - 12} additional test cases
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Confidential - {metadata.company}</Text>
            <Text style={styles.footerText}>Page 20</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}
