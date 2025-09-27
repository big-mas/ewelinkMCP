import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};

export const validateMCPRequest = (req: Request, res: Response, next: NextFunction) => {
  const { jsonrpc, method } = req.body;
  
  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32600,
        message: 'Invalid Request - jsonrpc must be "2.0"'
      }
    });
  }
  
  if (!method || typeof method !== 'string') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32600,
        message: 'Invalid Request - method is required and must be a string'
      }
    });
  }
  
  next();
};

export const validateDeviceControl = (req: Request, res: Response, next: NextFunction) => {
  const { params } = req.body;
  
  if (!params || typeof params !== 'object') {
    return res.status(400).json({
      error: 'Invalid control parameters - params object is required'
    });
  }
  
  // Basic validation for common device parameters
  if (params.switch && !['on', 'off'].includes(params.switch)) {
    return res.status(400).json({
      error: 'Invalid switch parameter - must be "on" or "off"'
    });
  }
  
  if (params.bright && (typeof params.bright !== 'number' || params.bright < 0 || params.bright > 100)) {
    return res.status(400).json({
      error: 'Invalid brightness parameter - must be a number between 0 and 100'
    });
  }
  
  next();
};
