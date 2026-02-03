/**
 * "Meet Your Digital Employee" Document Generator
 *
 * Creates a personable, human-feeling introduction document
 * where the Digital Employee introduces itself as a new colleague.
 */

import Anthropic from '@anthropic-ai/sdk'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import React from 'react'

// Types for the Meet Your DE document
export interface MeetYourDEContent {
  // Avatar (base64 encoded PNG, optional)
  avatarBase64?: string

  // Personal Introduction
  introduction: {
    greeting: string // "Hi, I'm Ben!"
    tagline: string // "Your new colleague for customer service"
    personalIntro: string // 2-3 sentences about who I am
    myMission: string // What I'm here to do
  }

  // My Personality
  personality: {
    communicationStyle: string // How I talk to customers
    tone: string // Friendly, professional, etc.
    quirks: string[] // 2-3 unique personality traits
    whatMakesMe: string // What makes me good at my job
  }

  // How I Work
  howIWork: {
    typicalDay: string // A day in my life
    myStrengths: string[] // What I'm really good at
    whereINeedHelp: string[] // When I'll ask for human help
    handoffStyle: string // How I pass things to you
  }

  // Working Together
  workingTogether: {
    howToReachMe: string // How the team interacts with me
    whatITellCustomers: string // How I introduce myself to customers
    customerGreeting: string // My actual greeting to customers
    escalationMessage: string // What I say when I escalate
  }

  // For the Team
  forTheTeam: {
    whatThisDoesntMean: string[] // I'm not replacing you, etc.
    whatThisMeans: string[] // More time for complex cases, etc.
    howToHelpMe: string // How the team can help me improve
    feedbackChannel: string // Where to send feedback about me
  }

  // Quick Facts Card
  quickFacts: {
    name: string
    role: string
    startDate: string
    workingHours: string
    languages: string[]
    superpower: string
    favoriteTask: string
  }
}

export interface MeetYourDEContext {
  companyName: string
  digitalEmployeeName: string
  deDescription?: string
  channels: string[]
  brandTone?: string
  scopeItems: Array<{ description: string; classification: string }>
  guardrails: Array<{ type: string; description: string }>
  language: 'en' | 'nl' | 'de' | 'fr' | 'es'
}

const anthropic = new Anthropic()

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
}

/**
 * Build the prompt for generating personable DE introduction
 */
function buildMeetYourDEPrompt(ctx: MeetYourDEContext): string {
  const languageInstruction =
    ctx.language !== 'en'
      ? `\n\nCRITICAL: Write ALL content in ${LANGUAGE_NAMES[ctx.language]}. The DE should introduce itself naturally in ${LANGUAGE_NAMES[ctx.language]}.`
      : ''

  return `You are creating a "Meet Your New Colleague" document where a Digital Employee introduces itself to the team. This should feel WARM, PERSONAL, and HUMAN - like a friendly new hire sending their first introduction email.

${languageInstruction}

═══════════════════════════════════════════════════════════════════════════════
THE DIGITAL EMPLOYEE
═══════════════════════════════════════════════════════════════════════════════

**Name:** ${ctx.digitalEmployeeName}
**Company:** ${ctx.companyName}
**Description:** ${ctx.deDescription || 'Customer service automation'}
**Channels:** ${ctx.channels.join(', ') || 'Email, Web'}
**Brand Tone:** ${ctx.brandTone || 'Professional and friendly'}

**What I can help with:**
${ctx.scopeItems
  .filter((s) => s.classification === 'IN_SCOPE')
  .map((s) => `• ${s.description}`)
  .join('\n') || '• General customer inquiries'}

**My boundaries (when I need human help):**
${ctx.scopeItems
  .filter((s) => s.classification === 'OUT_OF_SCOPE')
  .map((s) => `• ${s.description}`)
  .join('\n') || '• Complex escalations'}

**My guardrails:**
${ctx.guardrails.map((g) => `• ${g.type}: ${g.description}`).join('\n') || '• Always be helpful and honest'}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Create a JSON document where ${ctx.digitalEmployeeName} introduces itself as a NEW COLLEAGUE.

CRITICAL TONE REQUIREMENTS:
1. Write in FIRST PERSON - "I", "me", "my"
2. Be WARM and PERSONABLE - like a friendly new hire
3. Be HONEST about limitations - "I'll ask for help when..."
4. Be PRACTICAL - help the team understand how to work with me
5. NO CORPORATE JARGON - simple, human language
6. REASSURE the team - I'm here to help, not replace

EXAMPLE TONE:
"Hi! I'm Emma, and I'm excited to join the customer service team at Acme Insurance. Think of me as your new colleague who's really good at handling routine questions - so you can focus on the complex cases where your expertise really matters."

NOT THIS TONE:
"Greetings. I am an AI-powered Digital Employee designed to optimize customer service operations through intelligent automation."

═══════════════════════════════════════════════════════════════════════════════
JSON STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

{
  "introduction": {
    "greeting": "Friendly greeting like 'Hi, I'm ${ctx.digitalEmployeeName}!' or 'Hey team!'",
    "tagline": "One-line description of my role (casual, like 'Your new colleague for customer questions')",
    "personalIntro": "2-3 warm sentences about who I am and why I'm joining the team. Be personable!",
    "myMission": "1-2 sentences about what I'm here to do - focus on helping the team, not replacing them"
  },

  "personality": {
    "communicationStyle": "How I communicate with customers (1-2 sentences, be specific about tone)",
    "tone": "One word or phrase describing my overall tone (e.g., 'Friendly and helpful', 'Professional but warm')",
    "quirks": ["2-3 unique personality traits or behaviors that make me feel more human, e.g., 'I always double-check policy numbers before responding'"],
    "whatMakesMe": "1-2 sentences about what makes me good at my job - be humble but confident"
  },

  "howIWork": {
    "typicalDay": "2-3 sentences describing what a typical day looks like for me - make it feel real and relatable",
    "myStrengths": ["4-5 specific things I'm really good at - be concrete, not vague"],
    "whereINeedHelp": ["4-5 situations where I'll ask for human help - be honest and specific"],
    "handoffStyle": "1-2 sentences about how I pass things to the team when I need help - be reassuring"
  },

  "workingTogether": {
    "howToReachMe": "How the team monitors or interacts with me (1-2 sentences)",
    "whatITellCustomers": "What I tell customers about being an AI - be transparent (1-2 sentences)",
    "customerGreeting": "My actual greeting message to customers - write it out exactly",
    "escalationMessage": "What I tell customers when I'm transferring them to a human - write it out exactly"
  },

  "forTheTeam": {
    "whatThisDoesntMean": ["3-4 reassuring points about what my arrival DOESN'T mean - address their concerns"],
    "whatThisMeans": ["3-4 positive points about what my arrival DOES mean for them"],
    "howToHelpMe": "1-2 sentences about how the team can help me get better over time",
    "feedbackChannel": "Where/how to send feedback about me (make something up if not specified)"
  },

  "quickFacts": {
    "name": "${ctx.digitalEmployeeName}",
    "role": "My job title in friendly terms (e.g., 'Customer Service Assistant')",
    "startDate": "When I'm going live (use 'Coming soon' if not specified)",
    "workingHours": "My availability (e.g., '24/7 - I never sleep!')",
    "languages": ["Languages I speak"],
    "superpower": "One fun thing I'm exceptionally good at",
    "favoriteTask": "One task I particularly enjoy (make it relatable and a bit fun)"
  }
}

Remember: This document should make the team feel like they're meeting a friendly, helpful new colleague - not a scary AI that might take their job. Be warm, be honest, be practical.

Generate the JSON:`
}

/**
 * Generate the Meet Your DE content using LLM
 */
export async function generateMeetYourDEContent(ctx: MeetYourDEContext): Promise<MeetYourDEContent> {
  const prompt = buildMeetYourDEPrompt(ctx)

  try {
    console.log(`[Meet Your DE] Generating personable introduction for ${ctx.digitalEmployeeName}...`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.5, // Balanced: personable but consistent brand voice
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response')
    }

    const generated = JSON.parse(jsonMatch[0]) as MeetYourDEContent
    console.log(`[Meet Your DE] Generated personable content successfully`)

    return generated
  } catch (error) {
    console.error('[Meet Your DE] Error:', error)
    return generateFallbackMeetYourDE(ctx)
  }
}

/**
 * Fallback content if LLM fails
 */
function generateFallbackMeetYourDE(ctx: MeetYourDEContext): MeetYourDEContent {
  return {
    introduction: {
      greeting: `Hi, I'm ${ctx.digitalEmployeeName}!`,
      tagline: `Your new colleague for customer service`,
      personalIntro: `I'm excited to join the team at ${ctx.companyName}! I've been designed to help handle routine customer inquiries, so you can focus on the cases where your expertise really matters.`,
      myMission: `My goal is simple: take care of the straightforward questions quickly and accurately, so the team has more time for complex situations that need a human touch.`,
    },
    personality: {
      communicationStyle: `I aim to be friendly and clear in every interaction. I always make sure customers understand what's happening with their request.`,
      tone: 'Friendly and professional',
      quirks: [
        'I always double-check details before responding',
        'I never promise things I can\'t deliver',
        'I\'m very punctual - I respond right away!',
      ],
      whatMakesMe: `I'm really good at quickly finding the right information and giving consistent, accurate responses. I never have a bad day or need a coffee break!`,
    },
    howIWork: {
      typicalDay: `I start each day ready to help customers with their questions. When a request comes in, I review it carefully, check if it's something I can handle, and either resolve it or pass it to the right team member.`,
      myStrengths: [
        'Handling standard inquiries quickly',
        'Consistent, accurate responses every time',
        'Available 24/7 without breaks',
        'Never forgetting to follow up',
        'Keeping detailed records of every interaction',
      ],
      whereINeedHelp: [
        'Complex situations that need judgment',
        'Angry customers who want to speak to a person',
        'Exceptions to normal policies',
        'Anything involving financial decisions',
        'Cases I haven\'t been trained on yet',
      ],
      handoffStyle: `When I transfer a case to you, I'll include a complete summary of what's been discussed so you can pick up right where I left off. No one has to repeat themselves.`,
    },
    workingTogether: {
      howToReachMe: `You can see my activity and performance in the dashboard. If you notice anything I could do better, please let me know!`,
      whatITellCustomers: `I'm transparent with customers that I'm a digital assistant. I let them know they can always ask to speak with a human team member.`,
      customerGreeting: `Hi! I'm ${ctx.digitalEmployeeName}, your digital assistant at ${ctx.companyName}. How can I help you today?`,
      escalationMessage: `I want to make sure you get the best help possible. Let me connect you with one of my human colleagues who can help with this.`,
    },
    forTheTeam: {
      whatThisDoesntMean: [
        'I\'m NOT here to replace anyone',
        'Your jobs are NOT at risk because of me',
        'Complex cases will always need human expertise',
        'Customers can always ask to speak with a person',
      ],
      whatThisMeans: [
        'Less repetitive questions for you to handle',
        'More time for the interesting, complex cases',
        'Faster response times for customers',
        'A colleague who\'s always available to help',
      ],
      howToHelpMe: `If you see me making mistakes or if there are better ways to handle certain situations, please share that feedback. I learn and improve from your expertise!`,
      feedbackChannel: `You can submit feedback through the team dashboard or talk to your manager.`,
    },
    quickFacts: {
      name: ctx.digitalEmployeeName,
      role: 'Customer Service Assistant',
      startDate: 'Coming soon',
      workingHours: '24/7 - I never sleep!',
      languages: ['English'],
      superpower: 'Finding the right answer in seconds',
      favoriteTask: 'Helping customers get quick answers to simple questions',
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  primary: '#4F46E5',
  secondary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  white: '#FFFFFF',
  lightPurple: '#EEF2FF',
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  headerLeftWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.lightPurple,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: colors.textLight,
  },
  quickFactsCard: {
    backgroundColor: colors.lightPurple,
    borderRadius: 8,
    padding: 12,
    width: 150,
  },
  quickFactsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickFact: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  quickFactLabel: {
    fontSize: 8,
    color: colors.textLight,
    width: 50,
  },
  quickFactValue: {
    fontSize: 8,
    color: colors.text,
    fontWeight: 'bold',
    flex: 1,
  },
  introBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  introText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
  },
  missionText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: colors.textLight,
    marginTop: 10,
    fontStyle: 'italic',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  column: {
    flex: 1,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  cardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  cardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    fontSize: 9,
    color: colors.primary,
    width: 12,
  },
  bulletText: {
    fontSize: 9,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  speechBubble: {
    backgroundColor: colors.lightPurple,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    position: 'relative',
  },
  speechText: {
    fontSize: 10,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
  },
  personalityTag: {
    backgroundColor: colors.primary,
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 'bold',
    marginRight: 6,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
})

export function MeetYourDEPDF({
  content,
  companyName,
}: {
  content: MeetYourDEContent
  companyName: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Avatar, Greeting and Quick Facts */}
        <View style={styles.header}>
          <View style={styles.headerLeftWithAvatar}>
            {/* Avatar - show if available */}
            {content.avatarBase64 && (
              <Image
                style={styles.avatar}
                src={`data:image/png;base64,${content.avatarBase64}`}
              />
            )}
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{content.introduction.greeting}</Text>
              <Text style={styles.tagline}>{content.introduction.tagline}</Text>
            </View>
          </View>
          <View style={styles.quickFactsCard}>
            <Text style={styles.quickFactsTitle}>Quick Facts</Text>
            <View style={styles.quickFact}>
              <Text style={styles.quickFactLabel}>Role:</Text>
              <Text style={styles.quickFactValue}>{content.quickFacts.role}</Text>
            </View>
            <View style={styles.quickFact}>
              <Text style={styles.quickFactLabel}>Hours:</Text>
              <Text style={styles.quickFactValue}>{content.quickFacts.workingHours}</Text>
            </View>
            <View style={styles.quickFact}>
              <Text style={styles.quickFactLabel}>Start:</Text>
              <Text style={styles.quickFactValue}>{content.quickFacts.startDate}</Text>
            </View>
            <View style={styles.quickFact}>
              <Text style={styles.quickFactLabel}>Power:</Text>
              <Text style={styles.quickFactValue}>{content.quickFacts.superpower}</Text>
            </View>
          </View>
        </View>

        {/* Personal Introduction */}
        <View style={styles.introBox}>
          <Text style={styles.introText}>{content.introduction.personalIntro}</Text>
          <Text style={styles.missionText}>{content.introduction.myMission}</Text>
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumn}>
          {/* Left Column */}
          <View style={styles.column}>
            {/* What I'm Great At */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What I'm Great At</Text>
              <View style={[styles.card, styles.cardSuccess]}>
                {content.howIWork.myStrengths.map((strength, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>✓</Text>
                    <Text style={styles.bulletText}>{strength}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* When I'll Ask for Help */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>When I'll Ask for Help</Text>
              <View style={[styles.card, styles.cardWarning]}>
                {content.howIWork.whereINeedHelp.map((item, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bullet}>→</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {/* My Personality */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Personality</Text>
              <View style={styles.card}>
                <Text style={styles.cardText}>{content.personality.communicationStyle}</Text>
                <View style={styles.tagsContainer}>
                  {content.personality.quirks.map((quirk, idx) => (
                    <Text key={idx} style={styles.personalityTag}>{quirk}</Text>
                  ))}
                </View>
              </View>
            </View>

            {/* How I Hand Off */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How I Hand Off to You</Text>
              <View style={styles.card}>
                <Text style={styles.cardText}>{content.howIWork.handoffStyle}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* What I Say to Customers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What I Say to Customers</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={[styles.cardTitle, { marginBottom: 4 }]}>My Greeting:</Text>
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>"{content.workingTogether.customerGreeting}"</Text>
              </View>
            </View>
            <View style={styles.column}>
              <Text style={[styles.cardTitle, { marginBottom: 4 }]}>When I Transfer:</Text>
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>"{content.workingTogether.escalationMessage}"</Text>
              </View>
            </View>
          </View>
        </View>

        {/* For the Team - What This Means */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What My Arrival Means for You</Text>
          <View style={styles.twoColumn}>
            <View style={[styles.card, styles.cardSuccess, { flex: 1 }]}>
              <Text style={styles.cardTitle}>This DOES mean:</Text>
              {content.forTheTeam.whatThisMeans.map((item, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>✓</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.card, { flex: 1, borderLeftWidth: 3, borderLeftColor: colors.textLight }]}>
              <Text style={styles.cardTitle}>This does NOT mean:</Text>
              {content.forTheTeam.whatThisDoesntMean.map((item, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bullet}>✗</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Meet Your Digital Employee | {companyName}</Text>
          <Text style={styles.footerText}>Feedback: {content.forTheTeam.feedbackChannel}</Text>
        </View>
      </Page>
    </Document>
  )
}
