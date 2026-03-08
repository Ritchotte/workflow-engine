export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Workflow Engine API',
    version: '1.0.0',
    description: 'API documentation for auth, workflow management, and triggers.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Workflows' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service health',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Invalid request body' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '400': { description: 'Invalid request body' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/workflows': {
      get: {
        tags: ['Workflows'],
        summary: 'List workflows',
        responses: {
          '200': { description: 'Workflows returned' },
        },
      },
      post: {
        tags: ['Workflows'],
        summary: 'Create a workflow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkflowRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Workflow created' },
          '400': { description: 'Validation error' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/workflows/{id}': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow by id',
        parameters: [{ $ref: '#/components/parameters/WorkflowId' }],
        responses: {
          '200': { description: 'Workflow returned' },
          '404': { description: 'Workflow not found' },
        },
      },
      delete: {
        tags: ['Workflows'],
        summary: 'Delete workflow by id',
        parameters: [{ $ref: '#/components/parameters/WorkflowId' }],
        responses: {
          '200': { description: 'Workflow deleted' },
          '404': { description: 'Workflow not found' },
        },
      },
    },
    '/workflows/{id}/execution-logs': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow execution logs',
        parameters: [
          { $ref: '#/components/parameters/WorkflowId' },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'string' },
            required: false,
          },
        ],
        responses: {
          '200': { description: 'Execution logs returned' },
          '404': { description: 'Workflow not found' },
        },
      },
    },
    '/workflows/{id}/execute': {
      post: {
        tags: ['Workflows'],
        summary: 'Queue manual workflow execution (legacy path)',
        parameters: [{ $ref: '#/components/parameters/WorkflowId' }],
        responses: {
          '202': { description: 'Workflow execution queued' },
          '400': { description: 'Invalid trigger type for endpoint' },
          '404': { description: 'Workflow not found' },
        },
      },
    },
    '/workflows/{id}/trigger/manual': {
      post: {
        tags: ['Workflows'],
        summary: 'Queue workflow execution with manual trigger',
        parameters: [{ $ref: '#/components/parameters/WorkflowId' }],
        responses: {
          '202': { description: 'Workflow execution queued' },
          '400': { description: 'Workflow trigger type is not manual' },
          '404': { description: 'Workflow not found' },
        },
      },
    },
    '/workflows/{id}/trigger/webhook': {
      post: {
        tags: ['Workflows'],
        summary: 'Trigger workflow via webhook',
        parameters: [
          { $ref: '#/components/parameters/WorkflowId' },
          {
            in: 'header',
            name: 'x-webhook-secret',
            schema: { type: 'string' },
            required: false,
            description: 'Optional secret if configured on the workflow',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
            },
          },
        },
        responses: {
          '202': { description: 'Webhook workflow execution queued' },
          '400': { description: 'Workflow trigger type is not webhook' },
          '401': { description: 'Invalid webhook secret' },
          '404': { description: 'Workflow not found' },
        },
      },
    },
  },
  components: {
    parameters: {
      WorkflowId: {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          name: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      WorkflowStepRequest: {
        type: 'object',
        required: ['name', 'type', 'order'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['http_request', 'delay', 'log'] },
          order: { type: 'integer' },
          config: { type: 'object', additionalProperties: true },
          status: { type: 'string' },
        },
      },
      CreateWorkflowRequest: {
        type: 'object',
        required: ['name', 'createdBy'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          triggerType: {
            type: 'string',
            enum: ['manual', 'webhook', 'scheduled'],
          },
          triggerConfig: { type: 'object', additionalProperties: true },
          createdBy: { type: 'string' },
          steps: {
            type: 'array',
            items: { $ref: '#/components/schemas/WorkflowStepRequest' },
          },
        },
      },
    },
  },
} as const;
