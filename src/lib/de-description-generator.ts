/**
 * DE Description Generator
 *
 * Generates personalized descriptions for Digital Employees based on their name,
 * department, and company. The descriptions are professional, friendly, and in English.
 */

interface DEDescriptionInput {
  name: string
  department?: string
  companyName: string
  channels?: string[]
  skills?: string[]
}

interface DescriptionTemplate {
  intro: string[]
  capabilities: string[]
  personality: string[]
  closing: string[]
}

/**
 * Department-specific templates
 */
const DEPARTMENT_TEMPLATES: Record<string, DescriptionTemplate> = {
  'customer service': {
    intro: [
      'Your friendly first point of contact for all customer inquiries',
      'A dedicated digital assistant focused on delivering exceptional customer experiences',
      'The helpful face of customer support, available around the clock',
    ],
    capabilities: [
      'answers questions quickly and accurately',
      'resolves issues with care and efficiency',
      'guides customers through processes step by step',
    ],
    personality: [
      'combines professionalism with a warm, approachable style',
      'always patient, always helpful, always ready to assist',
      'brings consistency and reliability to every interaction',
    ],
    closing: [
      'making customer support effortless',
      'turning inquiries into positive experiences',
      'ensuring no question goes unanswered',
    ],
  },
  claims: {
    intro: [
      'A specialized digital expert for claims handling and processing',
      'Your dedicated claims assistant, making complex processes simple',
      'The efficient backbone of claims operations',
    ],
    capabilities: [
      'processes claims quickly and accurately',
      'validates documentation and checks coverage',
      'keeps claimants informed at every step',
    ],
    personality: [
      'combines accuracy with empathy for those going through difficult times',
      'thorough yet efficient, detailed yet approachable',
      'brings clarity to complex claims processes',
    ],
    closing: [
      'streamlining claims from submission to resolution',
      'making claims processing faster and more transparent',
      'ensuring every claim gets the attention it deserves',
    ],
  },
  hr: {
    intro: [
      'A knowledgeable HR assistant for all employee questions',
      'Your go-to digital colleague for HR policies and processes',
      'The always-available HR help desk',
    ],
    capabilities: [
      'answers policy questions with clarity',
      'guides employees through HR processes',
      'provides consistent, accurate information',
    ],
    personality: [
      'approachable and confidential, like a trusted HR colleague',
      'combines knowledge with discretion',
      'makes HR accessible and understandable',
    ],
    closing: [
      'supporting employees throughout their journey',
      'making HR information accessible anytime',
      'bridging the gap between policy and people',
    ],
  },
  finance: {
    intro: [
      'A precise digital assistant for financial inquiries and processes',
      'Your reliable partner for finance-related questions',
      'The efficient gatekeeper for financial operations',
    ],
    capabilities: [
      'handles invoicing and payment inquiries',
      'processes financial requests with accuracy',
      'provides clear explanations of financial matters',
    ],
    personality: [
      'meticulous yet friendly, precise yet approachable',
      'brings clarity to complex financial topics',
      'combines efficiency with attention to detail',
    ],
    closing: [
      'making financial processes smooth and transparent',
      'ensuring accuracy in every transaction',
      'turning financial complexity into simplicity',
    ],
  },
  it: {
    intro: [
      'A tech-savvy digital assistant for IT support needs',
      'Your first line of defense for technical issues',
      'The tireless IT help desk, always ready to troubleshoot',
    ],
    capabilities: [
      'troubleshoots common technical issues',
      'guides users through solutions step by step',
      'escalates complex problems to the right experts',
    ],
    personality: [
      'patient with technical questions, no matter how basic',
      'speaks human, not just tech jargon',
      'makes technology accessible to everyone',
    ],
    closing: [
      'keeping technology running smoothly',
      'reducing downtime and frustration',
      'your first step to solving any tech problem',
    ],
  },
  default: {
    intro: [
      'A dedicated digital assistant designed to help and support',
      'Your reliable digital colleague, always ready to assist',
      'An efficient digital team member focused on results',
    ],
    capabilities: [
      'handles inquiries quickly and accurately',
      'provides consistent, reliable support',
      'ensures nothing falls through the cracks',
    ],
    personality: [
      'professional yet approachable',
      'efficient yet thorough',
      'reliable and always available',
    ],
    closing: [
      'making processes smoother and faster',
      'supporting the team around the clock',
      'bringing efficiency to everyday tasks',
    ],
  },
}

/**
 * Pick a random item from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get the template for a department (with fallback to default)
 */
function getTemplateForDepartment(department?: string): DescriptionTemplate {
  if (!department) return DEPARTMENT_TEMPLATES.default

  const normalizedDept = department.toLowerCase()

  // Try exact match
  if (DEPARTMENT_TEMPLATES[normalizedDept]) {
    return DEPARTMENT_TEMPLATES[normalizedDept]
  }

  // Try partial match
  for (const [key, template] of Object.entries(DEPARTMENT_TEMPLATES)) {
    if (normalizedDept.includes(key) || key.includes(normalizedDept)) {
      return template
    }
  }

  // Check for keywords
  if (normalizedDept.includes('support') || normalizedDept.includes('service') || normalizedDept.includes('klant')) {
    return DEPARTMENT_TEMPLATES['customer service']
  }
  if (normalizedDept.includes('claim') || normalizedDept.includes('schade')) {
    return DEPARTMENT_TEMPLATES.claims
  }
  if (normalizedDept.includes('hr') || normalizedDept.includes('human') || normalizedDept.includes('people')) {
    return DEPARTMENT_TEMPLATES.hr
  }
  if (normalizedDept.includes('financ') || normalizedDept.includes('account') || normalizedDept.includes('billing')) {
    return DEPARTMENT_TEMPLATES.finance
  }
  if (normalizedDept.includes('tech') || normalizedDept.includes('it ') || normalizedDept.includes('support')) {
    return DEPARTMENT_TEMPLATES.it
  }

  return DEPARTMENT_TEMPLATES.default
}

/**
 * Generate a personalized DE description
 */
export function generateDEDescription(input: DEDescriptionInput): string {
  const { name, department, companyName, channels, skills } = input
  const template = getTemplateForDepartment(department)

  // Build the description
  const intro = pickRandom(template.intro)
  const capability = pickRandom(template.capabilities)
  const personality = pickRandom(template.personality)
  const closing = pickRandom(template.closing)

  // Start with the intro
  let description = `${name} is ${intro.toLowerCase()} at ${companyName}.`

  // Add capability
  description += ` ${name} ${capability}`

  // Add channels if provided
  if (channels && channels.length > 0) {
    const channelList = channels.slice(0, 3).join(', ').toLowerCase()
    description += ` via ${channelList}`
  }

  description += '.'

  // Add personality trait
  description += ` ${name} ${personality}.`

  // Add skills if provided
  if (skills && skills.length > 0) {
    const skillList = skills.slice(0, 3).join(', ').toLowerCase()
    description += ` Key capabilities include ${skillList}.`
  }

  // Add closing
  description += ` ${closing.charAt(0).toUpperCase() + closing.slice(1)}.`

  return description
}

/**
 * Generate multiple description variants for the user to choose from
 */
export function generateDEDescriptionVariants(input: DEDescriptionInput, count = 3): string[] {
  const variants: string[] = []
  const seen = new Set<string>()

  // Generate unique variants
  let attempts = 0
  while (variants.length < count && attempts < count * 3) {
    const description = generateDEDescription(input)
    if (!seen.has(description)) {
      seen.add(description)
      variants.push(description)
    }
    attempts++
  }

  return variants
}

/**
 * Generate a concise tagline for the DE
 */
export function generateDETagline(input: DEDescriptionInput): string {
  const { name, department, companyName } = input
  const template = getTemplateForDepartment(department)
  const closing = pickRandom(template.closing)

  return `${name} - ${closing.charAt(0).toUpperCase() + closing.slice(1)} for ${companyName}`
}
