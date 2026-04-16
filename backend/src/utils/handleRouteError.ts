import { Response } from 'express';
import { isHttpError } from '../errors/HttpError';

export function handleRouteError(
  res: Response,
  error: unknown,
  logLabel: string,
  fallbackMessage = 'Server error.'
): void {
  if (isHttpError(error)) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(logLabel, error);
  res.status(500).json({ error: fallbackMessage });
}
