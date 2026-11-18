import { getCurrentProfile } from '../services/me.service.js';

export function createMeController(profileClient) {
  return async function getMe(req, res, next) {
    try {
      const profile = await getCurrentProfile(profileClient, req.auth.userId);
      return res.status(200).json(profile);
    } catch (error) {
      return next(error);
    }
  };
}
