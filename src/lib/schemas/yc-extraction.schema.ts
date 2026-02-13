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
    primaryPartner: {
      type: 'object',
      description: 'YC primary partner for this company',
      properties: {
        name: {
          type: 'string',
          description: 'Partner name',
        },
        url: {
          type: 'string',
          description: 'YC partner profile URL',
        },
      },
    },
    companyLinks: {
      type: 'object',
      description: 'Company social media and web presence links',
      properties: {
        linkedin: {
          type: 'string',
          description: 'Company LinkedIn profile URL',
        },
        twitter: {
          type: 'string',
          description: 'Company Twitter/X profile URL',
        },
        github: {
          type: 'string',
          description: 'Company GitHub profile URL',
        },
      },
    },
    news: {
      type: 'array',
      description: 'Latest news items about the company',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'News headline or title',
          },
          url: {
            type: 'string',
            description: 'Link to the news article',
          },
          date: {
            type: 'string',
            description: 'Publication date',
          },
        },
      },
    },
  },
  required: ['founders'],
} as const;

export const YC_EXTRACTION_PROMPT =
  'Extract founder information (name, role, bio, LinkedIn and Twitter links), YC primary partner (name and profile URL), company links (LinkedIn, Twitter, GitHub), and latest news from this YC company page';
