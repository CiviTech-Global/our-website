import {
  insuranceRequestRepository,
  type CreateBotRequestInput,
} from '../../database/prisma/repositories/insurance-request.repository.js';
import { generateTrackingCode } from '../../services/insurance-request.service.js';
import { sha256Hex } from '../../utils/hash.js';

export const requestService = {
  /**
   * Files an enquiry from the Telegram flow.
   *
   * Tracking codes are generated the same way as on the website so that a
   * person quoting one over the phone gets the same treatment whichever channel
   * they came through — and so there is one implementation to keep legible.
   */
  createRequest: (data: Omit<CreateBotRequestInput, 'trackingCode' | 'phoneNumberHash'>) => {
    return insuranceRequestRepository.createFromBot({
      ...data,
      trackingCode: generateTrackingCode(),
      phoneNumberHash: sha256Hex(data.phoneNumber),
    });
  },
};
