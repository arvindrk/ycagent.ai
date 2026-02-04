export const YC_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    founders: {
      type: 'array',
      description: 'Array of founder information',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Founder full name',
          },
          role: {
            type: 'string',
            description: 'Founder role (e.g., CEO, CTO, Co-founder)',
          },
          bio: {
            type: 'string',
            description: 'Brief founder background or bio',
          },
          links: {
            type: 'object',
            description: 'Social media and professional links',
            properties: {
              linkedin: {
                type: 'string',
                description: 'LinkedIn profile URL',
              },
              twitter: {
                type: 'string',
                description: 'Twitter/X profile URL',
              },
            },
          },
        },
        required: ['name'],
      },
    },
    description: {
      type: 'string',
      description: 'One-liner about what the company does',
    },
    problem: {
      type: 'string',
      description: 'The problem this company is solving',
    },
  },
  required: ['founders', 'description', 'problem'],
} as const;

export const YC_EXTRACTION_PROMPT =
  'Extract founder information (name, role, bio, LinkedIn and Twitter links), company description, and problem statement from this YC company page';
