const { z } = require('zod');

const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long').max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional().default(true),
    topic: z.string().optional(),
  }),
});

const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional(),
    topic: z.string().optional(),
  }),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (e) {
    return res.status(400).send(e.errors);
  }
};

module.exports = {
  validate,
  createGroupSchema,
  updateGroupSchema,
};